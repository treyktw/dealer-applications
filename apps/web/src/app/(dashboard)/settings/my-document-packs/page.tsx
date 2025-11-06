// apps/web/src/app/(dashboard)/settings/my-document-packs/page.tsx
"use client";

import { useQuery } from "convex/react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { Package, ShoppingCart, FileText, Calendar } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function MyDocumentPacksPage() {
  const router = useRouter();

  // Get current user's dealership
  const { user } = useCurrentUser();
  const dealershipId = user?.dealershipId as Id<"dealerships"> | undefined;

  // Fetch owned packs (only if dealershipId is available)
  const ownedPacks = useQuery(
    api.dealerDocumentPackPurchases.getOwnedPacks,
    dealershipId ? { dealershipId } : "skip"
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle loading state
  if (user === undefined || ownedPacks === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-zinc-400">Loading your document packs...</p>
        </div>
      </div>
    );
  }

  // Handle case where user has no dealership
  if (!dealershipId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">No Dealership Found</CardTitle>
            <CardDescription className="text-zinc-400">
              Please ensure you are associated with a dealership to view your document packs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/marketplace/document-packs")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            My Document Packs
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage your purchased document pack templates
          </p>
        </div>
        <Button
          onClick={() => router.push("/marketplace/document-packs")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Browse Marketplace
        </Button>
      </div>

      {/* Stats */}
      {ownedPacks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Owned Packs
              </CardTitle>
              <Package className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{ownedPacks.length}</div>
              <p className="text-xs text-zinc-500 mt-1">Active templates</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Total Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {ownedPacks.reduce(
                  (sum, p) => sum + (p.pack?.documents.length || 0),
                  0
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Available to use</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Times Used
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {ownedPacks.reduce((sum, p) => sum + p.purchase.timesUsed, 0)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Across all packs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Packs List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Your Document Packs</CardTitle>
          <CardDescription className="text-zinc-400">
            Templates you&apos;ve purchased and can use in your deals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownedPacks.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-100 mb-2">
                No document packs yet
              </h3>
              <p className="text-zinc-400 mb-4">
                Purchase professional document templates from the marketplace
              </p>
              <Button
                onClick={() => router.push("/marketplace/document-packs")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Browse Marketplace
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                    <TableHead className="text-zinc-300">Pack Name</TableHead>
                    <TableHead className="text-zinc-300">Jurisdiction</TableHead>
                    <TableHead className="text-zinc-300">Type</TableHead>
                    <TableHead className="text-zinc-300">Documents</TableHead>
                    <TableHead className="text-zinc-300">Purchased</TableHead>
                    <TableHead className="text-zinc-300">Amount Paid</TableHead>
                    <TableHead className="text-zinc-300">Times Used</TableHead>
                    <TableHead className="text-zinc-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownedPacks.map(({ purchase, pack }) => {
                    if (!pack) return null;

                    return (
                      <TableRow
                        key={purchase._id}
                        className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50"
                      >
                        <TableCell className="font-medium text-zinc-100">
                          {pack.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize border-zinc-700 text-zinc-300">
                            {pack.jurisdiction}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-zinc-300">
                          {pack.packType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-zinc-300">{pack.documents.length}</TableCell>
                        <TableCell className="text-zinc-300">
                          {formatDate(purchase.purchaseDate)}
                        </TableCell>
                        <TableCell className="font-mono text-zinc-300">
                          {formatPrice(purchase.amountPaid)}
                        </TableCell>
                        <TableCell className="text-zinc-300">{purchase.timesUsed}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-600 text-white border-green-500">
                            {purchase.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pack Details Cards */}
      {ownedPacks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ownedPacks.map(({ purchase, pack }) => {
            if (!pack) return null;

            return (
              <Card key={purchase._id} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-zinc-100">{pack.name}</CardTitle>
                      <CardDescription className="mt-1 text-zinc-400">
                        {pack.description}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-600 text-white">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-zinc-300">
                      Included Documents:
                    </h4>
                    <div className="space-y-1">
                      {pack.documents.map((doc) => (
                        <div key={doc.name} className="flex items-center text-sm text-zinc-300">
                          <FileText className="w-4 h-4 text-blue-500 mr-2" />
                          <span>{doc.name}</span>
                          {doc.required && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs border-zinc-700 text-zinc-300"
                            >
                              Required
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-400">Purchased</p>
                      <p className="font-medium text-zinc-100">
                        {formatDate(purchase.purchaseDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Times Used</p>
                      <p className="font-medium text-zinc-100">{purchase.timesUsed}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Amount Paid</p>
                      <p className="font-medium text-zinc-100">
                        {formatPrice(purchase.amountPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Version</p>
                      <p className="font-medium text-zinc-100">v{purchase.packVersion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
