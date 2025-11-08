import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Check } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllVehicles,
  createVehicle,
  searchVehicles,
} from "@/lib/local-storage/local-vehicles-service";
import type { LocalVehicle } from "@/lib/local-storage/db";
import { useWizard } from "./index";

export const Route = createFileRoute("/standalone/deals/new/vehicle")({
  component: VehicleStep,
});

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  sold: "bg-blue-500",
  pending: "bg-yellow-500",
  reserved: "bg-purple-500",
  unavailable: "bg-gray-500",
};

function VehicleStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formData, updateFormData, setCurrentStep } = useWizard();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(formData.vehicleId);

  const [newVehicleData, setNewVehicleData] = useState({
    vin: "",
    stockNumber: "",
    year: new Date().getFullYear(),
    make: "",
    model: "",
    trim: "",
    mileage: 0,
    color: "",
    price: 0,
    cost: 0,
    status: "available",
    description: "",
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["standalone-vehicles-wizard", searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        return await searchVehicles(searchQuery);
      }
      const allVehicles = await getAllVehicles();
      return allVehicles.filter(v => v.status === "available" || v.status === "reserved");
    },
  });

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: (newVehicle) => {
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles-wizard"] });
      toast.success("Vehicle created successfully");
      setIsAddDialogOpen(false);
      setSelectedVehicleId(newVehicle.id);
      updateFormData({
        vehicleId: newVehicle.id,
        selectedVehicle: newVehicle,
      });
      resetNewVehicleForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to create vehicle", {
        description: error.message,
      });
    },
  });

  const resetNewVehicleForm = () => {
    setNewVehicleData({
      vin: "",
      stockNumber: "",
      year: new Date().getFullYear(),
      make: "",
      model: "",
      trim: "",
      mileage: 0,
      color: "",
      price: 0,
      cost: 0,
      status: "available",
      description: "",
    });
  };

  const handleSelectVehicle = (vehicle: LocalVehicle) => {
    setSelectedVehicleId(vehicle.id);
    updateFormData({
      vehicleId: vehicle.id,
      selectedVehicle: vehicle,
      saleAmount: vehicle.price,
      totalAmount: vehicle.price,
    });
  };

  const handleNext = () => {
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle to continue");
      return;
    }
    setCurrentStep(3);
    navigate({ to: "/standalone/deals/new/details" });
  };

  const handleBack = () => {
    setCurrentStep(1);
    navigate({ to: "/standalone/deals/new/client" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newVehicleData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  const vehiclesList = vehicles || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Select or Add Vehicle</h2>
        <p className="text-muted-foreground">
          Choose an available vehicle or add a new one for this deal
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by VIN, make, model, or stock number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Vehicle
        </Button>
      </div>

      {vehiclesList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No vehicles found" : "No available vehicles"}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Vehicle
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehiclesList.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  className={`cursor-pointer ${
                    selectedVehicleId === vehicle.id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => handleSelectVehicle(vehicle)}
                >
                  <TableCell>
                    {selectedVehicleId === vehicle.id && (
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell className="font-medium">{vehicle.make}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {vehicle.vin.slice(-8)}
                  </TableCell>
                  <TableCell>{vehicle.mileage.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">
                    ${vehicle.price.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[vehicle.status]}>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={handleBack}>
          Back: Client
        </Button>
        <Button onClick={handleNext} disabled={!selectedVehicleId}>
          Next: Details
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle to your inventory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN *</Label>
                  <Input
                    id="vin"
                    value={newVehicleData.vin}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, vin: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockNumber">Stock Number</Label>
                  <Input
                    id="stockNumber"
                    value={newVehicleData.stockNumber}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, stockNumber: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newVehicleData.year}
                    onChange={(e) =>
                      setNewVehicleData({
                        ...newVehicleData,
                        year: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    value={newVehicleData.make}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, make: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={newVehicleData.model}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, model: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trim">Trim</Label>
                  <Input
                    id="trim"
                    value={newVehicleData.trim}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, trim: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={newVehicleData.color}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, color: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage *</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={newVehicleData.mileage}
                    onChange={(e) =>
                      setNewVehicleData({
                        ...newVehicleData,
                        mileage: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newVehicleData.price}
                    onChange={(e) =>
                      setNewVehicleData({
                        ...newVehicleData,
                        price: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={newVehicleData.cost}
                    onChange={(e) =>
                      setNewVehicleData({
                        ...newVehicleData,
                        cost: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={newVehicleData.status}
                  onValueChange={(value) =>
                    setNewVehicleData({ ...newVehicleData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
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
                {createMutation.isPending ? "Creating..." : "Create Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
