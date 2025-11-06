// apps/web/src/app/(dashboard)/marketplace/document-packs/[id]/DocumentPackDetailClient.tsx
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
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShoppingCart,
  CheckCircle2,
  FileText,
  Shield,
  Clock,
  Star,
  Sparkles,
  ArrowRight,
  Package,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface DocumentPackDetailClientProps {
  packId: Id<"document_pack_templates">;
}

export default function DocumentPackDetailClient({
  packId,
}: DocumentPackDetailClientProps) {
  const router = useRouter();
  // Get current user's dealership
  const { user } = useCurrentUser();
  const dealershipId = user?.dealershipId as Id<"dealerships"> | undefined;

  // Fetch pack preview
  const packPreview = useQuery(
    api.dealerDocumentPackPurchases.previewPack,
    packId ? { packId } : "skip"
  );

  // Check ownership
  const ownership = useQuery(
    api.dealerDocumentPackPurchases.checkOwnership,
    dealershipId && packId
      ? {
          dealershipId,
          packId,
        }
      : "skip"
  );

  const createCheckoutSession = useAction(
    api.dealerDocumentPackPurchases.createCheckoutSession
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePurchase = async () => {
    if (!dealershipId) {
      toast.error("No dealership found. Please contact support.");
      return;
    }

    try {
      toast.loading("Redirecting to checkout...", { id: "checkout" });
      const result = await createCheckoutSession({
        packId,
        dealershipId,
        successUrl: `${window.location.origin}/marketplace/document-packs/success`,
        cancelUrl: `${window.location.origin}/marketplace/document-packs/${packId}`,
      });

      toast.dismiss("checkout");
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch (error) {
      toast.dismiss("checkout");
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
    }
  };

  if (!dealershipId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Dealership Found
            </h3>
            <p className="text-gray-600 mb-4">
              Please contact support to associate your account with a dealership.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (packPreview === undefined || ownership === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading pack details...</p>
        </div>
      </div>
    );
  }

  if (!packPreview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pack Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The document pack you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/marketplace/document-packs")}>
              Back to Document Packs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwned = ownership.isOwned;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs are handled by the layout */}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Section */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                    <CardTitle className="text-3xl">{packPreview.name}</CardTitle>
                  </div>
                  {isOwned && (
                    <Badge className="bg-green-600 mt-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      You Own This Pack
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-base mt-4">
                {packPreview.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Documents</span>
                  </div>
                  <p className="text-2xl font-bold">{packPreview.documentCount}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Jurisdiction</span>
                  </div>
                  <p className="text-lg font-bold capitalize">
                    {packPreview.jurisdiction}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Star className="w-4 h-4" />
                    <span className="text-sm font-medium">Type</span>
                  </div>
                  <p className="text-lg font-bold capitalize">
                    {packPreview.packType.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Delivery</span>
                  </div>
                  <p className="text-lg font-bold">Instant</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Included Documents
              </CardTitle>
              <CardDescription>
                All documents included in this pack are ready to use in your deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {packPreview.documentList.map((doc: { name: string; type: string; required: boolean }) => (
                  <div
                    key={doc.name}
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="bg-blue-100 rounded-lg p-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{doc.name}</h4>
                          <p className="text-sm text-gray-600 capitalize mt-1">
                            {doc.type.replace(/_/g, " ")}
                          </p>
                        </div>
                        {doc.required && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-50 text-red-700 border-red-200"
                          >
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features/Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>What You Get</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Ready to Use</h4>
                    <p className="text-sm text-gray-600">
                      All documents are pre-configured and ready for your deals
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Compliance Guaranteed</h4>
                    <p className="text-sm text-gray-600">
                      All documents meet state and federal requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Lifetime Access</h4>
                    <p className="text-sm text-gray-600">
                      Use these documents in unlimited deals
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Auto-Updates</h4>
                    <p className="text-sm text-gray-600">
                      Receive updates when regulations change
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Purchase Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2">
            <CardHeader className="text-center pb-4">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-blue-600">
                  {formatPrice(packPreview.price)}
                </div>
                <CardDescription className="text-base">
                  One-time purchase
                </CardDescription>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-6">
              {isOwned ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-green-900 mb-2">
                      You Own This Pack
                    </h3>
                    <p className="text-sm text-green-700">
                      Available for use in all your deals. Access it anytime from your
                      document packs.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => router.push("/marketplace/document-packs")}
                  >
                    Browse More Packs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Documents:</span>
                      <span className="font-semibold">
                        {packPreview.documentCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Jurisdiction:</span>
                      <span className="font-semibold capitalize">
                        {packPreview.jurisdiction}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold capitalize">
                        {packPreview.packType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total:</span>
                      <span className="text-lg text-blue-600">
                        {formatPrice(packPreview.price)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                    onClick={handlePurchase}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Purchase Now
                  </Button>

                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span>Secure payment powered by Stripe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Instant access after purchase</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

