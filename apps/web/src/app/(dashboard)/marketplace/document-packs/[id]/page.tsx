// apps/web/src/app/(dashboard)/marketplace/document-packs/[id]/page.tsx
"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart, CheckCircle2, FileText } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface PageProps {
  params: {
    id: string;
  };
}

export default function DocumentPackDetailPage({ params }: PageProps) {
  const router = useRouter();
  const packId = params.id as Id<"document_pack_templates">;

  // Get current user's dealership (you'll need to implement this query)
  // For now using a placeholder - replace with actual query
  const dealershipId = "placeholder" as Id<"dealerships">;

  // Fetch pack preview
  const packPreview = useQuery(api.dealerDocumentPackPurchases.previewPack, {
    packId,
  });

  // Check ownership
  const ownership = useQuery(
    api.dealerDocumentPackPurchases.checkOwnership,
    {
      dealershipId,
      packId,
    }
  );

  const createCheckoutSession = useAction(
    api.dealerDocumentPackPurchases.createCheckoutSession
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePurchase = async () => {
    try {
      const result = await createCheckoutSession({
        packId,
        dealershipId,
        successUrl: `${window.location.origin}/marketplace/document-packs/success`,
        cancelUrl: `${window.location.origin}/marketplace/document-packs/${packId}`,
      });

      if (result.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl;
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
    }
  };

  if (packPreview === undefined || ownership === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pack details...</p>
        </div>
      </div>
    );
  }

  if (!packPreview) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Pack Not Found
        </h2>
        <p className="text-gray-600 mb-4">
          The document pack you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push("/marketplace/document-packs")}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const isOwned = ownership.isOwned;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Pack Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{packPreview.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {packPreview.description}
                  </CardDescription>
                </div>
                {isOwned && (
                  <Badge className="bg-green-600">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Owned
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Jurisdiction</p>
                  <Badge variant="outline" className="capitalize">
                    {packPreview.jurisdiction}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pack Type</p>
                  <span className="capitalize">
                    {packPreview.packType.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Documents Included
                  </p>
                  <span className="font-medium">
                    {packPreview.documentCount} documents
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Included Documents</CardTitle>
              <CardDescription>
                These documents will be available for use in your deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {packPreview.documentList.map((doc: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{doc.name}</h4>
                        {doc.required && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-50 text-red-700 border-red-200"
                          >
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 capitalize mt-1">
                        {doc.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Purchase */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-3xl text-center text-blue-600">
                {formatPrice(packPreview.price)}
              </CardTitle>
              <CardDescription className="text-center">
                One-time purchase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOwned ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-900">
                      You own this pack
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Available for use in all your deals
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      router.push("/settings/my-document-packs")
                    }
                  >
                    View My Packs
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Documents:</span>
                      <span className="font-medium">
                        {packPreview.documentCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Jurisdiction:</span>
                      <span className="font-medium capitalize">
                        {packPreview.jurisdiction}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Type:</span>
                      <span className="font-medium capitalize">
                        {packPreview.packType.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handlePurchase}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Purchase Now
                  </Button>

                  <p className="text-xs text-gray-600 text-center">
                    Secure payment powered by Stripe
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
