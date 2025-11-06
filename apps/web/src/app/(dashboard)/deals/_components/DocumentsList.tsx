// app/(dashboard)/deals/_components/DocumentsList.tsx
"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/utils";

interface DocumentsListProps {
  dealId: Id<"deals">;
}

export function DocumentsList({ dealId }: DocumentsListProps) {
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Fetch documents for this deal
  const documents = useQuery(api.documents.generator.getDocumentsByDeal, { 
    dealId 
  });

  // Get download URL action
  const getDownloadUrl = useAction(api.documents.generator.getDocumentDownloadUrl);

  const handleDownload = async (documentId: Id<"documentInstances">) => {
    setDownloadingDoc(String(documentId));
    
    try {
      const { downloadUrl } = await getDownloadUrl({ documentId });
      
      // Open in new tab
      window.open(downloadUrl, "_blank");
      toast.success("Document opened in new tab");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handlePreview = async (documentId: Id<"documentInstances">) => {
    try {
      const { downloadUrl } = await getDownloadUrl({ documentId });
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to preview document");
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="outline" className="flex gap-1 items-center">
            <Edit className="w-3 h-3" />
            Draft
          </Badge>
        );
      case "READY":
        return (
          <Badge variant="default" className="flex gap-1 items-center bg-blue-500">
            <Clock className="w-3 h-3" />
            Ready to Sign
          </Badge>
        );
      case "SIGNED":
        return (
          <Badge variant="default" className="flex gap-1 items-center bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            Signed
          </Badge>
        );
      case "VOID":
        return (
          <Badge variant="destructive" className="flex gap-1 items-center">
            <XCircle className="w-3 h-3" />
            Voided
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get document icon color
  const getDocIconColor = (status: string) => {
    switch (status) {
      case "SIGNED":
        return "text-green-500";
      case "READY":
        return "text-blue-500";
      case "VOID":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  if (documents === undefined) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            No documents have been generated for this deal yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-center items-center py-8">
            <FileText className="mb-3 w-12 h-12 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              Click &quot;Generate Documents&quot; to create deal documents
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group documents by status
  const documentsByStatus = {
    signed: documents.filter(d => d.status === "SIGNED"),
    ready: documents.filter(d => d.status === "READY"),
    draft: documents.filter(d => d.status === "DRAFT"),
    void: documents.filter(d => d.status === "VOID"),
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? 's' : ''} generated
            </CardDescription>
          </div>
          {/* Summary badges */}
          <div className="flex gap-2 items-center">
            {documentsByStatus.signed.length > 0 && (
              <Badge variant="default" className="bg-green-500">
                {documentsByStatus.signed.length} Signed
              </Badge>
            )}
            {documentsByStatus.ready.length > 0 && (
              <Badge variant="default" className="bg-blue-500">
                {documentsByStatus.ready.length} Ready
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="flex justify-between items-center p-4 rounded-lg border transition-shadow hover:shadow-sm"
            >
              {/* Left side - Document info */}
              <div className="flex flex-1 gap-3 items-start">
                <div className={`p-2 rounded-lg bg-muted ${getDocIconColor(doc.status)}`}>
                  <FileText className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center mb-1">
                    <h4 className="font-semibold truncate">
                      {doc.template?.name || doc.name || "Document"}
                    </h4>
                    {getStatusBadge(doc.status)}
                  </div>
                  
                  <div className="flex gap-4 items-center text-sm text-muted-foreground">
                    <span>{doc.template?.category || doc.documentType || "General"}</span>
                    {doc.template?.version && (
                      <span>v{doc.template.version}</span>
                    )}
                    {doc.updatedAt && (
                      <span>Updated {formatDate(new Date(doc.updatedAt))}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(doc._id)}
                  disabled={!doc.s3Key}
                >
                  <Eye className="mr-1 w-4 h-4" />
                  Preview
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc._id)}
                  disabled={!doc.s3Key || downloadingDoc === String(doc._id)}
                >
                  {downloadingDoc === String(doc._id) ? (
                    <Loader2 className="mr-1 w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="mr-1 w-4 h-4" />
                  )}
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}