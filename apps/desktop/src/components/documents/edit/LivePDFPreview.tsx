// src/components/documents/edit/LivePDFPreview.tsx
// Using PDF.js viewer for full XFA support and Adobe-like rendering

import { useState, useEffect, useRef, memo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface LivePDFPreviewProps {
  pdfBuffer: ArrayBuffer | null;
  documentId: string;
  onFieldChange?: (fieldName: string, value: unknown) => void;
  isLoading?: boolean;
  downloadUrl?: string;
}

function LivePDFPreviewComponent({
  pdfBuffer,
  documentId: _documentId,
  onFieldChange,
  isLoading: externalLoading,
  downloadUrl,
}: LivePDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mountedRef = useRef(true);
  const previousUrlRef = useRef<string | null>(null);
  const iframeLoadedRef = useRef(false);
  const currentFieldValuesRef = useRef<Record<string, unknown>>({});
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedBufferRef = useRef<ArrayBuffer | null>(null);

  // Validate buffer presence
  useEffect(() => {
    console.log('[LivePDFPreview] State check:', {
      hasPdfBuffer: !!pdfBuffer,
      pdfBufferSize: pdfBuffer?.byteLength,
      hasDownloadUrl: !!downloadUrl,
      externalLoading
    });

    if (externalLoading) {
      setIsLoading(true);
      return;
    }

    if (!pdfBuffer && !downloadUrl) {
      setError("No PDF buffer or download URL available");
      setIsLoading(false);
    } else {
      setError(null);
      setIsLoading(false);
    }
  }, [pdfBuffer, externalLoading, downloadUrl]);

  // Convert PDF buffer to blob URL for viewer
  useEffect(() => {
    if (!pdfBuffer || pdfBuffer.byteLength < 32) {
      // Cleanup previous URL
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
        previousUrlRef.current = null;
      }
      setPdfDataUrl(null);
      return;
    }

    try {
      // Revoke old URL if it exists
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }

      // Create blob from buffer
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      previousUrlRef.current = url;
      setPdfDataUrl(url);
      
      console.log('[LivePDFPreview] Created blob URL for PDF viewer', {
        bufferSize: pdfBuffer.byteLength,
        url: url.substring(0, 50) + '...'
      });

      // Don't reload iframe immediately - let the sync effect handle field updates
      // This prevents unnecessary reloads and allows for realtime field updates

      // Cleanup on unmount or buffer change
      return () => {
        // Note: We don't revoke here as the url is stored in previousUrlRef
        // and will be revoked on next update or unmount
      };
    } catch (err) {
      console.error('[LivePDFPreview] Failed to create blob URL:', err);
      setError('Failed to prepare PDF for viewing');
    }
  }, [pdfBuffer]);

  // Listen for messages from the PDF.js viewer
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: validate origin if needed
      // For now, allow messages from blob URLs and same origin
      // if (event.origin !== window.location.origin && !event.origin.startsWith('blob:')) return;

      const { type, fieldName, value, source } = event.data;

      // Handle field changes from viewer
      if (type === 'pdf-field-change' && fieldName && source === 'pdf-viewer' && onFieldChange) {
        console.log(`📝 Field changed in viewer: ${fieldName} = ${value}`, {
          timestamp: event.data.timestamp
        });
        
        // Update local ref
        currentFieldValuesRef.current = {
          ...currentFieldValuesRef.current,
          [fieldName]: value
        };
        
        onFieldChange(fieldName, value);
      }

      // Handle update confirmation from viewer
      if (type === 'pdf-fields-updated') {
        console.log('✅ PDF fields updated successfully');
        setIsUpdating(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [onFieldChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, []);

  // Sync field values when pdfBuffer changes (from parent)
  useEffect(() => {
    // Skip if this is the same buffer we already synced
    if (!pdfBuffer || pdfBuffer === lastSyncedBufferRef.current) {
      return;
    }

    // Only sync if viewer is loaded and we have a data URL
    if (!iframeLoadedRef.current || !pdfDataUrl) {
      return;
    }

    lastSyncedBufferRef.current = pdfBuffer;
    
    // Extract field values from the new buffer to sync with viewer
    // This happens after save - we want to update the viewer fields
    const currentDataUrl = pdfDataUrl; // Capture for async use
    
    setIsUpdating(true);
    
    import('@/lib/document-storage/pdf-field-updater').then(({ extractPDFFieldValues }) => {
      extractPDFFieldValues(pdfBuffer).then((values) => {
        currentFieldValuesRef.current = values;
        
        // If viewer is loaded, update it with message-based update
        const iframe = iframeRef.current;
        if (iframe?.contentWindow && iframeLoadedRef.current && Object.keys(values).length > 0) {
          try {
            console.log('[LivePDFPreview] Syncing field values to viewer:', Object.keys(values).length, 'fields');
            
            iframe.contentWindow.postMessage({
              type: 'pdf-update-fields',
              fieldValues: values,
              fileUrl: currentDataUrl
            }, '*');
            
            // Set timeout in case update confirmation doesn't arrive
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            loadingTimeoutRef.current = setTimeout(() => {
              console.warn('[LivePDFPreview] Field sync timeout');
              setIsUpdating(false);
              loadingTimeoutRef.current = null;
            }, 2000);
          } catch (err) {
            console.error('[LivePDFPreview] Failed to sync fields:', err);
            setIsUpdating(false);
          }
        } else {
          setIsUpdating(false);
        }
      }).catch((err) => {
        console.error('[LivePDFPreview] Failed to extract field values:', err);
        setIsUpdating(false);
      });
    });
  }, [pdfBuffer, pdfDataUrl]);

  if (isLoading && !iframeLoadedRef.current) {
    return (
      <div className="flex flex-col justify-center items-center h-full bg-muted/20">
        <Skeleton className="w-full h-full" />
        <p className="mt-4 text-sm text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <span>{error}</span>
              <p className="text-xs text-muted-foreground">
                The document may not be ready yet. Try refreshing the page.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use PDF.js viewer if we have a buffer, otherwise use S3 URL
  const shouldUseViewer = pdfBuffer && pdfBuffer.byteLength >= 32 && pdfDataUrl;
  const shouldUseIframe = !shouldUseViewer && downloadUrl;

  if (!shouldUseViewer && !shouldUseIframe) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full">
        <Alert className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Document preview is not available. The PDF may not have been
            generated yet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Build viewer URL with PDF file parameter
  const viewerUrl = shouldUseViewer
    ? `/pdfjs-viewer/web/viewer.html?file=${encodeURIComponent(pdfDataUrl)}`
    : shouldUseIframe
    ? downloadUrl
    : null;

  if (!viewerUrl) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-full">
        <Alert className="max-w-md">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Unable to generate viewer URL
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative flex overflow-hidden flex-col w-full h-full">
      {/* Subtle updating indicator */}
      {isUpdating && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-background/90 backdrop-blur-sm border rounded-md shadow-sm">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">Updating...</span>
        </div>
      )}
      
      {/* PDF.js Viewer in iframe */}
      <iframe
        ref={iframeRef}
        key={viewerUrl}
        src={viewerUrl}
        title="PDF Viewer"
        className="w-full h-full border-0"
        onLoad={() => {
          iframeLoadedRef.current = true;
          console.log('[LivePDFPreview] PDF.js viewer loaded', {
            viewerUrl: viewerUrl.substring(0, 100),
            hasBuffer: !!pdfBuffer,
            bufferSize: pdfBuffer?.byteLength
          });
          setIsLoading(false);
          setIsUpdating(false);
          setError(null);
          
          // Clear any pending timeout
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
        }}
        onError={(e) => {
          console.error('[LivePDFPreview] Viewer error:', e);
          setError('Failed to load PDF viewer');
          setIsLoading(false);
          setIsUpdating(false);
          
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders
export const LivePDFPreview = memo(
  LivePDFPreviewComponent,
  (prevProps, nextProps) => {
    const bufferChanged = prevProps.pdfBuffer !== nextProps.pdfBuffer;
    const urlChanged = prevProps.downloadUrl !== nextProps.downloadUrl;
    const docIdChanged = prevProps.documentId !== nextProps.documentId;
    
    return !bufferChanged && !urlChanged && !docIdChanged;
  }
);

export default LivePDFPreview;