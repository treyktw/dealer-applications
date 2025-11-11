import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Users, Car, DollarSign, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getDealsStats,
  getRecentDeals,
} from "@/lib/sqlite/local-deals-service";
import { getAllClients } from "@/lib/sqlite/local-clients-service";
import { getVehiclesStats } from "@/lib/sqlite/local-vehicles-service";
import { getClient } from "@/lib/sqlite/local-clients-service";
import { getVehicle } from "@/lib/sqlite/local-vehicles-service";
import type { LocalDeal } from "@/lib/sqlite/local-deals-service";
import type { LocalClient } from "@/lib/sqlite/local-clients-service";
import type { LocalVehicle } from "@/lib/sqlite/local-vehicles-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";

export const Route = createFileRoute("/standalone/")({
  component: StandaloneDashboard,
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

function StandaloneDashboard() {
  const navigate = useNavigate();
  const auth = useUnifiedAuth();

  const { data: dealsStats, error: dealsStatsError } = useQuery({
    queryKey: ["standalone-deals-stats", auth.user?.id],
    queryFn: () => getDealsStats(auth.user?.id),
    enabled: !!auth.user?.id,
  });

  const { data: recentDeals, error: recentDealsError } = useQuery({
    queryKey: ["standalone-recent-deals", auth.user?.id],
    queryFn: async () => {
      if (!auth.user?.id) return [];
      const userId = auth.user.id;
      const deals = await getRecentDeals(10, userId);
      const dealsWithDetails: DealWithDetails[] = await Promise.all(
        deals.map(async (deal) => {
          const client = await getClient(deal.client_id, userId);
          
          const vehicle = await getVehicle(deal.vehicle_id);
          return {
            ...deal,
            client,
            vehicle,
          };
        })
      );
      return dealsWithDetails;
    },
  });

  const { data: clientsCount, error: clientsCountError } = useQuery({
    queryKey: ["standalone-clients-count", auth.user?.id],
    queryFn: async () => {
      const clients = await getAllClients(auth.user?.id);
      return clients.length;
    },
    enabled: !!auth.user?.id,
  });

  const { data: vehiclesStats, error: vehiclesStatsError } = useQuery({
    queryKey: ["standalone-vehicles-stats", auth.user?.id],
    queryFn: () => getVehiclesStats(auth.user?.id),
    enabled: !!auth.user?.id,
  });

  const hasError = dealsStatsError || recentDealsError || clientsCountError || vehiclesStatsError;

  const totalRevenue = dealsStats?.totalAmount || 0;
  const averageDealSize = dealsStats?.averageAmount || 0;
  const completedDeals = dealsStats?.byStatus.completed || 0;
  const activeDeals = (dealsStats?.byStatus.pending || 0) + (dealsStats?.byStatus.in_progress || 0);

  if (hasError) {
    console.error("❌ [DASHBOARD] Error loading data:", {
      dealsStatsError,
      recentDealsError,
      clientsCountError,
      vehiclesStatsError,
    });
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
          <Link to="/standalone/deals" params={{ action: "new" }} className="gap-2 flex flex-row items-center justify-center bg-accent text-accent-foreground px-4 py-2 rounded-md">
            <Plus className="h-4 w-4" />
            New Deal
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  ${totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From {dealsStats?.total || 0} deals
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Deals</p>
                <p className="text-3xl font-bold mt-2">{activeDeals}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedDeals} completed
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold mt-2">{clientsCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Active relationships
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                <p className="text-3xl font-bold mt-2">
                  ${(vehiclesStats?.totalValue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {vehiclesStats?.total || 0} vehicles
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Deal Status Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="font-semibold">{dealsStats?.byStatus.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <span className="font-semibold">{dealsStats?.byStatus.in_progress || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-semibold">{completedDeals}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-sm">Draft</span>
                </div>
                <span className="font-semibold">{dealsStats?.byStatus.draft || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Deal Size</span>
                <span className="font-semibold">${Math.round(averageDealSize).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Vehicles</span>
                <span className="font-semibold">{vehiclesStats?.byStatus.available || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Vehicle Price</span>
                <span className="font-semibold">
                  ${Math.round(vehiclesStats?.averagePrice || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Deals</span>
                <span className="font-semibold">{dealsStats?.total || 0}</span>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Deals</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/standalone/deals" })}
                className="gap-2"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!recentDeals || recentDeals.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first deal
              </p>
              <Button onClick={() => navigate({ to: "/standalone/deals/new" })}>
                <Plus className="h-4 w-4 mr-2" />
                Create Deal
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-mono text-xs">
                      #{deal.id.slice(-8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {deal.client
                        ? `${deal.client.first_name} ${deal.client.last_name}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {deal.vehicle
                        ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[deal.status]}>
                        {statusLabels[deal.status] || deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${deal.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(deal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: `/standalone/deals/${deal.id}` })}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate({ to: "/standalone/deals" })}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Manage Deals</h3>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            View, edit, and manage all your deals
          </p>
        </Card>
      </div>
    </Layout>
  );
}
