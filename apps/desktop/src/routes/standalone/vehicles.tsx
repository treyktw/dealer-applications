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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, MoreVertical, Edit, Trash2, Car, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  getVehiclesByStatus,
  getVehiclesStats,
} from "@/lib/local-storage/local-vehicles-service";
import type { LocalVehicle } from "@/lib/local-storage/db";

export const Route = createFileRoute("/standalone/vehicles")({
  component: VehiclesPage,
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

function VehiclesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<LocalVehicle | null>(null);

  const [formData, setFormData] = useState({
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
    queryKey: ["standalone-vehicles", searchQuery, statusFilter],
    queryFn: async () => {
      if (searchQuery) {
        return await searchVehicles(searchQuery);
      }
      if (statusFilter !== "all") {
        return await getVehiclesByStatus(statusFilter);
      }
      return await getAllVehicles();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["standalone-vehicles-stats"],
    queryFn: getVehiclesStats,
  });

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles-stats"] });
      toast.success("Vehicle created successfully");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to create vehicle", {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LocalVehicle> }) =>
      updateVehicle(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles-stats"] });
      toast.success("Vehicle updated successfully");
      setIsEditDialogOpen(false);
      setSelectedVehicle(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to update vehicle", {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles-stats"] });
      toast.success("Vehicle deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete vehicle", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData({
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

  const handleAdd = () => {
    setIsAddDialogOpen(true);
    resetForm();
  };

  const handleEdit = (vehicle: LocalVehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      vin: vehicle.vin,
      stockNumber: vehicle.stockNumber || "",
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || "",
      mileage: vehicle.mileage,
      color: vehicle.color || "",
      price: vehicle.price,
      cost: vehicle.cost || 0,
      status: vehicle.status,
      description: vehicle.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditDialogOpen && selectedVehicle) {
      updateMutation.mutate({
        id: selectedVehicle.id,
        updates: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleExport = () => {
    if (!vehicles || vehicles.length === 0) {
      toast.error("No vehicles to export");
      return;
    }

    const csv = [
      ["VIN", "Stock#", "Year", "Make", "Model", "Trim", "Mileage", "Color", "Price", "Cost", "Status"].join(","),
      ...vehicles.map(v =>
        [
          v.vin,
          v.stockNumber || "",
          v.year,
          v.make,
          v.model,
          v.trim || "",
          v.mileage,
          v.color || "",
          v.price,
          v.cost || "",
          v.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vehicles-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Vehicles exported to CSV");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading vehicles...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const vehiclesList = vehicles || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vehicles</h1>
            <p className="text-muted-foreground mt-1">
              Manage your vehicle inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vehicles</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Car className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{stats.byStatus.available || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${stats.totalValue.toLocaleString()}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Price</p>
                <p className="text-2xl font-bold">
                  ${Math.round(stats.averagePrice).toLocaleString()}
                </p>
              </div>
            </Card>
          </div>
        )}

        <Card className="p-4">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {vehiclesList.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first vehicle"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VIN</TableHead>
                  <TableHead>Stock#</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Make</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiclesList.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono text-xs">
                      {vehicle.vin.slice(-8)}
                    </TableCell>
                    <TableCell>{vehicle.stockNumber || "-"}</TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>{vehicle.make}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>{vehicle.mileage.toLocaleString()}</TableCell>
                    <TableCell>{vehicle.color || "-"}</TableCell>
                    <TableCell>${vehicle.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[vehicle.status]}>
                        {statusLabels[vehicle.status] || vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(vehicle.id)}
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
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockNumber">Stock Number</Label>
                  <Input
                    id="stockNumber"
                    value={formData.stockNumber}
                    onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trim">Trim</Label>
                  <Input
                    id="trim"
                    value={formData.trim}
                    onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage *</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vin">VIN *</Label>
                  <Input
                    id="edit-vin"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stockNumber">Stock Number</Label>
                  <Input
                    id="edit-stockNumber"
                    value={formData.stockNumber}
                    onChange={(e) => setFormData({ ...formData, stockNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-year">Year *</Label>
                  <Input
                    id="edit-year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-make">Make *</Label>
                  <Input
                    id="edit-make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-model">Model *</Label>
                  <Input
                    id="edit-model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-trim">Trim</Label>
                  <Input
                    id="edit-trim"
                    value={formData.trim}
                    onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-color">Color</Label>
                  <Input
                    id="edit-color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-mileage">Mileage *</Label>
                  <Input
                    id="edit-mileage"
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost">Cost</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
