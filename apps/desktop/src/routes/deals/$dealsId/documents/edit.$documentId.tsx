// src/routes/deals/$dealsId/documents/edit.$documentId.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex";
import { LivePDFPreview } from "@/components/documents/edit/LivePDFPreview";
import { useDocumentEditor } from "@/hooks/useDocumentEditor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/deals/$dealsId/documents/edit/$documentId"
)({
  component: DocumentEditorPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || undefined,
  }),
  pendingComponent: () => (
    <Layout>
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    </Layout>
  ),
});

function DocumentEditorPage() {
  const { dealsId, documentId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  // Fetch document metadata for display
  const { data: document, isLoading: isLoadingDoc } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      return await convexClient.query(
        "documents/generator:getDocumentById" as any,
        {
          documentId,
          token: search.token,
        }
      );
    },
    enabled: !!documentId,
    retry: 1,
    staleTime: 60_000,
  });

  // Use the document editor hook for all editing logic
  const editorState = useDocumentEditor({
    documentId: documentId as string,
    sessionToken: search.token,
    autoSaveEnabled: true,
    autoSaveDelay: 2000,

    onSaveSuccess: () => {
      console.log("✅ Draft saved to IndexedDB");
    },

    onSaveError: (error) => {
      toast.error("Save failed", {
        description: error.message,
      });
    },

    onFinalized: () => {
      toast.success("Document finalized!", {
        description: "Document has been uploaded to cloud storage",
      });
      navigate({
        to: "/deals/$dealsId/documents",
        params: { dealsId },
        search: { token: search.token },
      });
    },
  });

  const {
    isLoading,
    isInitialized,
    pdfBuffer,
    downloadUrl,
    hasChanges,
    isSaving,
    lastSaved,
    status,
    error: editorError,
    handleFieldChange,
    handleSave,
    handleFinalize,
    discardChanges,
  } = editorState;

  // Debug logging
  useEffect(() => {
    console.log("[DocumentEditorPage] Editor state:", {
      isLoading,
      isInitialized,
      hasPdfBuffer: !!pdfBuffer,
      pdfBufferSize: pdfBuffer?.byteLength,
      hasDownloadUrl: !!downloadUrl,
      downloadUrl,
      status,
      hasChanges,
      editorError,
    });
  }, [isLoading, isInitialized, pdfBuffer, downloadUrl, status, hasChanges, editorError]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }

    navigate({
      to: "/deals/$dealsId/documents",
      params: { dealsId },
      search: { token: search.token },
    });
  }, [hasChanges, navigate, dealsId, search.token]);

  // Error state
  if (editorError) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {editorError instanceof Error
                ? editorError.message
                : "Failed to load document"}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBack} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Documents
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex overflow-hidden flex-col h-screen">
        {/* Header */}
        <div className="flex-none p-4 border-b bg-background">
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Button onClick={handleBack} variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                {isLoadingDoc ? (
                  <Skeleton className="h-6 w-64" />
                ) : document ? (
                  <h1 className="text-xl font-semibold">{document.name}</h1>
                ) : (
                  <h1 className="text-xl font-semibold">Document</h1>
                )}
              </div>

              {/* Status Badge */}
              <Badge
                variant={
                  status === "finalized"
                    ? "default"
                    : status === "finalizing"
                      ? "secondary"
                      : "outline"
                }
              >
                {status === "finalized" && (
                  <CheckCircle className="mr-1 w-3 h-3" />
                )}
                {status === "finalizing" && (
                  <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                )}
                {status.toUpperCase()}
              </Badge>
            </div>

            <div className="flex gap-2 items-center">
              {/* Save status indicator */}
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                {isSaving && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {!isSaving && lastSaved && (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span>
                      Saved {new Date(lastSaved).toLocaleTimeString()}
                    </span>
                  </>
                )}
                {!isSaving && !lastSaved && hasChanges && (
                  <span>Unsaved changes</span>
                )}
              </div>

              {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}

              {/* Discard changes */}
              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={discardChanges}>
                  Discard
                </Button>
              )}

              {/* Manual save button */}
              <Button
                onClick={() => handleSave()}
                disabled={!hasChanges || isSaving}
                size="sm"
                variant="outline"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 w-4 h-4" />
                    Save
                  </>
                )}
              </Button>

              {/* Finalize button */}
              <Button
                onClick={handleFinalize}
                disabled={status !== "draft" || isSaving}
                size="sm"
              >
                {status === "finalizing" ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 w-4 h-4" />
                    Finalize
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex overflow-hidden flex-1">
          {/* PDF Preview - full width, inline editing enabled */}
          <div
            className={cn(
              "flex-none border-r bg-muted/50 overflow-auto transition-all duration-300",
              "w-full"
            )}
          >
            <LivePDFPreview
              pdfBuffer={pdfBuffer}
              documentId={documentId as string}
              onFieldChange={handleFieldChange}
              isLoading={isLoading || !isInitialized}
              downloadUrl={downloadUrl}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}