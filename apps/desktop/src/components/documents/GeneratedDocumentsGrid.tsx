// src/components/documents/GeneratedDocumentsGrid.tsx

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { convexAction, convexMutation } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";
import { useMutation } from "@tanstack/react-query";

interface GeneratedDocument {
  _id: Id<"documentInstances">;
  name: string;
  status: string;
  template?: {
    name: string;
  };
}

interface GeneratedDocumentsGridProps {
  documents?: GeneratedDocument[];
  onStatusChanged?: (documentId: Id<"documentInstances">, status: string) => void;
}

function getDocStatus(status: string) {
  switch (status) {
    case "READY":
      return { label: "Ready", color: "bg-blue-500" };
    case "FINALIZED":
      return { label: "Finalized", color: "bg-green-600" };
    case "VOID":
      return { label: "Voided", color: "bg-red-500" };
    default:
      return { label: "Draft", color: "bg-gray-500" };
  }
}

export function GeneratedDocumentsGrid({ documents, onStatusChanged }: GeneratedDocumentsGridProps) {
  const { session } = useAuth();
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = useMutation({
    mutationFn: async ({ documentId, status }: { documentId: Id<"documentInstances">; status: "DRAFT" | "READY" | "SIGNED" | "VOID" | "FINALIZING" | "FINALIZED" }) => {
      if (!session?.token) throw new Error("No session token");
      return convexMutation(api.api.documents.generator.updateDocumentStatus, {
        documentId,
        status,
        token: session.token,
      });
    },
    onSuccess: (_data, variables) => {
      onStatusChanged?.(variables.documentId, (variables as any).status);
    },
  });

  const openPreview = async (doc: GeneratedDocument) => {
    if (!session?.token) return;
    setPreviewDoc(doc);
    setIsLoading(true);
    setViewUrl(null);
    try {
      const { downloadUrl } = await convexAction(api.api.documents.generator.getDocumentDownloadUrl, {
        documentId: doc._id,
        token: session.token,
        expiresIn: 300,
      });
      setViewUrl(downloadUrl);
    } finally {
      setIsLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setViewUrl(null);
    setIsLoading(false);
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-lg border">
        <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
        <h4 className="mb-2 text-lg font-semibold">No Documents Generated</h4>
        <p className="text-muted-foreground">No documents have been generated for this deal yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {documents.map((doc) => {
          const status = getDocStatus(doc.status);
          return (
            <div key={doc._id} className="group p-3 rounded-lg border hover:bg-accent transition-colors">
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-md bg-muted flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <button type="button" onClick={() => openPreview(doc)} className="truncate font-medium hover:underline">
                    {doc.name}
                  </button>
                  <p className="truncate text-sm text-muted-foreground">{doc.template?.name || "Document"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-muted-foreground" htmlFor={`status-${doc._id}`}>Status</label>
                <Badge className={status.color}>{status.label}</Badge>

              </div>
              <select
                className="mt-2 w-full h-8 rounded-md border bg-background text-sm"
                id={`status-${doc._id}`}
                value={doc.status || "READY"}
                onChange={(e) => updateStatus.mutate({ documentId: doc._id, status: e.target.value as "DRAFT" | "READY" | "SIGNED" | "VOID" | "FINALIZING" | "FINALIZED" })}
                disabled={updateStatus.isPending}
              >
                <option value="DRAFT">Draft</option>
                <option value="READY">Ready</option>
                <option value="FINALIZED">Finalized</option>
                <option value="VOID">Void</option>
              </select>
            </div>
          );
        })}
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] rounded-md overflow-hidden bg-muted">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewUrl ? (
              <iframe src={viewUrl} className="w-full h-full" title={previewDoc?.name} style={{ border: "none" }} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


