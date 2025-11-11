import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Car,
  Calendar,
  FileText,
  Gauge,
  Palette,
  Hash,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getVehicle, deleteVehicle } from "@/lib/sqlite/local-vehicles-service";
import { getDealsByVehicle } from "@/lib/sqlite/local-deals-service";
import { getClient } from "@/lib/sqlite/local-clients-service";
import type { LocalDeal } from "@/lib/sqlite/local-deals-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";

export const Route = createFileRoute("/standalone/vehicles/$vehicleId/")({
  component: VehicleDetailPage,
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

interface DealWithClient extends LocalDeal {
  client?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
}

function VehicleDetailPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const auth = useUnifiedAuth();

  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ["standalone-vehicle", vehicleId],
    queryFn: () => getVehicle(vehicleId),
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["standalone-vehicle-deals", vehicleId],
    queryFn: async () => {
      const vehicleDeals = await getDealsByVehicle(vehicleId);
      // Enrich deals with client information
      const dealsWithClients: DealWithClient[] = await Promise.all(
        vehicleDeals.map(async (deal) => {
          const client = await getClient(deal.client_id, auth.user?.id);
          return {
            ...deal,
            client: client
              ? {
                  firstName: client.first_name,
                  lastName: client.last_name,
                  email: client.email,
                }
              : undefined,
          };
        })
      );
      return dealsWithClients.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!vehicle,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(vehicleId),
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
      navigate({ to: "/standalone/deals" });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete vehicle", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this vehicle? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate();
    }
  };

  if (vehicleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading vehicle...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!vehicle) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Vehicle not found</p>
          <Button
            onClick={() => navigate({ to: "/standalone/deals" })}
            className="mt-4"
          >
            Back to Deals
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/standalone/deals" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.trim && (
                <p className="text-muted-foreground mt-1">{vehicle.trim}</p>
              )}
              <p className="text-muted-foreground text-sm mt-1">
                Vehicle ID: {vehicleId.slice(-8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {vehicle.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Vehicle
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Car className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold">Vehicle Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">VIN</p>
                <p className="font-medium font-mono text-sm">{vehicle.vin}</p>
              </div>
              {vehicle.stock_number && (
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Number</p>
                    <p className="font-medium">{vehicle.stock_number}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Gauge className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-medium">{vehicle.mileage.toLocaleString()} mi</p>
                </div>
              </div>
              {vehicle.color && (
                <div className="flex items-start gap-3">
                  <Palette className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                </div>
              )}
              {vehicle.body && (
                <div>
                  <p className="text-sm text-muted-foreground">Body Type</p>
                  <p className="font-medium capitalize">{vehicle.body}</p>
                </div>
              )}
              {vehicle.doors && (
                <div>
                  <p className="text-sm text-muted-foreground">Doors</p>
                  <p className="font-medium">{vehicle.doors}</p>
                </div>
              )}
              {vehicle.transmission && (
                <div>
                  <p className="text-sm text-muted-foreground">Transmission</p>
                  <p className="font-medium capitalize">{vehicle.transmission}</p>
                </div>
              )}
              {vehicle.engine && (
                <div>
                  <p className="text-sm text-muted-foreground">Engine</p>
                  <p className="font-medium">{vehicle.engine}</p>
                </div>
              )}
              {vehicle.cylinders && (
                <div>
                  <p className="text-sm text-muted-foreground">Cylinders</p>
                  <p className="font-medium">{vehicle.cylinders}</p>
                </div>
              )}
              {vehicle.title_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Title Number</p>
                  <p className="font-medium font-mono text-sm">{vehicle.title_number}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold">Pricing</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Price:</span>
                <span className="font-semibold">
                  ${vehicle.price.toLocaleString()}
                </span>
              </div>
              {vehicle.cost && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost:</span>
                  <span className="font-medium">
                    ${vehicle.cost.toLocaleString()}
                  </span>
                </div>
              )}
              {vehicle.cost && (
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-sm font-medium">Profit:</span>
                  <span className="font-semibold text-green-600">
                    ${(vehicle.price - vehicle.cost).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-semibold">Timeline</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {new Date(vehicle.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">
                    {new Date(vehicle.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {vehicle.description && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Description</h3>
            <p className="text-muted-foreground">{vehicle.description}</p>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold">Deals</h3>
          </div>
          {dealsLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading deals...</p>
            </div>
          ) : deals && deals.length > 0 ? (
            <div className="space-y-3">
              {deals.map((deal) => (
                <button
                  type="button"
                  key={deal.id}
                  className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left"
                  onClick={() => navigate({ to: `/standalone/deals/${deal.id}` })}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Deal #{deal.id.slice(-8)}</span>
                      <Badge className={statusColors[deal.status]}>
                        {statusLabels[deal.status] || deal.status}
                      </Badge>
                    </div>
                    {deal.client && (
                      <p className="text-sm text-muted-foreground">
                        {deal.client.firstName} {deal.client.lastName}
                        {deal.client.email && ` • ${deal.client.email}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${deal.total_amount.toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No deals found for this vehicle
            </p>
          )}
        </Card>
      </div>
    </Layout>
  );
}
