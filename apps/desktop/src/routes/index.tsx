// src/routes/index.tsx
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Upload,
  TrendingUp,
  History,
  Loader2,
  Search,
  Filter,
  Car,
  User,
  DollarSign,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, convexMutation } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import { useState } from "react";
import { toast } from "react-hot-toast";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (!context.auth?.isLoaded) return;
    if (!context.auth?.isSignedIn) {
      throw redirect({ to: "/login" });
    }
  },
  component: HomePage,
});

function HomePage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const firstName = user?.firstName || "there";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<any>(null);

  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => convexQuery(api.api.users.getCurrentUser, {}),
    enabled: !!user,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["deals", currentUser?.dealershipId],
    queryFn: async () => {
      if (!currentUser?.dealershipId) return { deals: [] };
      return await convexQuery(api.api.deals.getDeals, {
        dealershipId: currentUser.dealershipId,
      });
    },
    enabled: !!currentUser?.dealershipId,
  });

  const deleteDeal = useMutation({
    mutationFn: async (dealId: Id<"deals">) => {
      return await convexMutation(api.api.deals.deleteDeal, { dealId });
    },
    onSuccess: () => {
      toast.success("Deal deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setDeleteModalOpen(false);
      setDealToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete deal");
    },
  });

  const deals = Array.isArray(dealsData) ? dealsData : dealsData?.deals || [];

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = searchQuery
      ? deal.client?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.client?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.vehicle?.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal._id.includes(searchQuery)
      : true;

    const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedDeals = filteredDeals.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );

  const stats = {
    total: deals.length,
    pending: deals.filter((d) => d.status === "pending" || d.status === "draft").length,
    ready: deals.filter((d) => d.status === "READY_TO_SIGN" || d.status === "PENDING_SIGNATURE").length,
    completed: deals.filter((d) => d.status === "COMPLETED").length,
    totalValue: deals.reduce((sum, d) => sum + (d.totalAmount || d.saleAmount || 0), 0),
  };

  const isLoading = userLoading || dealsLoading;

  const handleDeleteClick = (deal: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDealToDelete(deal);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (dealToDelete) {
      deleteDeal.mutate(dealToDelete._id as Id<"deals">);
    }
  };

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle error loading current user
  if (userError) {
    return (
      <Layout>
        <div className="p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2 text-red-600">Error Loading User Data</h2>
              <p className="text-muted-foreground mb-4">
                There was an error loading your user information. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome Back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your deals overview for today
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Calendar className="h-8 w-8 text-amber-600/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ready</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.ready}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <FileText className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, VIN, or deal ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="READY_TO_SIGN">Ready to Sign</SelectItem>
                  <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Vehicle</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Value</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Updated</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDeals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8">
                        <div className="flex flex-col items-center">
                          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground">No deals found</p>
                          {searchQuery || statusFilter !== "all" ? (
                            <p className="text-sm text-muted-foreground mt-2">
                              Try adjusting your filters
                            </p>
                          ) : (
                            <Button 
                              className="mt-4" 
                              onClick={() => navigate({ to: "/deals/new" })}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create First Deal
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedDeals.slice(0, 10).map((deal) => (
                      <tr 
                        key={deal._id} 
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate({ 
                          to: "/deals/$dealsId/documents", 
                          params: { dealsId: deal._id } 
                        })}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {deal.client ? 
                                  `${deal.client.firstName} ${deal.client.lastName}` : 
                                  deal.clientName || "No Client"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {deal.clientEmail || deal.client?.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">
                                {deal.vehicle ? 
                                  `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}` :
                                  "No Vehicle"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {deal.vin || deal.vehicle?.vin || "No VIN"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">
                            ${(deal.totalAmount || deal.saleAmount || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={deal.status} />
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {getTimeAgo(deal.updatedAt || deal.createdAt)}
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ 
                                    to: "/deals/$dealsId/documents", 
                                    params: { dealsId: deal._id } 
                                  });
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ 
                                    to: "/deals/$dealsId/documents", 
                                    params: { dealsId: deal._id } 
                                  });
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Deal
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => handleDeleteClick(deal, e)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Deal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {sortedDeals.length > 10 && (
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate({ to: "/deals" })}
                >
                  View All {sortedDeals.length} Deals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
              {dealToDelete && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">
                    {dealToDelete.client ? 
                      `${dealToDelete.client.firstName} ${dealToDelete.client.lastName}` : 
                      "No Client"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Deal #{dealToDelete._id.slice(-6)}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteDeal.isPending}
            >
              {deleteDeal.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Deal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingDock navigate={navigate} />
    </Layout>
  );
}

function FloatingDock({ navigate }: { navigate: any }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background/95 backdrop-blur-lg border rounded-full shadow-lg p-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: "/deals/new" })}
          className="p-3 rounded-full hover:bg-accent transition-colors group relative"
        >
          <Plus className="h-5 w-5" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            New Deal
          </span>
        </button>
        <div className="w-px h-6 bg-border" />
        <button
          type="button"
          onClick={() => console.log("Upload document")}
          className="p-3 rounded-full hover:bg-accent transition-colors group relative"
        >
          <Upload className="h-5 w-5" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Upload Doc
          </span>
        </button>
        <button
          type="button"
          onClick={() => console.log("Create quote")}
          className="p-3 rounded-full hover:bg-accent transition-colors group relative"
        >
          <TrendingUp className="h-5 w-5" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Create Quote
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/deals" })}
          className="p-3 rounded-full hover:bg-accent transition-colors group relative"
        >
          <History className="h-5 w-5" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            View History
          </span>
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    draft: {
      label: "Draft",
      class: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    },
    pending: {
      label: "Pending",
      class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    PENDING_SIGNATURE: {
      label: "Pending Signature",
      class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    READY_TO_SIGN: {
      label: "Ready to Sign",
      class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    COMPLETED: {
      label: "Completed",
      class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
  };

  const { label, class: className } = config[status] || config.pending;

  return (
    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", className)}>
      {label}
    </span>
  );
}

function getTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return past.toLocaleDateString();
}