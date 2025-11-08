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
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getClient,
  deleteClient,
} from "@/lib/local-storage/local-clients-service";
import { getDealsByClient } from "@/lib/local-storage/local-deals-service";
import { getVehicle } from "@/lib/local-storage/local-vehicles-service";

export const Route = createFileRoute("/standalone/clients/$clientId")({
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

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["standalone-client", clientId],
    queryFn: async () => {
      const client = await getClient(clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      const deals = await getDealsByClient(clientId);
      const dealsWithVehicles = await Promise.all(
        deals.map(async (deal) => {
          const vehicle = await getVehicle(deal.vehicleId);
          return { ...deal, vehicle };
        })
      );

      return {
        client,
        deals: dealsWithVehicles,
      };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(clientId),
    onSuccess: () => {
      toast.success("Client deleted successfully");
      navigate({ to: "/standalone/clients" });
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

  if (isLoading) {
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

  if (!clientData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
          <Button
            onClick={() => navigate({ to: "/standalone/clients" })}
            className="mt-4"
          >
            Back to Clients
          </Button>
        </div>
      </Layout>
    );
  }

  const { client, deals } = clientData;
  const totalDeals = deals.length;
  const completedDeals = deals.filter((d) => d.status === "completed").length;
  const totalRevenue = deals.reduce((sum, deal) => sum + deal.totalAmount, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/standalone/clients" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                navigate({
                  to: "/standalone/deals/new/client",
                  search: { clientId: client.id },
                })
              }
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold">{totalDeals}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedDeals}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
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
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {client.firstName} {client.lastName}
                  </p>
                </div>
              </div>
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.driversLicense && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Driver's License</p>
                    <p className="font-medium">{client.driversLicense}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold">Address</h3>
            </div>
            {client.address || client.city || client.state ? (
              <div className="space-y-1">
                {client.address && <p className="font-medium">{client.address}</p>}
                {(client.city || client.state) && (
                  <p className="font-medium">
                    {client.city}
                    {client.city && client.state && ", "}
                    {client.state} {client.zipCode}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No address on file</p>
            )}
            <div className="mt-6 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Contact</p>
                <p className="font-medium">
                  {new Date(client.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Deal History</h3>
          </div>
          {deals.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals yet</h3>
              <p className="text-muted-foreground mb-4">
                Start a new deal with this client
              </p>
              <Button
                onClick={() =>
                  navigate({
                    to: "/standalone/deals/new/client",
                    search: { clientId: client.id },
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
                  <TableHead>Vehicle</TableHead>
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
