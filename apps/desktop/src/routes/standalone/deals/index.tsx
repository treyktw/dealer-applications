import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Download,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllDeals,
  deleteDeal,
  searchDeals,
  getDealsByStatus,
  getDealsStats,
  updateDeal,
} from "@/lib/local-storage/local-deals-service";
import { getClient } from "@/lib/local-storage/local-clients-service";
import { getVehicle } from "@/lib/local-storage/local-vehicles-service";
import type {
  LocalDeal,
  LocalClient,
  LocalVehicle,
} from "@/lib/local-storage/db";

export const Route = createFileRoute("/standalone/deals/")({
  component: DealsPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface DealWithDetails extends LocalDeal {
  client?: LocalClient;
  vehicle?: LocalVehicle;
}

function DealsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: deals, isLoading } = useQuery({
    queryKey: ["standalone-deals", searchQuery, statusFilter],
    queryFn: async () => {
      let dealsList: LocalDeal[] = [];

      if (searchQuery) {
        dealsList = await searchDeals(searchQuery);
      } else if (statusFilter !== "all") {
        dealsList = await getDealsByStatus(statusFilter);
      } else {
        dealsList = await getAllDeals();
      }

      const dealsWithDetails: DealWithDetails[] = await Promise.all(
        dealsList.map(async (deal) => {
          const client = await getClient(deal.clientId);
          const vehicle = await getVehicle(deal.vehicleId);
          return {
            ...deal,
            client,
            vehicle,
          };
        })
      );

      return dealsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["standalone-deals-stats"],
    queryFn: getDealsStats,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals-stats"] });
      toast.success("Deal deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete deal", {
        description: error.message,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDeal(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals-stats"] });
      toast.success("Deal status updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update deal status", {
        description: error.message,
      });
    },
  });

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this deal? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (dealId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: dealId, status: newStatus });
  };

  const handleExport = () => {
    if (!deals || deals.length === 0) {
      toast.error("No deals to export");
      return;
    }

    const csv = [
      [
        "Deal ID",
        "Type",
        "Status",
        "Client",
        "Vehicle",
        "Total Amount",
        "Sale Amount",
        "Created Date",
      ].join(","),
      ...deals.map((d) =>
        [
          d.id.slice(-8),
          d.type,
          d.status,
          d.client ? `${d.client.firstName} ${d.client.lastName}` : "N/A",
          d.vehicle
            ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}`
            : "N/A",
          d.totalAmount,
          d.saleAmount || 0,
          new Date(d.createdAt).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Deals exported to CSV");
  };

  const handleNewDeal = () => {
    console.log("🔵 [DEALS] handleNewDeal called");
    
    // Prevent multiple rapid clicks
    const now = Date.now();
    const lastClick = (window as { lastNewDealClick?: number }).lastNewDealClick;
    if (lastClick && now - lastClick < 500) {
      console.log("⚠️ [DEALS] Ignoring rapid click");
      return;
    }
    (window as { lastNewDealClick?: number }).lastNewDealClick = now;
    
    // Navigate directly to the first step of the wizard
    console.log("🔵 [DEALS] Navigating to /standalone/deals/new/client-vehicle");
    navigate({ to: "/standalone/deals/new/client-vehicle" });
  }

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

  const dealsList = deals || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Deals</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={handleNewDeal}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by deal ID, client, or vehicle..."
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

        {dealsList.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first deal"}
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealsList.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-mono text-xs">
                      #{deal.id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {deal.client
                        ? `${deal.client.firstName} ${deal.client.lastName}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {deal.vehicle
                        ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${statusColors[deal.status]} text-white hover:opacity-80`}
                          >
                            {statusLabels[deal.status] || deal.status}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(deal.id, "draft")}
                          >
                            Set as Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(deal.id, "pending")
                            }
                          >
                            Set as Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(deal.id, "in_progress")
                            }
                          >
                            Set as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(deal.id, "completed")
                            }
                          >
                            Set as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(deal.id, "cancelled")
                            }
                          >
                            Set as Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${deal.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({ to: `/standalone/deals/${deal.id}` })
                            }
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({
                                to: `/standalone/deals/${deal.id}/edit`,
                              })
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({
                                to: `/standalone/deals/${deal.id}/documents`,
                              })
                            }
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Docs
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(deal.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {dealsList.length > 0 && (
          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Draft</p>
                <p className="text-2xl font-bold">
                  {stats?.byStatus.draft || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold">
                  {stats?.byStatus.pending || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  In Progress
                </p>
                <p className="text-2xl font-bold">
                  {stats?.byStatus.in_progress || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.byStatus.completed || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.byStatus.cancelled || 0}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
