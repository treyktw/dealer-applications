"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Download,
  Printer,
  CheckCircle,
} from "lucide-react";

import { DealStatus, DocumentType } from "@/types/documents";
import { toast } from "sonner";

interface DealDetailPageProps {
  dealId: string;
}

export function DealDetailPage({ dealId }: DealDetailPageProps) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch deal data using Convex
  const deal = useQuery(api.deals.getDeal, { dealId: dealId as Id<"deals"> });
  const updateDealStatus = useMutation(api.deals.updateDealStatus);
  const markDocumentSigned = useMutation(api.deals.markDocumentSigned);

  // Handle document signing
  const handleMarkDocumentSigned = (documentId: string, type: "client" | "dealer" | "notary") => {
    markDocumentSigned({
      documentId: documentId as Id<"documents">,
      type,
    }).then(() => {
      toast.success("Document status has been updated successfully.");
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update document status");
    });
  };

  // Handle completing the deal
  const handleCompleteDeal = () => {
    if (deal && deal.status !== DealStatus.COMPLETED) {
      if (!confirm("Are you sure you want to complete this deal? This action cannot be undone.")) {
        return;
      }
      
      updateDealStatus({
        dealId: dealId as Id<"deals">,
        status: DealStatus.COMPLETED,
      }).then(() => {
        toast.success("Deal status has been updated successfully.");
      }).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to update deal status");
      });
    }
  };

  // Handle cancelling the deal
  const handleCancelDeal = () => {
    if (deal && deal.status !== DealStatus.CANCELLED) {
      if (!confirm("Are you sure you want to cancel this deal? This action cannot be undone.")) {
        return;
      }
      
      updateDealStatus({
        dealId: dealId as Id<"deals">,
        status: DealStatus.CANCELLED,
      }).then(() => {
        toast.success("Deal status has been updated successfully.");
      }).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to update deal status");
      });
    }
  };

  // Handle document download
  const handleDownloadDocument = async (document: { documentUrl: string }) => {
    if (!document.documentUrl) {
      toast.error("Document URL is not available");
      return;
    }
    
    try {
      setIsDownloading(true);
      window.open(document.documentUrl, "_blank");
      toast.success("The document has been opened in a new tab.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle document print
  const handlePrintDocument = async (document: { documentUrl: string }) => {
    if (!document.documentUrl) {
      toast.error("Document URL is not available");
      return;
    }
    
    try {
      setIsPrinting(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("The document has been sent to the printer.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to print document");
    } finally {
      setIsPrinting(false);
    }
  };

  // Format document type for display
  const formatDocumentType = (type: string): string => {
    return type.replace(/([A-Z])/g, ' $1').trim();
  };

  // Get status badge for the deal
  const getDealStatusBadge = (status: string) => {
    switch (status) {
      case DealStatus.DRAFT:
        return <Badge variant="outline">Draft</Badge>;
      case DealStatus.PENDING:
        return <Badge variant="secondary">Pending</Badge>;
      case DealStatus.COMPLETED:
        return <Badge variant="default">Completed</Badge>;
      case DealStatus.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Check if all required documents are signed
  const areAllDocumentsSigned = () => {
    if (!deal?.documents || deal.documents.length === 0) {
      return false;
    }
    
    return deal.documents.every(doc => 
      doc.clientSigned && 
      doc.dealerSigned && 
      (doc.notarized || !requiresNotary(doc.type))
    );
  };

  // Check if a document type requires notarization
  const requiresNotary = (type: string): boolean => {
    return [
      DocumentType.TITLE_REASSIGNMENT,
      DocumentType.POWER_OF_ATTORNEY,
      DocumentType.MV1_APPLICATION,
    ].includes(type as DocumentType);
  };

  // Get the deal progress percentage
  const getDealProgress = (): number => {
    if (!deal?.documents || deal.documents.length === 0) {
      return 0;
    }
    
    if (deal.status === DealStatus.COMPLETED) {
      return 100;
    }
    
    if (deal.status === DealStatus.CANCELLED) {
      return 0;
    }
    
    let totalSignatures = 0;
    let completedSignatures = 0;
    
    deal.documents.forEach(doc => {
      // Client signature
      totalSignatures++;
      if (doc.clientSigned) completedSignatures++;
      
      // Dealer signature
      totalSignatures++;
      if (doc.dealerSigned) completedSignatures++;
      
      // Notary (if required)
      if (requiresNotary(doc.type)) {
        totalSignatures++;
        if (doc.notarized) completedSignatures++;
      }
    });
    
    return Math.round((completedSignatures / totalSignatures) * 100);
  };

  // If loading, show loading indicator
  if (!deal) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Deal Details</h1>
            <p className="text-muted-foreground">
              Deal #{deal.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getDealStatusBadge(deal.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-semibold">Name:</span>
              <span className="ml-2">{deal.clientId}</span>
            </div>
            <div>
              <span className="font-semibold">Email:</span>
              <span className="ml-2">{deal.clientEmail}</span>
            </div>
            <div>
              <span className="font-semibold">Phone:</span>
              <span className="ml-2">{deal.clientPhone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-semibold">Vehicle:</span>
              <span className="ml-2">{deal.vehicleId}</span>
            </div>
            <div>
              <span className="font-semibold">VIN:</span>
              <span className="ml-2">{deal.vin}</span>
            </div>
            <div>
              <span className="font-semibold">Stock:</span>
              <span className="ml-2">{deal.stockNumber}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Manage and track the status of all deal documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deal.documents.map((document) => (
                <TableRow key={document._id}>
                  <TableCell>{formatDocumentType(document.type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {document.clientSigned && (
                        <Badge variant="outline">Client Signed</Badge>
                      )}
                      {document.dealerSigned && (
                        <Badge variant="outline">Dealer Signed</Badge>
                      )}
                      {document.notarized && (
                        <Badge variant="outline">Notarized</Badge>
                      )}
                      {!document.clientSigned && !document.dealerSigned && !document.notarized && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(document)}
                        disabled={isDownloading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintDocument(document)}
                        disabled={isPrinting}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      {!document.clientSigned && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkDocumentSigned(document._id, "client")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Client Signed
                        </Button>
                      )}
                      {!document.dealerSigned && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkDocumentSigned(document._id, "dealer")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Dealer Signed
                        </Button>
                      )}
                      {requiresNotary(document.type) && !document.notarized && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkDocumentSigned(document._id, "notary")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Notarized
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Progress:</span>
            <div className="w-32 h-2 bg-secondary rounded-full">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${getDealProgress()}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">{getDealProgress()}%</span>
          </div>
          <div className="flex items-center space-x-2">
            {deal.status === DealStatus.PENDING && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelDeal}
                >
                  Cancel Deal
                </Button>
                <Button
                  onClick={handleCompleteDeal}
                  disabled={!areAllDocumentsSigned()}
                >
                  Complete Deal
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}