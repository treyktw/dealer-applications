// apps/web/src/app/(dashboard)/marketplace/document-packs/page.tsx
"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2, ShoppingCart, Package, FileText } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function MarketplaceDocumentPacksPage() {
  const router = useRouter();
  const [jurisdictionFilter, setJurisdictionFilter] = useState<
    string | undefined
  >();
  const [packTypeFilter, setPackTypeFilter] = useState<string | undefined>();

  // Get current user's dealership (you'll need to implement this query)
  // For now using a placeholder - replace with actual query
  const dealershipId = "placeholder" as Id<"dealerships">;

  // Fetch available packs
  const packs = useQuery(api.dealerDocumentPackPurchases.listAvailablePacks, {
    dealershipId,
    jurisdiction: jurisdictionFilter,
    packType: packTypeFilter,
  });

  const createCheckoutSession = useAction(
    api.dealerDocumentPackPurchases.createCheckoutSession
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePurchase = async (packId: Id<"document_pack_templates">) => {
    try {
      const result = await createCheckoutSession({
        packId,
        dealershipId,
        successUrl: `${window.location.origin}/marketplace/document-packs/success`,
        cancelUrl: `${window.location.origin}/marketplace/document-packs`,
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

  if (packs === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document packs...</p>
        </div>
      </div>
    );
  }

  const availablePacks = packs.filter((p) => !p.isOwned);
  const ownedPacks = packs.filter((p) => p.isOwned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Document Pack Marketplace
        </h1>
        <p className="text-gray-600 mt-1">
          Purchase professional document templates for your dealership
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="w-64">
          <Select
            value={jurisdictionFilter || "all"}
            onValueChange={(value) =>
              setJurisdictionFilter(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jurisdictions</SelectItem>
              <SelectItem value="federal">Federal</SelectItem>
              <SelectItem value="california">California</SelectItem>
              <SelectItem value="texas">Texas</SelectItem>
              <SelectItem value="florida">Florida</SelectItem>
              <SelectItem value="new_york">New York</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <Select
            value={packTypeFilter || "all"}
            onValueChange={(value) =>
              setPackTypeFilter(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="cash_sale">Cash Sale</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="lease">Lease</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Owned Packs */}
      {ownedPacks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Your Document Packs
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedPacks.map((pack) => (
              <Card key={pack._id} className="border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <Badge className="bg-green-600">Owned</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {pack.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Jurisdiction:</span>
                    <Badge variant="outline" className="capitalize">
                      {pack.jurisdiction}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize">
                      {pack.packType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span>{pack.documents.length} documents</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      router.push(`/marketplace/document-packs/${pack._id}`)
                    }
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Packs */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Available Document Packs
          </h2>
        </div>

        {availablePacks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No packs available
              </h3>
              <p className="text-gray-600">
                You own all available document packs or no packs match your
                filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePacks.map((pack) => (
              <Card key={pack._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPrice(pack.price)}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {pack.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Jurisdiction:</span>
                    <Badge variant="outline" className="capitalize">
                      {pack.jurisdiction}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize">
                      {pack.packType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span>{pack.documents.length} documents included</span>
                  </div>
                </CardContent>
                <CardFooter className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      router.push(`/marketplace/document-packs/${pack._id}`)
                    }
                  >
                    Preview
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handlePurchase(pack._id)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
