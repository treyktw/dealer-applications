// src/components/deals/documents/EditStep.tsx

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Edit,
} from "lucide-react";

interface Document {
  _id: string;
  name: string;
  status: string;
  template?: {
    name: string;
    _id: string;
  };
  s3Key?: string;
}

interface EditStepProps {
  documents?: Document[];
  sessionToken?: string;
  dealsId?: string;
  onSelectDocument: (documentId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function EditStep({
  documents,
  sessionToken,
  dealsId,
  onSelectDocument,
  onBack,
  onContinue,
}: EditStepProps) {
  const navigate = useNavigate();

  const handleDocumentClick = (docId: string) => {
    onSelectDocument(docId);
    
    // Navigate to full-page editor
    if (dealsId) {
      navigate({
        to: "/deals/$dealsId/documents/edit/$documentId",
        params: { dealsId, documentId: docId },
        search: { token: sessionToken },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Review & Edit Documents</h2>
        <p className="text-muted-foreground">
          Click on any document to open the full editor
        </p>
      </div>

      <div className="space-y-2">
        {!documents || documents.length === 0 ? (
          <div className="p-12 text-center rounded-lg border">
            <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">No documents to edit</p>
          </div>
        ) : (
          documents.map((doc) => (
            <button
              type="button"
              key={doc._id}
              className="flex justify-between items-center p-4 w-full text-left rounded-lg border transition-colors hover:bg-accent group"
              onClick={() => handleDocumentClick(doc._id)}
            >
              <div className="flex flex-1 gap-4 items-center">
                <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-muted">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.template?.name}
                  </p>
                </div>
                <Badge
                  variant={
                    doc.status === "READY" ? "default" : "secondary"
                  }
                >
                  {doc.status}
                </Badge>
              </div>
              <div className="flex gap-2 items-center ml-2">
                <Edit className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button onClick={onContinue}>
          Continue to Signatures
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default EditStep;