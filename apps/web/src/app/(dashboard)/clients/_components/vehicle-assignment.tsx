"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Car, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface VehicleAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: Id<"clients">;
  onVehicleSelected: (vehicleId: Id<"vehicles">) => void;
}

export function VehicleAssignmentDialog({
  open,
  onOpenChange,
  // clientId,
  onVehicleSelected,
}: VehicleAssignmentDialogProps) {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  // Get dealership info using the current user approach (more reliable than localStorage)
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;

  // // Debug: Log the current state
  // console.log("🔍 VehicleAssignmentDialog Debug:", {
  //   open,
  //   dealershipId,
  //   currentUser,
  //   searchQuery,
  //   statusFilter
  // });

  // Fetch available vehicles using the enhanced query
  const vehiclesData = useQuery(
    api.inventory.getVehicles,
    dealershipId && open
      ? {
          dealershipId,
          search: searchQuery || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          page: 1,
          limit: 100, // Get more vehicles for selection
        }
      : "skip"
  );

  // Extract vehicles from the response
  const vehicles = vehiclesData?.vehicles || [];
  const isLoading = dealershipId && open && vehiclesData === undefined;
  const isError = dealershipId && open && vehiclesData === null;

  // console.log("🚗 Vehicles Debug:", {
  //   isLoading,
  //   isError,
  //   vehiclesCount: vehicles.length,
  //   vehiclesData
  // });

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedVehicle(null);
      setSearchQuery("");
    }
  }, [open]);

  // Handle selection
  const handleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicle(vehicleId === selectedVehicle ? null : vehicleId);
  };

  // Handle confirm selection
  const handleConfirmSelection = () => {
    if (!selectedVehicle) {
      toast.error("No vehicle selected", {
        description: "Please select a vehicle to continue",
      });
      return;
    }

    onVehicleSelected(selectedVehicle as Id<"vehicles">);
    onOpenChange(false);
    toast.success("Vehicle selected successfully");
  };

  // Status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'default';
      case 'sold':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'reserved':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Vehicle to Assign</DialogTitle>
          <DialogDescription>
            Choose a vehicle to create deal documents for this client
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by make, model, VIN, or stock #"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available Only</SelectItem>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto border rounded-md">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading vehicles...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="h-12 w-12 text-destructive mb-2" />
              <p className="text-destructive font-semibold">
                Error loading vehicles
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Please try again or contact support if the problem persists
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* No Vehicles State */}
          {!isLoading && !isError && vehicles.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64">
              <Car className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground font-medium">No vehicles found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search criteria" 
                  : "Add vehicles to your inventory to get started"}
              </p>
              {(searchQuery || statusFilter !== "available") && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("available");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Vehicles Table */}
          {!isLoading && !isError && vehicles.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock #</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow
                    key={vehicle._id}
                    className={
                      selectedVehicle === vehicle._id
                        ? "bg-primary/10 border-primary cursor-pointer"
                        : "cursor-pointer hover:bg-muted/50"
                    }
                    onClick={() => handleVehicleSelection(vehicle._id)}
                  >
                    <TableCell className="font-medium">
                      {vehicle.stock}
                    </TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {vehicle.make} {vehicle.model}
                        </div>
                        {vehicle.trim && (
                          <div className="text-sm text-muted-foreground">
                            {vehicle.trim}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                        {vehicle.vin.slice(-8)}
                      </code>
                    </TableCell>
                    <TableCell>
                      {vehicle.exteriorColor || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vehicle.mileage?.toLocaleString() || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(vehicle.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                        {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Selected Vehicle Info */}
        {selectedVehicle && (
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
            <p className="text-sm font-medium text-primary">
              Selected: {vehicles.find(v => v._id === selectedVehicle)?.year}{" "}
              {vehicles.find(v => v._id === selectedVehicle)?.make}{" "}
              {vehicles.find(v => v._id === selectedVehicle)?.model}
              {" "}(Stock: {vehicles.find(v => v._id === selectedVehicle)?.stock})
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedVehicle}
          >
            {selectedVehicle ? "Assign Vehicle" : "Select a Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}