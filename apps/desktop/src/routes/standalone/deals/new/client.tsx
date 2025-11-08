import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Check } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllClients,
  createClient,
  searchClients,
} from "@/lib/local-storage/local-clients-service";
import type { LocalClient } from "@/lib/local-storage/db";
import { useWizard } from "./index";

export const Route = createFileRoute("/standalone/deals/new/client")({
  component: ClientStep,
});

function ClientStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formData, updateFormData, setCurrentStep } = useWizard();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(formData.clientId);

  const [newClientData, setNewClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    driversLicense: "",
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["standalone-clients", searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        return await searchClients(searchQuery);
      }
      return await getAllClients();
    },
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["standalone-clients"] });
      toast.success("Client created successfully");
      setIsAddDialogOpen(false);
      setSelectedClientId(newClient.id);
      updateFormData({
        clientId: newClient.id,
        selectedClient: newClient,
      });
      resetNewClientForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to create client", {
        description: error.message,
      });
    },
  });

  const resetNewClientForm = () => {
    setNewClientData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      driversLicense: "",
    });
  };

  const handleSelectClient = (client: LocalClient) => {
    setSelectedClientId(client.id);
    updateFormData({
      clientId: client.id,
      selectedClient: client,
    });
  };

  const handleNext = () => {
    if (!selectedClientId) {
      toast.error("Please select a client to continue");
      return;
    }
    setCurrentStep(2);
    navigate({ to: "/standalone/deals/new/vehicle" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newClientData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading clients...</p>
        </div>
      </div>
    );
  }

  const clientsList = clients || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Select or Add Client</h2>
        <p className="text-muted-foreground">
          Choose an existing client or create a new one for this deal
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Client
        </Button>
      </div>

      {clientsList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No clients found" : "No clients yet"}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Client
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsList.map((client) => (
                <TableRow
                  key={client.id}
                  className={`cursor-pointer ${
                    selectedClientId === client.id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => handleSelectClient(client)}
                >
                  <TableCell>
                    {selectedClientId === client.id && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.firstName} {client.lastName}
                  </TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>{client.city || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/standalone/deals" })}
        >
          Cancel
        </Button>
        <Button onClick={handleNext} disabled={!selectedClientId}>
          Next: Vehicle
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client for this deal
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newClientData.firstName}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newClientData.lastName}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClientData.email}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newClientData.phone}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newClientData.address}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newClientData.city}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newClientData.state}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={newClientData.zipCode}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, zipCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="driversLicense">Driver's License</Label>
                <Input
                  id="driversLicense"
                  value={newClientData.driversLicense}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, driversLicense: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
