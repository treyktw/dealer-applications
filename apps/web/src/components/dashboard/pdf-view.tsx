"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
} from "lucide-react";

// Set the PDF.js worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
  documentTitle?: string;
  onDownload?: () => void;
  onPrint?: () => void;
}

export function PdfViewer({
  url,
  documentTitle,
  onDownload,
  onPrint,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state when URL changes
  useEffect(() => {
    setNumPages(null);
    setPageNumber(1);
    setIsLoading(true);
    setError(null);
  }, [url]);

  // Function to handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
  };

  // Function to handle document load error
  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF document");
    setIsLoading(false);
  };

  // Functions to navigate between pages
  const goToPreviousPage = () => {
    setPageNumber((prevPageNumber) => 
      prevPageNumber > 1 ? prevPageNumber - 1 : prevPageNumber
    );
  };

  const goToNextPage = () => {
    setPageNumber((prevPageNumber) => 
      numPages && prevPageNumber < numPages ? prevPageNumber + 1 : prevPageNumber
    );
  };

  // Functions to zoom in and out
  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.6));
  };

  // Handle download button click
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior if no handler provided
      window.open(url, '_blank');
    }
  };

  // Handle print button click
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior if no handler provided
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };

  return (
    <Card className="flex flex-col h-full max-h-[80vh]">
      <div className="p-4 flex justify-between items-center border-b">
        <h3 className="text-lg font-semibold truncate">
          {documentTitle || "Document Viewer"}
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex justify-center bg-muted/30">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-destructive font-semibold">{error}</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-lg"
            />
          </Document>
        )}
      </div>

      {numPages && numPages > 1 && (
        <div className="p-4 flex justify-between items-center border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={goToNextPage}
            disabled={numPages !== null && pageNumber >= numPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </Card>
  );
}