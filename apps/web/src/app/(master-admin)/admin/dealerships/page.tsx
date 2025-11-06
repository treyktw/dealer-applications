// apps/web/src/app/(admin)/dealerships/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, MoreVertical, Building2, TrendingUp, Database, Users } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function MasterAdminDealershipsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "suspended" | "deleted" | undefined>();

  // Fetch dealerships
  const dealerships = useQuery(api.masterAdmin.getAllDealerships, {
    searchQuery: searchQuery || undefined,
    status: statusFilter,
  });

  // Fetch platform stats
  const platformStats = useQuery(api.masterAdmin.getPlatformStats);

  // Mutations
  const toggleSuspension = useMutation(api.masterAdmin.toggleSuspension);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleToggleSuspension = async (dealershipId: Id<"dealerships">, suspend: boolean) => {
    try {
      await toggleSuspension({
        dealershipId,
        suspend,
        reason: suspend ? "Suspended by master admin" : undefined,
      });
      toast.success(suspend ? "Dealership suspended" : "Dealership restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update dealership");
    }
  };

  if (dealerships === undefined || platformStats === undefined) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading dealerships...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Dealership Management</h1>
        <p className="text-zinc-400 mt-1">
          Manage all dealerships, monitor usage, and control services
        </p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Dealerships</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {platformStats.dealerships.total}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {platformStats.dealerships.active} active
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Inventory</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {platformStats.inventory.total.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {Math.round(platformStats.inventory.averagePerDealership)} avg/dealer
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Storage</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {formatBytes(platformStats.storage.totalUsed)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatBytes(platformStats.storage.totalLimit)} limit
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Users</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {platformStats.users.total.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {Math.round(platformStats.users.averagePerDealership)} avg/dealer
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? undefined : value as "active" | "suspended" | "deleted")
              }
            >
              <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-zinc-100">All Statuses</SelectItem>
                <SelectItem value="active" className="text-zinc-100">Active</SelectItem>
                <SelectItem value="suspended" className="text-zinc-100">Suspended</SelectItem>
                <SelectItem value="deleted" className="text-zinc-100">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dealerships Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Dealerships</CardTitle>
          <CardDescription className="text-zinc-400">
            {dealerships.length} dealership{dealerships.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dealerships.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">
                No dealerships found
              </h3>
              <p className="text-zinc-500">
                {searchQuery || statusFilter
                  ? "Try adjusting your filters"
                  : "No dealerships have been created yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableHead className="text-zinc-400">Dealership</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Inventory</TableHead>
                    <TableHead className="text-zinc-400">Clients</TableHead>
                    <TableHead className="text-zinc-400">Deals</TableHead>
                    <TableHead className="text-zinc-400">Storage</TableHead>
                    <TableHead className="text-zinc-400">Subscription</TableHead>
                    <TableHead className="text-zinc-400">Created</TableHead>
                    <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealerships.map((dealership) => (
                    <TableRow
                      key={dealership._id}
                      className="border-zinc-800 hover:bg-zinc-800/50 cursor-pointer"
                      onClick={() => router.push(`/admin/dealerships/${dealership._id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-zinc-100">{dealership.name}</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {dealership._id}
                          </p>
                          {dealership.contactEmail && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {dealership.contactEmail || dealership.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {dealership.isDeleted ? (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                            Deleted
                          </Badge>
                        ) : dealership.isSuspended ? (
                          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {dealership.analytics.vehicleCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {dealership.analytics.clientCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {dealership.analytics.dealCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm text-zinc-300">
                            {formatBytes(dealership.analytics.storageUsage)}
                          </p>
                          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                dealership.analytics.storagePercentage > 90
                                  ? "bg-red-500"
                                  : dealership.analytics.storagePercentage > 75
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                              }`}
                              style={{
                                width: `${Math.min(100, dealership.analytics.storagePercentage)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dealership.subscription ? (
                          <Badge
                            variant="outline"
                            className={`${
                              dealership.subscription.status === "active"
                                ? "border-green-500/20 text-green-500"
                                : "border-zinc-700 text-zinc-400"
                            }`}
                          >
                            {dealership.subscription.plan}
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-500">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(dealership.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/dealerships/${dealership._id}`);
                              }}
                              className="text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-700" />
                            {!dealership.isDeleted && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSuspension(dealership._id, !dealership.isSuspended);
                                }}
                                className="text-zinc-100 focus:bg-zinc-700 focus:text-zinc-100"
                              >
                                {dealership.isSuspended ? "Resume Services" : "Suspend Services"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
