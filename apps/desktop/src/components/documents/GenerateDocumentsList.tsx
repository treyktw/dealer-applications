// src/components/deals/documents/GeneratedDocumentsList.tsx

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import type { Id } from "@dealer/convex";

interface GeneratedDocument {
  _id: Id<"documentInstances">;
  name: string;
  status: string;
  template?: {
    name: string;
  };
}

interface GeneratedDocumentsListProps {
  documents?: GeneratedDocument[];
  onDownload: (documentId: Id<"documentInstances">) => void;
  isDownloading?: boolean;
}

export function GeneratedDocumentsList({ 
  documents, 
  onDownload,
  isDownloading 
}: GeneratedDocumentsListProps) {
  const getDocStatus = (status: string) => {
    switch (status) {
      case "READY":
        return { label: "Ready", color: "bg-blue-500" };
      case "SIGNED":
        return { label: "Signed", color: "bg-green-500" };
      case "VOID":
        return { label: "Voided", color: "bg-red-500" };
      default:
        return { label: "Draft", color: "bg-gray-500" };
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-lg border">
        <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
        <h4 className="mb-2 text-lg font-semibold">No Documents Generated</h4>
        <p className="mb-4 text-muted-foreground">
          No documents have been generated for this deal yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const status = getDocStatus(doc.status);
        return (
          <div
            key={doc._id}
            className="flex gap-4 items-center p-4 rounded-lg border transition-colors hover:bg-accent"
          >
            <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-muted">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{doc.name}</p>
              <p className="text-sm text-muted-foreground">
                {doc.template?.name}
              </p>
            </div>
            <Badge className={status.color}>{status.label}</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownload(doc._id)}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}