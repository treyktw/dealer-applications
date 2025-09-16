// File: app/inventory/components/InventoryTable.tsx
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Vehicle } from "@/types/vehicle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  Loader2,
} from "lucide-react";

interface InventoryTableProps {
  vehicles: Vehicle[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  makeFilter: string;
  selectedVehicles: string[];
  onSelectVehicle: (selectedIds: string[]) => void;
  onDeleteVehicle: (id: string) => Promise<void>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

export function InventoryTable({
  vehicles,
  loading,
  searchQuery,
  statusFilter,
  makeFilter,
  selectedVehicles,
  onSelectVehicle,
  onDeleteVehicle,
}: InventoryTableProps) {
  // Selection handlers
  const toggleVehicleSelection = (id: string) => {
    onSelectVehicle(
      selectedVehicles.includes(id)
        ? selectedVehicles.filter((v) => v !== id)
        : [...selectedVehicles, id]
    );
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = vehicles.map((v) => v.id);
    const allSelected = pageIds.every((id) => selectedVehicles.includes(id));

    onSelectVehicle(
      allSelected
        ? selectedVehicles.filter((id) => !pageIds.includes(id))
        : [...new Set([...selectedVehicles, ...pageIds])]
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No vehicles found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ||
              statusFilter !== "status" ||
              makeFilter !== "makes"
                ? "Try adjusting your search or filters"
                : "Add a vehicle to get started"}
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        vehicles.length > 0 &&
                        vehicles.every((v) => selectedVehicles.includes(v.id))
                      }
                      onCheckedChange={toggleSelectAllOnPage}
                      aria-label="Select all vehicles"
                    />
                  </TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Stock #</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVehicles.includes(vehicle.id)}
                        onCheckedChange={() =>
                          toggleVehicleSelection(vehicle.id)
                        }
                        aria-label={`Select ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                          {vehicle.trim && ` ${vehicle.trim}`}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {vehicle.mileage?.toLocaleString() || '0'} miles
                          {vehicle.exteriorColor &&
                            ` • ${vehicle.exteriorColor}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.stock}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {vehicle.vin}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(vehicle.price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vehicle.status.charAt(0).toUpperCase() +
                        vehicle.status.slice(1).toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {vehicle.createdAt ? new Date(parseInt(vehicle.createdAt)).toLocaleString().split(',')[0] : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/${vehicle.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory/${vehicle.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDeleteVehicle(vehicle.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}