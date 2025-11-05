// apps/web/src/app/(admin)/document-packs/page.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
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
import { toast } from "sonner";
import { useId, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, DollarSign, Package, Users } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function DocumentPacksPage() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);

  const filterToggleId = useId();

  // Fetch all packs
  const packs = useQuery(api.documentPackTemplates.listAll, {
    includeInactive: showInactive,
  });

  const deletePack = useMutation(api.documentPackTemplates.deletePack);

  const handleDelete = async (packId: Id<"document_pack_templates">) => {
    try {
      const result = await deletePack({ packId });
      toast.success(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete pack"
      );
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (packs === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading document packs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Document Packs</h1>
          <p className="text-zinc-600 mt-1">
            Manage document pack templates for dealers to purchase
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/document-packs/new")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Pack
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packs</CardTitle>
            <Package className="h-4 w-4 text-zinc-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packs.length}</div>
            <p className="text-xs text-zinc-600 mt-1">
              {packs.filter((p) => p.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(
                packs.reduce((sum, p) => sum + p.totalRevenue, 0)
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchases
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packs.reduce((sum, p) => sum + p.totalPurchases, 0)}
            </div>
            <p className="text-xs text-zinc-600 mt-1">Across all packs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={filterToggleId}
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="showInactive" className="text-sm text-zinc-700">
          Show inactive packs
        </label>
      </div>

      {/* Packs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Document Packs</CardTitle>
          <CardDescription>
            Manage templates that dealers can purchase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-100 mb-2">
                No document packs yet
              </h3>
              <p className="text-zinc-600 mb-4">
                Create your first document pack to get started
              </p>
              <Button
                onClick={() => router.push("/admin/document-packs/new")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pack
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Purchases</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((pack) => (
                  <TableRow key={pack._id}>
                    <TableCell className="font-medium">{pack.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {pack.jurisdiction}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {pack.packType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatPrice(pack.price)}
                    </TableCell>
                    <TableCell>{pack.documents.length}</TableCell>
                    <TableCell>{pack.totalPurchases}</TableCell>
                    <TableCell className="font-mono">
                      {formatPrice(pack.totalRevenue)}
                    </TableCell>
                    <TableCell>
                      {pack.isActive ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-100 text-zinc-800 border-zinc-300">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/admin/document-packs/${pack._id}`
                              )
                            }
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/admin/document-packs/${pack._id}/edit`
                              )
                            }
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(pack._id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
