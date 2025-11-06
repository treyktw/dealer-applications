// app/(dashboard)/deals/_components/DealsTable.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Card,
  CardContent,
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
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Search,
  Filter,
  FileText,

  MoreHorizontal,
  Eye,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DealStatusBadge } from "@/components/shared/StatusBadge";
import { dealStatusOptions } from "@/lib/status-utils";

// Extended Deal type with relations
interface DealWithRelations extends Doc<"deals"> {
  client?: Doc<"clients"> | null;
  vehicle?: Doc<"vehicles"> | null;
}

export function DealsTable() {
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<DealWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get current user for dealershipId
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;

  // Get subscription status with limits for logging
  const subscriptionStatus = useQuery(
    api.subscriptions.getSubscriptionStatusWithLimits,
    dealershipId ? { dealershipId } : "skip"
  );

  // Log subscription status
  React.useEffect(() => {
    if (subscriptionStatus) {
      console.log("📊 Subscription Status:", {
        plan: subscriptionStatus.plan,
        hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
        limits: subscriptionStatus.limits,
        usage: subscriptionStatus.usage,
        subscription: subscriptionStatus.subscription,
      });
    }
  }, [subscriptionStatus]);

  const router = useRouter();

  // Fetch deals from Convex
  const dealsData = useQuery(
    api.deals.getDeals,
    dealershipId
      ? { 
          dealershipId, 
          status: statusFilter !== "all" ? statusFilter : undefined, 
          search: searchQuery 
        }
      : "skip"
  );

  // Delete deal mutation
  const deleteDeal = useMutation(api.deals.deleteDeal);

  const isLoading = dealsData === undefined;

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle delete deal
  const handleDeleteDeal = async () => {
    if (!dealToDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await deleteDeal({ dealId: dealToDelete._id });
      setDeleteDialogOpen(false);
      setDealToDelete(null);
      toast.success("Deal deleted successfully", {
        description: `Deal #${String(dealToDelete._id).substring(0, 8)} has been permanently deleted.`,
        duration: 5000,
      });
    } catch (error) {
      console.error("Failed to delete deal:", error);
      toast.error("Failed to delete deal", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        duration: 7000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (deal: DealWithRelations, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setDealToDelete(deal);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle subscription requirement gracefully
  if (dealsData?.subscriptionRequired) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-center space-y-2 max-w-md">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Subscription Required</h3>
          <p className="text-sm text-muted-foreground">
            {dealsData.subscriptionError || "Premium subscription with deals management is required to access this feature."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/settings/billing">
              Upgrade Subscription
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const deals = dealsData?.deals || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 justify-between items-start sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Manage your vehicle sales and documents
          </p>
        </div>
        <Button asChild>
          <Link href="/deals/new">
            <Plus className="mr-2 w-4 h-4" />
            New Deal
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-9"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 w-4 h-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {dealStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notion-Style Table */}
      <Card>
        <CardContent className="p-0">
          {deals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">Deal ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal: DealWithRelations) => {
                  const client = deal.client;
                  const vehicle = deal.vehicle;

                  return (
                    <TableRow 
                      key={deal._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/deals/${deal._id}`)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        #{String(deal._id).substring(0, 8)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {client
                              ? `${client.firstName} ${client.lastName}`
                              : "Unknown Client"}
                          </span>
                          {client?.email && (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {client.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {vehicle
                              ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                              : "Unknown Vehicle"}
                          </span>
                          {vehicle?.vin && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {vehicle.vin.substring(0, 10)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="font-semibold text-right">
                        {formatCurrency(deal.saleAmount || 0)}
                      </TableCell>
                      
                      <TableCell>
                        <DealStatusBadge status={deal.status || "DRAFT"} />
                      </TableCell>
                      
                      <TableCell className="text-muted-foreground">
                        {formatDate(new Date(deal.createdAt))}
                      </TableCell>
                      
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/deals/${deal._id}`} className="cursor-pointer">
                                <Eye className="mr-2 w-4 h-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer text-destructive"
                              onClick={(e) => handleDeleteClick(deal, e)}
                            >
                              <Trash2 className="mr-2 w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col justify-center items-center py-12">
              <FileText className="mb-4 w-12 h-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No deals found</h3>
              {searchQuery || statusFilter !== "all" ? (
                <span className="mb-4 text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </span>
              ) : (
                <span className="mb-4 text-sm text-muted-foreground">
                  Create your first deal from a client
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Stats */}
      {deals.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{deals.length}</span> deal{deals.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
              {dealToDelete && (
                <div className="p-3 mt-2 rounded-md bg-muted">
                  <span className="font-medium">
                    Deal #{String(dealToDelete._id).substring(0, 8)}
                  </span>
                  {dealToDelete.client && (
                    <div className="text-sm text-muted-foreground">
                      Client: {dealToDelete.client.firstName} {dealToDelete.client.lastName}
                    </div>
                  )}
                  {dealToDelete.vehicle && (
                    <div className="text-sm text-muted-foreground">
                      Vehicle: {dealToDelete.vehicle.year} {dealToDelete.vehicle.make} {dealToDelete.vehicle.model}
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeal}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Deal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}