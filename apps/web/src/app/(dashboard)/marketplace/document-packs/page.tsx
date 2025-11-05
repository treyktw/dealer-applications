// apps/web/src/app/(dashboard)/marketplace/document-packs/page.tsx
"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  CheckCircle2,
  ShoppingCart,
  Package,
  FileText,
  Search,
  Filter,
  Grid3x3,
  List,
  TrendingUp,
  Shield,
  DollarSign,
  Sparkles,
} from "lucide-react";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type PackView = "grid" | "list";

type PackWithOwnership = Doc<"document_pack_templates"> & {
  isOwned: boolean;
  purchaseId?: Id<"dealer_document_pack_purchases">;
};

export default function MarketplaceDocumentPacksPage() {
  const router = useRouter();
  const [jurisdictionFilter, setJurisdictionFilter] = useState<
    string | undefined
  >();
  const [packTypeFilter, setPackTypeFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<PackView>("grid");
  const [activeTab, setActiveTab] = useState<"available" | "owned">("available");

  // Get current user's dealership
  const { user } = useCurrentUser();
  const dealershipId = user?.dealershipId as Id<"dealerships"> | undefined;

  // Fetch available packs (only if we have a dealership ID)
  const packs = useQuery(
    api.dealerDocumentPackPurchases.listAvailablePacks,
    dealershipId
      ? {
          dealershipId,
          jurisdiction: jurisdictionFilter,
          packType: packTypeFilter,
        }
      : "skip"
  );


  const createCheckoutSession = useAction(
    api.dealerDocumentPackPurchases.createCheckoutSession
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePurchase = async (packId: Id<"document_pack_templates">) => {
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
        cancelUrl: `${window.location.origin}/marketplace/document-packs`,
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

  // Filter and search packs
  const filteredPacks = useMemo(() => {
    if (!packs) return [];
    
    let filtered = packs;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pack) =>
          pack.name.toLowerCase().includes(query) ||
          pack.description.toLowerCase().includes(query) ||
          pack.jurisdiction.toLowerCase().includes(query) ||
          pack.packType.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [packs, searchQuery]);

  const availablePacks = filteredPacks.filter((p) => !p.isOwned);
  const ownedPacks = filteredPacks.filter((p) => p.isOwned);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!packs) return null;
    
    const totalPacks = packs.length;
    const ownedCount = ownedPacks.length;
    const availableCount = availablePacks.length;
    const totalValue = ownedPacks.reduce((sum, pack) => sum + pack.price, 0);
    
    return {
      totalPacks,
      ownedCount,
      availableCount,
      totalValue,
    };
  }, [packs, ownedPacks, availablePacks]);

  if (!dealershipId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              No Dealership Found
            </h3>
            <p className="text-zinc-400 mb-4">
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

  if (packs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-zinc-600">Loading document packs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            Document Pack Marketplace
          </h1>
          <p className="text-zinc-600 mt-2 text-lg">
            Discover professional document templates designed for your dealership
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-600">Total Packs</p>
                    <p className="text-2xl font-bold">{stats.totalPacks}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-600">Owned</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.ownedCount}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-600">Available</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.availableCount}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-600">Total Value</p>
                    <p className="text-2xl font-bold">
                      {formatPrice(stats.totalValue)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search packs by name, jurisdiction, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">Filters:</span>
              </div>
              
              <div className="w-48">
                <Select
                  value={jurisdictionFilter || "all"}
                  onValueChange={(value) =>
                    setJurisdictionFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jurisdictions</SelectItem>
                    <SelectItem value="federal">Federal</SelectItem>
                    <SelectItem value="california">California</SelectItem>
                    <SelectItem value="texas">Texas</SelectItem>
                    <SelectItem value="florida">Florida</SelectItem>
                    <SelectItem value="new_york">New York</SelectItem>
                    <SelectItem value="nevada">Nevada</SelectItem>
                    <SelectItem value="arizona">Arizona</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-48">
                <Select
                  value={packTypeFilter || "all"}
                  onValueChange={(value) =>
                    setPackTypeFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pack Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="cash_sale">Cash Sale</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="complete">Complete Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Available vs Owned */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Available ({availablePacks.length})
          </TabsTrigger>
          <TabsTrigger value="owned" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            My Packs ({ownedPacks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6 mt-6">
          {availablePacks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">
                  No packs available
                </h3>
                <p className="text-zinc-600 max-w-md mx-auto">
                  {searchQuery || jurisdictionFilter || packTypeFilter
                    ? "Try adjusting your filters to see more results."
                    : "You own all available document packs or no packs are currently available."}
                </p>
                {(searchQuery || jurisdictionFilter || packTypeFilter) && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setJurisdictionFilter(undefined);
                      setPackTypeFilter(undefined);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {availablePacks.map((pack) => (
                <PackCard
                  key={pack._id}
                  pack={pack}
                  viewMode={viewMode}
                  onViewDetails={() =>
                    router.push(`/marketplace/document-packs/${pack._id}`)
                  }
                  onPurchase={() => handlePurchase(pack._id)}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="owned" className="space-y-6 mt-6">
          {ownedPacks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle2 className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">
                  No owned packs yet
                </h3>
                <p className="text-zinc-600 max-w-md mx-auto mb-4">
                  Purchase document packs from the marketplace to get started.
                </p>
                <Button onClick={() => setActiveTab("available")}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {ownedPacks.map((pack) => (
                <PackCard
                  key={pack._id}
                  pack={pack}
                  viewMode={viewMode}
                  isOwned={true}
                  onViewDetails={() =>
                    router.push(`/marketplace/document-packs/${pack._id}`)
                  }
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Pack Card Component
function PackCard({
  pack,
  viewMode,
  isOwned = false,
  onViewDetails,
  onPurchase,
  formatPrice,
}: {
  pack: PackWithOwnership;
  viewMode: PackView;
  isOwned?: boolean;
  onViewDetails: () => void;
  onPurchase?: () => void;
  formatPrice: (cents: number) => string;
}) {
  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="bg-blue-100 rounded-lg p-3">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {pack.name}
                      {isOwned && (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Owned
                        </Badge>
                      )}
                    </h3>
                    <p className="text-zinc-600 text-sm mt-1 line-clamp-2">
                      {pack.description}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    {!isOwned && (
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {formatPrice(pack.price)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-zinc-600">
                  <Badge variant="outline" className="capitalize">
                    {pack.jurisdiction}
                  </Badge>
                  <span className="capitalize">
                    {pack.packType.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{pack.documents.length} documents</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 flex gap-2">
              <Button variant="outline" onClick={onViewDetails}>
                View Details
              </Button>
              {!isOwned && onPurchase && (
                <Button onClick={onPurchase}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      className={`hover:shadow-lg transition-all ${
        isOwned ? "border-green-200 bg-green-50/50" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{pack.name}</CardTitle>
            {isOwned && (
              <Badge className="bg-green-600 mt-2">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Owned
              </Badge>
            )}
          </div>
          {!isOwned && (
            <div className="text-right ml-2">
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(pack.price)}
              </div>
            </div>
          )}
        </div>
        <CardDescription className="line-clamp-3 mt-2">
          {pack.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">Jurisdiction:</span>
          <Badge variant="outline" className="capitalize">
            {pack.jurisdiction}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">Type:</span>
          <span className="capitalize font-medium">
            {pack.packType.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600">Documents:</span>
          <div className="flex items-center gap-1 font-medium">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>{pack.documents.length}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onViewDetails}>
          {isOwned ? "View Details" : "Preview"}
        </Button>
        {!isOwned && onPurchase && (
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={onPurchase}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
