// src/routes/deals.tsx - Fixed with proper data fetching
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Eye, Trash2, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/deals/")({
  component: DealsPage,
});

// Status badge colors
const statusColors = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function DealsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch deals using the same pattern as subscription page
  const { data: dealsData, isLoading } = useQuery({
    queryKey: ["deals", user?.dealershipId, statusFilter, searchQuery],
    queryFn: async () => {
      if (!user?.dealershipId) {
        throw new Error("User not associated with a dealership");
      }

      if (!token) {
        throw new Error("No authentication token found");
      }

      return await convexClient.query(api.api.deals.getDeals, {
        dealershipId: user.dealershipId,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery || undefined,
        token: token,
      });
    },
    enabled: !!user?.dealershipId && !!token,
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: Id<"deals">) => {
      if (!token) {
        throw new Error("No authentication token found");
      }

      return await convexClient.mutation(api.api.deals.deleteDeal, {
        dealId,
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete deal", {
        description: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading deals...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle subscription requirement gracefully
  if (dealsData?.subscriptionRequired) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Premium Subscription Required</h2>
            <p className="text-muted-foreground mb-6">
              {dealsData.subscriptionError || "Deal management is a premium feature. Please upgrade your subscription to access deals."}
            </p>
            <Button onClick={() => navigate({ to: "/subscription" })}>
              View Subscription
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  // Type definition for deals
  type Deal = {
    id: string;
    type: string;
    status: string;
    totalAmount?: number;
    saleAmount?: number;
    createdAt: number;
    updatedAt?: number;
    client?: {
      _id: string;
      firstName: string;
      lastName: string;
    } | null;
    vehicle?: {
      year: number;
      make: string;
      model: string;
    } | null;
    vin?: string;
  };

  const deals: Deal[] = dealsData?.deals || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your deals
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: "/deals/new" })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Deals List */}
        {deals.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first deal"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => navigate({ to: "/deals/new" })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Deal
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deals.map((deal) => (
              <Card key={deal.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        Deal #{deal.id.slice(-8)}
                      </h3>
                      <Badge
                        className={statusColors[deal.status as keyof typeof statusColors]}
                      >
                        {statusLabels[deal.status as keyof typeof statusLabels] || deal.status}
                      </Badge>
                      <Badge variant="outline">{deal.type}</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Client</p>
                        <p className="font-medium">
                          {deal.client
                            ? `${deal.client.firstName} ${deal.client.lastName}`
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium">
                          {deal.vehicle
                            ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">VIN</p>
                        <p className="font-medium font-mono text-xs">
                          {deal.vin || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {new Date(deal.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate({ to: `/deals/${deal.id}` })}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteDealMutation.mutate(deal.id as Id<"deals">)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}