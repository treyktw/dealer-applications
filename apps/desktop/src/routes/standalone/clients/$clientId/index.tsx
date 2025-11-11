import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getClient, deleteClient } from "@/lib/sqlite/local-clients-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { getDealsByClient } from "@/lib/sqlite/local-deals-service";
import { getVehicle } from "@/lib/sqlite/local-vehicles-service";
import type { LocalDeal } from "@/lib/sqlite/local-deals-service";

export const Route = createFileRoute("/standalone/clients/$clientId/")({
  component: ClientDetailPage,
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

interface DealWithVehicle extends LocalDeal {
  vehicle?: {
    year: number;
    make: string;
    model: string;
    vin: string;
  };
}

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();

  const auth = useUnifiedAuth();
  
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["standalone-client", clientId, auth.user?.id],
    queryFn: () => {
      if (!auth.user?.id) throw new Error("User ID is required");
      return getClient(clientId, auth.user.id);
    },
    enabled: !!auth.user?.id,
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["standalone-client-deals", clientId],
    queryFn: async () => {
      const clientDeals = await getDealsByClient(clientId);
      // Enrich deals with vehicle information
      const dealsWithVehicles: DealWithVehicle[] = await Promise.all(
        clientDeals.map(async (deal) => {
          const vehicle = await getVehicle(deal.vehicle_id);
          return {
            ...deal,
            vehicle: vehicle
              ? {
                  year: vehicle.year,
                  make: vehicle.make,
                  model: vehicle.model,
                  vin: vehicle.vin,
                }
              : undefined,
          };
        })
      );
      return dealsWithVehicles.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!client,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(clientId),
    onSuccess: () => {
      toast.success("Client deleted successfully");
      navigate({ to: "/standalone/deals" });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete client", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this client? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate();
    }
  };

  if (clientLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading client...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
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
                {client.first_name} {client.last_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Client ID: {clientId.slice(-8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Client
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Contact Information</h3>
            </div>
            <div className="space-y-4">
              {client.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              {(client.address || client.city || client.state) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {client.address && <>{client.address}<br /></>}
                      {client.city && client.state && (
                        <>
                          {client.city}, {client.state} {client.zip_code || ""}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {client.drivers_license && (
                <div>
                  <p className="text-sm text-muted-foreground">Driver's License</p>
                  <p className="font-medium font-mono text-sm">{client.drivers_license}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
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
                  {new Date(client.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">
                  {new Date(client.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
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
                    {deal.vehicle && (
                      <p className="text-sm text-muted-foreground">
                        {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
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
              No deals found for this client
            </p>
          )}
        </Card>
      </div>
    </Layout>
  );
}

