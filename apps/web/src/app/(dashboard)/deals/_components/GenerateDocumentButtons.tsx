// app/(dashboard)/deals/_components/GenerateDocumentsButton.tsx
"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface GenerateDocumentsButtonProps {
  dealId: Id<"deals">;
  onSuccess?: () => void;
}

export function GenerateDocumentsButton({ 
  dealId, 
  onSuccess 
}: GenerateDocumentsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<Array<{
    documentId: string;
    templateName: string;
    status: string;
  }>>([]);

  // Get deal data to check if ready
  const deal = useQuery(api.deals.getDeal, { dealId });

  // Generate documents action
  const generateDocuments = useAction(api.documents.deal_generator.generateDealDocuments);

  const handleGenerateDocuments = async () => {
    if (!deal) {
      toast.error("Deal not found");
      return;
    }

    // Validate deal has required data
    if (!deal.clientId || !deal.vehicleId) {
      toast.error("Deal must have a client and vehicle");
      return;
    }

    setIsGenerating(true);
    setShowModal(true);
    setProgress(10);
    setError(null);
    setGeneratedDocs([]);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Call the generation action
      const result = await generateDocuments({
        dealId,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setGeneratedDocs(result.documents);
        toast.success(`Generated ${result.documentsGenerated} document(s)`);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          setShowModal(false);
          if (onSuccess) onSuccess();
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate documents";
      setError(errorMessage);
      toast.error(errorMessage);
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = deal?.status === "draft" || deal?.status === "on_hold";

  return (
    <>
      <Button
        onClick={handleGenerateDocuments}
        disabled={isGenerating || !canGenerate}
        size="lg"
        className="w-full sm:w-auto"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="mr-2 w-4 h-4" />
            Generate Documents
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center">
              {progress === 100 && !error ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Documents Generated!
                </>
              ) : error ? (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  Generation Failed
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Generating Documents
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {progress === 100 && !error
                ? "All documents have been generated successfully"
                : error
                ? "There was an error generating your documents"
                : "Please wait while we generate your deal documents"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Progress Bar */}
            {!error && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {progress}% complete
                </p>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generated Documents List */}
            {generatedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Generated Documents:</p>
                <div className="space-y-2">
                  {generatedDocs.map((doc) => (
                    <div
                      key={doc.documentId}
                      className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200 dark:bg-green-950 dark:border-green-800"
                    >
                      <div className="flex gap-2 items-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium">
                          {doc.templateName}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-green-600 dark:text-green-400">
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isGenerating && progress < 100 && (
              <div className="space-y-3">
                <div className="flex gap-3 items-center p-3 rounded-lg bg-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Processing templates...</p>
                    <p className="text-xs text-muted-foreground">
                      This may take a few moments
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {progress === 100 || error ? (
              <Button onClick={() => setShowModal(false)} className="w-full">
                Close
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Badge({ 
  children, 
  variant = "default",
  className 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "outline";
  className?: string;
}) {
  return (
    <span 
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
        variant === "outline" 
          ? "border border-current" 
          : "bg-primary text-primary-foreground"
      } ${className}`}
    >
      {children}
    </span>
  );
}