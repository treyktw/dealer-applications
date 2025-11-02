// src/routes/deals/$dealId/documents/$documentId.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { convexQuery, convexAction } from '@/lib/convex';
import { api, type Id } from '@dealer/convex';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar, 
  User,
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const Route = createFileRoute('/deals/$dealsId/documents/$documents')({
  component: DocumentViewerPage,
});
  
function DocumentViewerPage() {
  const { dealsId, documents } = Route.useParams();
  
  const navigate = useNavigate();
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);

  // Fetch document metadata
  const { data: document, isLoading: isLoadingMetadata, error: metadataError } = useQuery({
    queryKey: ['document-metadata', documents],
    queryFn: async () => {
      return await convexQuery(api.api.documents.getDocumentWithMetadata, {
        documentId: documents as Id<"dealer_uploaded_documents">,
      });
    },
  });

  // Generate presigned URL for viewing
  useEffect(() => {
    const generateViewUrl = async () => {
      if (!documents) return;
      
      try {
        setIsLoadingUrl(true);
        const result = await convexAction(api.api.documents.generateCustomDocumentViewUrl, {
          documentId: documents as Id<"dealer_uploaded_documents">,
        });
        setViewUrl(result.viewUrl);
      } catch (error) {
        console.error('Failed to generate view URL:', error);
        toast.error('Failed to load document', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsLoadingUrl(false);
      }
    };

    generateViewUrl();
  }, [documents]);

  // Handle download
  const handleDownload = async () => {
    try {
      const result = await convexAction(api.api.documents.generateCustomDocumentDownloadUrl, {
        documentId: documents as Id<"dealer_uploaded_documents">,
      });
      
      // Create a temporary link and trigger download
      const link = window.document.createElement('a');
      link.href = result.downloadUrl;
      link.download = document?.documentName || 'document.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleBack = () => {
    navigate({ 
      to: '/deals/$dealsId/documents', 
      params: { dealsId },
      search: { token: undefined },
    });
  };

  // Loading state
  if (isLoadingMetadata) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="w-64 h-12" />
          <Skeleton className="w-full h-96" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (metadataError || !document) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {metadataError instanceof Error 
                ? metadataError.message 
                : 'Document not found'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleBack} 
            variant="outline" 
            className="mt-4"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Documents
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-2">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <Button 
              onClick={handleBack} 
              variant="ghost" 
              size="icon"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{document.documentName}</h1>
              <p className="mt-1 text-muted-foreground">
                Document Viewer
              </p>
            </div>
          </div>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        {/* Document Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <FileText className="w-5 h-5" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">File Type</p>
                <Badge variant="outline">
                  {document.documentType || 'PDF'}
                </Badge>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {formatFileSize(document.fileSize || 0)}
                </p>
              </div>
              <div>
                <p className="flex gap-1 items-center mb-1 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Uploaded
                </p>
                <p className="font-medium">
                  {new Date(document.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="flex gap-1 items-center mb-1 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  Uploaded By
                </p>
                <p className="font-medium">
                  {document.uploadedByName}
                </p>
              </div>
            </div>
            
            {document.deal && (
              <div className="pt-4 mt-4 border-t">
                <p className="mb-2 text-sm text-muted-foreground">Associated Deal</p>
                <div className="flex gap-2 items-center">
                  <Badge>{document.deal.type}</Badge>
                  <Badge variant="outline">{document.deal.status}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Viewer */}
        <Card>
          <CardContent className="p-0">
            {isLoadingUrl ? (
              <div className="flex items-center justify-center h-[600px] bg-muted">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading document...</p>
                </div>
              </div>
            ) : viewUrl ? (
              <iframe
                src={viewUrl}
                className="w-full h-[600px] rounded-lg"
                title={document.documentName}
                style={{ border: 'none' }}
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] bg-muted">
                <div className="text-center">
                  <AlertCircle className="mx-auto mb-4 w-8 h-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Unable to load document preview
                  </p>
                  <Button 
                    onClick={handleDownload} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Download Instead
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={handleBack} 
            variant="outline"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Documents
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>
    </Layout>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}