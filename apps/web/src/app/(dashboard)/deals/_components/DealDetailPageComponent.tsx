// app/(dashboard)/deals/[id]/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  User,
  Car,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { GenerateDocumentsButton } from "./GenerateDocumentButtons";
import { DocumentsList } from "./DocumentsList";
import { cn } from "@/lib/utils";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DealDetailPage({ params }: DealDetailPageProps) {
  const { id: dealId } = use(params);
  const router = useRouter();

  // Fetch deal data
  const deal = useQuery(api.deals.getDeal, { 
    dealId: dealId as Id<"deals"> 
  });

  // Fetch document status
  const docStatus = useQuery(api.documents.deal_generator.getDealGenerationStatus, {
    dealId: dealId as Id<"deals">
  });

  if (deal === undefined || docStatus === undefined) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh]">
        <AlertCircle className="mb-4 w-12 h-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">Deal Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          The deal you&apos;re looking for doesn&apos;t exist
        </p>
        <Button onClick={() => router.push("/deals")}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Deals
        </Button>
      </div>
    );
  }

  const client = deal.client;
  const vehicle = deal.vehicle;
  const dealStatus = deal.status || "draft";

  // Check if we should show generate button
  const canGenerateDocs = dealStatus === "draft" || dealStatus === "on_hold";
  const hasDocuments = docStatus.total > 0;

  // Get status badge
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { 
      label: string; 
      variant: "outline" | "secondary" | "default"; 
      icon: React.ReactNode;
      className?: string;
    }> = {
      draft: {
        label: "Draft",
        variant: "outline",
        icon: <FileText className="w-3 h-3" />,
        className: "border-gray-300 text-gray-700"
      },
      pending_documents: {
        label: "Generating Documents",
        variant: "secondary",
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        className: "bg-blue-100 text-blue-700"
      },
      ready_for_signatures: {
        label: "Ready for Signatures",
        variant: "default",
        icon: <AlertCircle className="w-3 h-3" />,
        className: "bg-yellow-100 text-yellow-700"
      },
      partially_signed: {
        label: "Partially Signed",
        variant: "secondary",
        icon: <Clock className="w-3 h-3" />,
        className: "bg-orange-100 text-orange-700"
      },
      ready_to_finalize: {
        label: "Ready to Finalize",
        variant: "default",
        icon: <CheckCircle2 className="w-3 h-3" />,
        className: "bg-green-100 text-green-700"
      },
      completed: {
        label: "Completed",
        variant: "default",
        icon: <CheckCircle2 className="w-3 h-3" />,
        className: "bg-green-600 text-white"
      },
    };

    const config = configs[status] || configs.draft;

    return (
      <Badge 
        variant={config.variant}
        className={cn("flex gap-1 items-center", config.className)}
      >
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/deals")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Deal #{String(dealId).substring(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              Created {formatDate(new Date(deal.createdAt))}
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {getStatusBadge(dealStatus)}
        </div>
      </div>

      {/* Deal Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex gap-2 items-center text-lg">
              <User className="w-5 h-5 text-primary" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold">
                {client
                  ? `${client.firstName} ${client.lastName}`
                  : "Unknown Client"}
              </p>
            </div>
            {client?.email && (
              <div className="flex gap-2 items-center text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
            {client?.phone && (
              <div className="flex gap-2 items-center text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client?.city && client?.state && (
              <div className="flex gap-2 items-center text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{client.city}, {client.state}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex gap-2 items-center text-lg">
              <Car className="w-5 h-5 text-blue-500" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold">
                {vehicle
                  ? `${vehicle.year} ${vehicle.make}`
                  : "Unknown Vehicle"}
              </p>
              {vehicle && (
                <p className="text-lg text-muted-foreground">{vehicle.model}</p>
              )}
            </div>
            {vehicle?.vin && (
              <div className="text-sm">
                <span className="text-muted-foreground">VIN: </span>
                <span className="font-mono">{vehicle.vin}</span>
              </div>
            )}
            {vehicle?.stock && (
              <div className="text-sm">
                <span className="text-muted-foreground">Stock: </span>
                <span className="font-medium">{vehicle.stock}</span>
              </div>
            )}
            {vehicle?.mileage && (
              <div className="text-sm">
                <span className="text-muted-foreground">Mileage: </span>
                <span className="font-medium">{vehicle.mileage.toLocaleString()} mi</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deal Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex gap-2 items-center text-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
              Deal Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Sale Amount</p>
              <p className="text-2xl font-bold">
                {formatCurrency(deal.saleAmount || 0)}
              </p>
            </div>
            {deal.salesTax && deal.salesTax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sales Tax</span>
                <span className="font-medium">
                  {formatCurrency(deal.salesTax || 0)}
                </span>
              </div>
            )}  
            {deal.docFee && deal.docFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Doc Fee</span>
                <span className="font-medium">
                  {formatCurrency(deal.docFee || 0)}
                </span>
              </div>
            )}
            {deal.tradeInValue && deal.tradeInValue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trade-In</span>
                <span className="font-medium text-green-600">
                  -{formatCurrency(deal.tradeInValue || 0)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(
                  (deal.saleAmount || 0) + 
                  (deal.salesTax || 0) + 
                  (deal.docFee || 0) - 
                  (deal.tradeInValue || 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Generation Section - ALWAYS show for draft/on_hold */}
      {canGenerateDocs && (
        <Card className="bg-primary/5 border-primary/50">
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <FileText className="w-5 h-5" />
              Generate Deal Documents
            </CardTitle>
            <CardDescription>
              {hasDocuments 
                ? "Documents have been generated. Click below to regenerate if needed."
                : "Create all required documents for this deal to proceed with signatures"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateDocumentsButton 
              dealId={dealId as Id<"deals">}
              onSuccess={() => {
                // Optionally refresh the page or show success
                window.location.reload();
              }}
            />
            {hasDocuments && (
              <p className="mt-2 text-sm text-muted-foreground">
                Note: Regenerating will create new document versions
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Status - Show if docs exist */}
      {hasDocuments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Document Progress</span>
              <span className="text-2xl font-bold">
                {Math.round((docStatus.signed / docStatus.total) * 100)}%
              </span>
            </CardTitle>
            <CardDescription>
              {docStatus.signed} of {docStatus.total} documents signed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full transition-all bg-primary"
                  style={{
                    width: `${(docStatus.signed / docStatus.total) * 100}%`,
                  }}
                />
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="p-3 text-center rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{docStatus.draft}</p>
                  <p className="text-sm text-muted-foreground">Draft</p>
                </div>
                <div className="p-3 text-center bg-blue-50 rounded-lg dark:bg-blue-950">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {docStatus.ready}
                  </p>
                  <p className="text-sm text-muted-foreground">Ready</p>
                </div>
                <div className="p-3 text-center bg-green-50 rounded-lg dark:bg-green-950">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {docStatus.signed}
                  </p>
                  <p className="text-sm text-muted-foreground">Signed</p>
                </div>
                <div className="p-3 text-center rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{docStatus.voided}</p>
                  <p className="text-sm text-muted-foreground">Voided</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List - Show if docs exist */}
      {hasDocuments && (
        <DocumentsList dealId={dealId as Id<"deals">} />
      )}

      {/* No Documents Message - Show if no docs and can't generate */}
      {!hasDocuments && !canGenerateDocs && (
        <Card>
          <CardContent className="flex flex-col justify-center items-center py-12">
            <FileText className="mb-4 w-12 h-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Documents Yet</h3>
            <p className="text-sm text-muted-foreground">
              Documents will appear here once generated
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions Footer */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push("/deals")}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Deals
            </Button>
            {dealStatus === "ready_for_signatures" && (
              <Button size="lg">
                Request Signatures
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}