// src/components/deals/documents/hooks/useDocumentActions.ts

import { useMutation } from "@tanstack/react-query";
import { convexAction, convexMutation } from "@/lib/convex";
import { api } from "@dealer/convex";
import type { Id } from "@dealer/convex";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthContext";

export function useDocumentActions(refetchDocuments?: () => void) {
  const { session } = useAuth();

  // Download generated document
  const downloadDocument = useMutation({
    mutationFn: async (documentId: Id<"documentInstances">) => {
      if (!session?.token) {
        throw new Error("No session token");
      }
      
      return convexAction(api.api.documents.generator.getDocumentDownloadUrl, {
        documentId,
        token: session.token,
      });
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, "_blank");
      toast.success("Document opened");
    },
    onError: (error) => {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    },
  });

  // Download custom document
  const downloadCustomDocument = useMutation({
    mutationFn: async (documentId: Id<"dealer_uploaded_documents">) => {
      return convexAction(api.api.documents.generateCustomDocumentDownloadUrl, {
        documentId,
      });
    },
    onSuccess: (data) => {
      const link = window.document.createElement('a');
      link.href = data.downloadUrl;
      link.download = 'document.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success("Download started");
    },
    onError: (error) => {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    },
  });

  // Delete custom document
  const deleteCustomDocument = useMutation({
    mutationFn: async (documentId: Id<"dealer_uploaded_documents">) => {
      return convexMutation(api.api.documents.deleteCustomDocument, {
        documentId,
      });
    },
    onSuccess: () => {
      toast.success("Document deleted successfully");
      refetchDocuments?.();
    },
    onError: (_error) => {
      toast.error("Failed to delete document");
    },
  });

  return {
    downloadDocument,
    downloadCustomDocument,
    deleteCustomDocument,
  };
}