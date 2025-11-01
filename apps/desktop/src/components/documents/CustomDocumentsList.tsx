// src/components/deals/documents/CustomDocumentsList.tsx

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Upload, MoreVertical, Eye, Download, Trash2 } from "lucide-react";
import type { Id } from "@dealer/convex";

interface CustomDocument {
  _id: Id<"dealer_uploaded_documents">;
  documentName: string;
  documentType: string;
  fileSize: number;
  createdAt: number;
  isActive: boolean;
}

interface CustomDocumentsListProps {
  documents?: CustomDocument[];
  onView: (documentId: string) => void;
  onDownload: (documentId: Id<"dealer_uploaded_documents">) => void;
  onDelete: (documentId: Id<"dealer_uploaded_documents">, documentName: string) => void;
  onUpload?: () => void;
}

export function CustomDocumentsList({
  documents,
  onView,
  onDownload,
  onDelete,
  onUpload,
}: CustomDocumentsListProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-lg border">
        <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
        <h4 className="mb-2 text-lg font-semibold">No Custom Documents</h4>
        <p className="mb-4 text-muted-foreground">
          No custom documents have been uploaded for this deal.
        </p>
        {onUpload && (
          <Button variant="outline" onClick={onUpload}>
            <Upload className="mr-2 w-4 h-4" />
            Upload First Document
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc._id}
          className="flex gap-4 items-center p-4 rounded-lg border transition-colors hover:bg-accent"
        >
          <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-muted">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{doc.documentName}</p>
            <div className="flex gap-3 items-center text-sm text-muted-foreground">
              <span>{doc.documentType}</span>
              <span>•</span>
              <span>{formatFileSize(doc.fileSize)}</span>
              <span>•</span>
              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Badge variant="outline">
            {doc.isActive ? 'Active' : 'Inactive'}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(doc._id)}>
                <Eye className="mr-2 w-4 h-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(doc._id)}>
                <Download className="mr-2 w-4 h-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Delete "${doc.documentName}"?`)) {
                    onDelete(doc._id, doc.documentName);
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}