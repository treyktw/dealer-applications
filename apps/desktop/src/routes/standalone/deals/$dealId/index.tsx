import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  User,
  Car,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDeal,
  deleteDeal,
  updateDeal,
} from "@/lib/local-storage/local-deals-service";
import { getClient } from "@/lib/local-storage/local-clients-service";
import { getVehicle } from "@/lib/local-storage/local-vehicles-service";

export const Route = createFileRoute("/standalone/deals/$dealId/")({
  component: DealDetailPage,
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

function DealDetailPage() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dealData, isLoading } = useQuery({
    queryKey: ["standalone-deal", dealId],
    queryFn: async () => {
      const deal = await getDeal(dealId);
      if (!deal) {
        throw new Error("Deal not found");
      }

      const client = await getClient(deal.clientId);
      const vehicle = await getVehicle(deal.vehicleId);

      return {
        deal,
        client,
        vehicle,
      };
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateDeal(dealId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      toast.success("Deal status updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update deal status", {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeal(dealId),
    onSuccess: () => {
      toast.success("Deal deleted successfully");
      navigate({ to: "/standalone/deals" });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete deal", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this deal? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading deal...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!dealData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found</p>
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

  const { deal, client, vehicle } = dealData;

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
              <h1 className="text-3xl font-bold">Deal #{dealId.slice(-8)}</h1>
              <p className="text-muted-foreground mt-1">
                Created {new Date(deal.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`${statusColors[deal.status]} text-white`}
                >
                  {statusLabels[deal.status] || deal.status}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("draft")}>
                  Set as Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("pending")}>
                  Set as Pending
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateStatusMutation.mutate("in_progress")}
                >
                  Set as In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("completed")}>
                  Set as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("cancelled")}>
                  Set as Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigate({ to: `/standalone/deals/${dealId}/documents` })
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Deal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Client Information</h3>
            </div>
            {client ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {client.firstName} {client.lastName}
                  </p>
                </div>
                {client.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
                {client.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {client.address}
                      {client.city && client.state && (
                        <>
                          <br />
                          {client.city}, {client.state} {client.zipCode}
                        </>
                      )}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate({ to: `/standalone/clients/${client.id}` })}
                >
                  View Client Details
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">Client not found</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Car className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold">Vehicle Information</h3>
            </div>
            {vehicle ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  {vehicle.trim && (
                    <p className="text-sm text-muted-foreground">{vehicle.trim}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">VIN</p>
                  <p className="font-medium font-mono text-sm">{vehicle.vin}</p>
                </div>
                {vehicle.stockNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Number</p>
                    <p className="font-medium">{vehicle.stockNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-medium">{vehicle.mileage.toLocaleString()} mi</p>
                </div>
                {vehicle.color && (
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate({ to: `/standalone/vehicles/${vehicle.id}` })}
                >
                  View Vehicle Details
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">Vehicle not found</p>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold">Financial Details</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deal Type:</span>
                <Badge variant="outline">{deal.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sale Amount:</span>
                <span className="font-medium">
                  ${(deal.saleAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sales Tax:</span>
                <span className="font-medium">
                  ${(deal.salesTax || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Doc Fee:</span>
                <span className="font-medium">
                  ${(deal.docFee || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {deal.tradeInValue ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Trade-In Value:</span>
                  <span className="font-medium text-red-600">
                    -${deal.tradeInValue.toLocaleString()}
                  </span>
                </div>
              ) : null}
              {deal.downPayment ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Down Payment:</span>
                  <span className="font-medium">
                    ${deal.downPayment.toLocaleString()}
                  </span>
                </div>
              ) : null}
              {deal.financedAmount ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount Financed:</span>
                  <span className="font-medium text-primary">
                    ${deal.financedAmount.toLocaleString()}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-xl font-bold">
                  ${deal.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
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
                {new Date(deal.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="font-medium">
                {new Date(deal.updatedAt).toLocaleString()}
              </span>
            </div>
            {deal.saleDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sale Date:</span>
                <span className="font-medium">
                  {new Date(deal.saleDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: `/standalone/deals/${dealId}/documents` })}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Documents
          </Button>
        </div>
      </div>
    </Layout>
  );
}
