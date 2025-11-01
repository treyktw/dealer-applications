// NOTARIZE STEP (Step 4)
import { Shield, ChevronRight, CheckCircle2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { convexMutation } from "@/lib/convex";
import { api } from "@dealer/convex";
import type { Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "react-hot-toast";

interface NotarizeStepProps {
  dealsId: string;
  documents?: Array<{
    _id: Id<"documentInstances">;
    name?: string;
    documentType?: string;
    notarized?: boolean;
    notarizedAt?: number;
  }>;
  onBack: () => void;
  onContinue: () => void;
}

export function NotarizeStep({ 
  dealsId, 
  documents, 
  onBack, 
  onContinue 
}: NotarizeStepProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Mutation to mark document as notarized
  const markNotarizedMutation = useMutation({
    mutationFn: async (documentId: Id<"documentInstances">) => {
      if (!session?.token) {
        throw new Error("No session token");
      }
      
      return convexMutation(api.api.documents.generator.markDocumentNotarized, {
        documentId,
        token: session.token,
      });
    },
    onSuccess: () => {
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["documents", dealsId] });
      toast.success("Document marked as notarized");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark document as notarized");
    },
  });

  // Check which documents need notarization (based on requiredSignatures containing "notary")
  const documentsNeedingNotarization = documents?.filter((doc) => {
    // Check if document has notary in required signatures (if available)
    // For now, we'll check if it's not already notarized
    return !doc.notarized;
  }) || [];

  const allDocumentsNotarized = documentsNeedingNotarization.length === 0 || 
    documents?.every((doc) => doc.notarized);

  const handleMarkNotarized = async (documentId: Id<"documentInstances">) => {
    await markNotarizedMutation.mutateAsync(documentId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Notarization</h2>
        <p className="text-muted-foreground">
          Notarize documents if required by state law
        </p>
      </div>

      {/* Documents List */}
      {documents && documents.length > 0 ? (
        <div className="space-y-4">
          {documents.map((doc) => {
            const isNotarized = doc.notarized === true;
            const isNotarizing = markNotarizedMutation.isPending && 
              markNotarizedMutation.variables === doc._id;

            return (
              <div
                key={doc._id}
                className={`p-6 rounded-lg border ${
                  isNotarized ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : ""
                }`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-full ${
                    isNotarized 
                      ? "bg-green-100 dark:bg-green-900/50" 
                      : "bg-muted"
                  }`}>
                    {isNotarized ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{doc.name || doc.documentType || "Document"}</h4>
                        {doc.documentType && (
                          <p className="text-sm text-muted-foreground capitalize">
                            {doc.documentType.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                      {isNotarized && (
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                          Notarized
                        </Badge>
                      )}
                    </div>
                    {isNotarized && doc.notarizedAt && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Notarized on {new Date(doc.notarizedAt).toLocaleString()}
                      </p>
                    )}
                    {!isNotarized && (
                      <Button
                        variant="outline"
                        onClick={() => handleMarkNotarized(doc._id)}
                        disabled={isNotarizing}
                      >
                        {isNotarizing ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                            Notarizing...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 w-4 h-4" />
                            Mark as Notarized
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-lg border">
          <div className="flex gap-4 items-start">
            <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-full bg-muted">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="mb-2 font-medium">No Documents</h4>
              <p className="text-sm text-muted-foreground">
                No documents available for notarization
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!allDocumentsNotarized && documents && documents.length > 0}>
          Continue to Finalize
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

