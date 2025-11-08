import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Car,
  DollarSign,
  Gauge,
  Calendar,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getVehicle,
  deleteVehicle,
} from "@/lib/local-storage/local-vehicles-service";
import { getDealsByVehicle } from "@/lib/local-storage/local-deals-service";
import { getClient } from "@/lib/local-storage/local-clients-service";

export const Route = createFileRoute("/standalone/vehicles/$vehicleId")({
  component: VehicleDetailPage,
});

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  sold: "bg-blue-500",
  pending: "bg-yellow-500",
  reserved: "bg-purple-500",
  unavailable: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  sold: "Sold",
  pending: "Pending",
  reserved: "Reserved",
  unavailable: "Unavailable",
};

const dealStatusColors: Record<string, string> = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const dealStatusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function VehicleDetailPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: vehicleData, isLoading } = useQuery({
    queryKey: ["standalone-vehicle", vehicleId],
    queryFn: async () => {
      const vehicle = await getVehicle(vehicleId);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }

      const deals = await getDealsByVehicle(vehicleId);
      const dealsWithClients = await Promise.all(
        deals.map(async (deal) => {
          const client = await getClient(deal.clientId);
          return { ...deal, client };
        })
      );

      return {
        vehicle,
        deals: dealsWithClients,
      };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(vehicleId),
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
      navigate({ to: "/standalone/vehicles" });
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

  if (isLoading) {
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

  if (!vehicleData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Vehicle not found</p>
          <Button
            onClick={() => navigate({ to: "/standalone/vehicles" })}
            className="mt-4"
          >
            Back to Vehicles
          </Button>
        </div>
      </Layout>
    );
  }

  const { vehicle, deals } = vehicleData;
  const completedDeal = deals.find((d) => d.status === "completed");
  const activeDeal = deals.find(
    (d) => d.status === "pending" || d.status === "in_progress"
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/standalone/vehicles" })}
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[vehicle.status]}>
              {statusLabels[vehicle.status] || vehicle.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Vehicle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-2xl font-bold">${vehicle.price.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gauge className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mileage</p>
                <p className="text-2xl font-bold">
                  {vehicle.mileage.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Related Deals</p>
                <p className="text-2xl font-bold">{deals.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Car className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-bold capitalize">{vehicle.status}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Vehicle Details</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Year:</span>
                <span className="font-medium">{vehicle.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Make:</span>
                <span className="font-medium">{vehicle.make}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Model:</span>
                <span className="font-medium">{vehicle.model}</span>
              </div>
              {vehicle.trim && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Trim:</span>
                  <span className="font-medium">{vehicle.trim}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">VIN:</span>
                <span className="font-medium font-mono text-xs">{vehicle.vin}</span>
              </div>
              {vehicle.stockNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Stock #:</span>
                  <span className="font-medium">{vehicle.stockNumber}</span>
                </div>
              )}
              {vehicle.color && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  <span className="font-medium">{vehicle.color}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold">Pricing Information</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sale Price:</span>
                <span className="font-medium text-lg">
                  ${vehicle.price.toLocaleString()}
                </span>
              </div>
              {vehicle.cost && vehicle.cost > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cost:</span>
                    <span className="font-medium">
                      ${vehicle.cost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Potential Profit:
                    </span>
                    <span className="font-medium text-green-600">
                      ${(vehicle.price - vehicle.cost).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className={statusColors[vehicle.status]}>
                  {statusLabels[vehicle.status]}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Added:</span>
                <span className="text-sm">
                  {new Date(vehicle.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {vehicle.description && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Description</h3>
            </div>
            <p className="text-muted-foreground">{vehicle.description}</p>
          </Card>
        )}

        <Card>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Deal History</h3>
          </div>
          {deals.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals yet</h3>
              <p className="text-muted-foreground mb-4">
                Start a new deal with this vehicle
              </p>
              <Button
                onClick={() =>
                  navigate({
                    to: "/standalone/deals/new/vehicle",
                    search: { vehicleId: vehicle.id },
                  })
                }
              >
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
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-mono text-xs">
                      #{deal.id.slice(-8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {deal.client
                        ? `${deal.client.firstName} ${deal.client.lastName}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge className={dealStatusColors[deal.status]}>
                        {dealStatusLabels[deal.status] || deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${deal.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate({ to: `/standalone/deals/${deal.id}` })
                        }
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
      </div>
    </Layout>
  );
}
