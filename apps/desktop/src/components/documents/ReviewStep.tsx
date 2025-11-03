// src/components/deals/documents/ReviewStep.tsx

import { Button } from "@/components/ui/button";
import { ChevronRight, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { GeneratedDocumentsGrid } from "./GeneratedDocumentsGrid";
import { CustomDocumentsList } from "./CustomDocumentsList";
import type { Id } from "@dealer/convex";

interface ReviewStepProps {
  documents?: any[];
  customDocuments?: any[];
  onDownloadGenerated: (documentId: Id<"documentInstances">) => void;
  onViewCustom: (documentId: string) => void;
  onDownloadCustom: (documentId: Id<"dealer_uploaded_documents">) => void;
  onDeleteCustom: (documentId: Id<"dealer_uploaded_documents">, documentName: string) => void;
  onUpload?: () => void;
  onContinue: () => void;
}

export function ReviewStep({
  documents,
  customDocuments,
  onDownloadGenerated,
  onViewCustom,
  onDownloadCustom,
  onDeleteCustom,
  onUpload,
  onContinue,
}: ReviewStepProps) {
  const [localDocs, setLocalDocs] = useState<any[]>(documents || []);

  // sync when prop changes
  if (documents && localDocs !== documents) {
    setLocalDocs(documents);
  }

  const allCompleted = useMemo(() => {
    return (localDocs || []).every((d) => (d.status || "").toUpperCase() === "FINALIZED");
  }, [localDocs]);

  const handleStatusChanged = (documentId: string, status: string) => {
    setLocalDocs((prev) =>
      (prev || []).map((d) => (d._id === documentId ? { ...d, status } : d))
    );
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Review Documents</h2>
        <p className="text-muted-foreground">
          Review all generated and uploaded documents for this deal
        </p>
      </div>

      {/* Generated Documents Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Generated Documents</h3>
        <GeneratedDocumentsGrid documents={localDocs} onStatusChanged={handleStatusChanged as any} />
      </div>

      {/* Custom Uploaded Documents Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Custom Documents</h3>
          {onUpload && (
            <Button size="sm" className="gap-2" onClick={onUpload}>
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          )}
        </div>
        <CustomDocumentsList
          documents={customDocuments}
          onView={onViewCustom}
          onDownload={onDownloadCustom}
          onDelete={onDeleteCustom}
          onUpload={onUpload}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onContinue} disabled={!allCompleted} title={!allCompleted ? "Mark all documents as Completed to continue" : undefined}>
          Continue to Finalize
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}