"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import type { Vehicle } from "@/types/vehicle";
import { toast } from "sonner";

// UI Components
import { 
  Card, 
  CardContent, 
  CardFooter, 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  MoreHorizontal,
  ChevronDown,
  Edit,
  Trash2,
  Loader2,
  Car
} from "lucide-react";

// Shared Components
import { SearchInput } from '@/components/shared/SearchInput';
import { FilterDropdown } from '@/components/shared/FilterDropdown';
import { ItemsPerPageSelector } from '@/components/shared/ItemsPerPageSelector';
import { FilterChips } from '@/components/shared/FilterChips';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { BulkActionBar } from '@/components/shared/BulkActionBar';

// Hooks
import { usePaginatedSearch } from '@/hooks/usePaginationSearch';

// Import/Export Dialog
import { VehicleImportDialog } from './_components/vehicle-import-dialog';

// Helper to map Convex vehicle to frontend Vehicle type
function mapConvexVehicleToVehicle(convexVehicle: Doc<'vehicles'>): Vehicle {
  return {
    id: String(convexVehicle._id),
    make: convexVehicle.make ?? '',
    model: convexVehicle.model ?? '',
    year: convexVehicle.year ?? 0,
    price: convexVehicle.price ?? 0,
    status: (convexVehicle.status?.toLowerCase?.() ?? 'available') as Vehicle['status'],
    vin: convexVehicle.vin ?? '',
    stock: convexVehicle.stock ?? '',
    mileage: convexVehicle.mileage ?? 0,
    exteriorColor: convexVehicle.exteriorColor ?? null,
    interiorColor: convexVehicle.interiorColor ?? null,
    transmission: convexVehicle.transmission ?? null,
    fuelType: convexVehicle.fuelType ?? null,
    engine: convexVehicle.engine ?? null,
    trim: convexVehicle.trim ?? null,
    featured: convexVehicle.featured ?? false,
    dealershipId: convexVehicle.dealershipId ?? '',
    description: convexVehicle.description ?? null,
    createdAt: String(convexVehicle.createdAt ?? Date.now()),
    updatedAt: String(convexVehicle.updatedAt ?? Date.now()),
    images: convexVehicle.images?.map(img => ({
      id: crypto.randomUUID(),
      url: img.url,
      isPrimary: img.isPrimary || false
    })) || [],
    features: convexVehicle.features ? convexVehicle.features.split('\n')
      .filter(f => f.trim())
      .map(feature => ({
        id: crypto.randomUUID(),
        name: feature.trim(),
        category: 'standard'
      })) : [],
  };
}

export default function InventoryPage() {
  // State for selected vehicles and dialogs
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Convex: Get current dealership from authenticated user
  const currentDealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = currentDealership?._id;

  // Enhanced search and pagination with URL state management
  const {
    searchTerm,
    debouncedSearch,
    setSearchTerm,
    isSearching,
    page,
    setPage,
    limit,
    setLimit,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters
  } = usePaginatedSearch({
    defaultSearch: '',
    defaultPage: 1,
    defaultLimit: 25,
    defaultFilters: {
      status: '',
      make: '',
      year: '',
      priceRange: ''
    },
    searchDelay: 500
  });

  // Convex: Fetch vehicles with enhanced filtering
  const vehiclesData = useQuery(
    api.inventory.getVehicles,
    dealershipId
      ? {
          dealershipId: String(dealershipId),
          search: debouncedSearch || undefined,
          status: filters.status ? String(filters.status) : undefined,
          make: filters.make ? String(filters.make) : undefined,
          // year: filters.year ? String(filters.year) : undefined,
          page,
          limit,
        }
      : "skip"
  );

  const vehicles = (vehiclesData?.vehicles || []).map(mapConvexVehicleToVehicle);
  const totalVehicles = vehiclesData?.total || 0;
  const loading = vehiclesData === undefined;
  const totalPages = Math.ceil(totalVehicles / limit);

  // Convex: Fetch unique makes for filtering
  const makes = useQuery(
    api.inventory.getUniqueMakes,
    dealershipId ? { dealershipId } : "skip"
  ) || [];

  // Get unique years for filtering
  const yearsQuery = useQuery(
    api.inventory.getUniqueYears,
    dealershipId ? { dealershipId } : "skip"
  );
  const uniqueYears = yearsQuery || [];

  // Filter options
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'sold', label: 'Sold' },
    { value: 'pending', label: 'Pending' },
    { value: 'reserved', label: 'Reserved' }
  ], []);

  const makeOptions = [
    { value: '', label: 'All Makes' },
    ...makes.map(make => ({ value: make, label: make }))
  ];

  const yearOptions = [
    { value: '', label: 'All Years' },
    ...uniqueYears.sort((a: number, b: number) => b - a).map((year: number) => ({ 
      value: String(year), 
      label: String(year) 
    }))
  ];

  // Filter chips for active filters
  const activeFilterChips = useMemo(() => {
    const chips = [];
    
    if (debouncedSearch) {
      chips.push({
        key: 'search',
        label: 'Search',
        value: String(debouncedSearch),
        onRemove: () => setSearchTerm('')
      });
    }
    
    if (filters.status) {
      const statusLabel = statusOptions.find(opt => opt.value === filters.status)?.label || String(filters.status);
      chips.push({
        key: 'status',
        label: 'Status',
        value: statusLabel,
        onRemove: () => clearFilter('status')
      });
    }
    
    if (filters.make) {
      chips.push({
        key: 'make',
        label: 'Make',
        value: String(filters.make),
        onRemove: () => clearFilter('make')
      });
    }

    if (filters.year) {
      chips.push({
        key: 'year',
        label: 'Year',
        value: String(filters.year),
        onRemove: () => clearFilter('year')
      });
    }
    
    return chips;
  }, [debouncedSearch, filters, setSearchTerm, clearFilter, statusOptions]);

  // Convex: Mutations
  const deleteVehicle = useMutation(api.inventory.deleteVehicle);
  const deleteManyVehicles = useMutation(api.inventory.deleteManyVehicles);

  // Selection handlers
  const toggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicles(prev => {
      if (prev.includes(vehicleId)) {
        return prev.filter(id => id !== vehicleId);
      } else {
        return [...prev, vehicleId];
      }
    });
  };
  
  const selectAllOnPage = () => {
    const currentPageVehicleIds = vehicles.map(vehicle => vehicle.id);
    setSelectedVehicles(prev => {
      const newSelection = [...prev];
      currentPageVehicleIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const deselectAllOnPage = () => {
    const currentPageVehicleIds = vehicles.map(vehicle => vehicle.id);
    setSelectedVehicles(prev => prev.filter(id => !currentPageVehicleIds.includes(id)));
  };

  const isAllSelected = vehicles.length > 0 && vehicles.every(vehicle => selectedVehicles.includes(vehicle.id));

  // Event handlers
  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await deleteVehicle({ id: id as Id<"vehicles"> });
      setSelectedVehicles((prev) => prev.filter((v) => v !== id));
      toast.success("Vehicle deleted successfully");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVehicles.length === 0) return;
    if (!confirm(`Delete ${selectedVehicles.length} vehicles?`)) return;
    try {
      await deleteManyVehicles({ vehicleIds: selectedVehicles as Id<"vehicles">[] });
      setSelectedVehicles([]);
      toast.success(`${selectedVehicles.length} vehicles deleted successfully`);
    } catch (error) {
      console.error("Error deleting vehicles:", error);
      toast.error("Failed to delete vehicles");
    }
  };

  const handleExportCSV = () => {
    if (vehicles.length === 0) return;
    
    // Create CSV content
    const headers = ['Make', 'Model', 'Year', 'VIN', 'Stock', 'Price', 'Status', 'Mileage'];
    const csvContent = [
      headers.join(','),
      ...vehicles.map(vehicle => [
        vehicle.make,
        vehicle.model,
        vehicle.year,
        vehicle.vin,
        vehicle.stock,
        vehicle.price,
        vehicle.status,
        vehicle.mileage
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImportComplete = (count: number) => {
    toast.success(`${count} vehicles imported successfully`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
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

  // Bulk actions configuration
  const bulkActions = [
    {
      key: 'delete',
      label: `Delete (${selectedVehicles.length})`,
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: handleBulkDelete,
      variant: 'destructive' as const
    },
    {
      key: 'export',
      label: 'Export Selected',
      icon: <Download className="mr-2 h-4 w-4" />,
      onClick: handleExportCSV,
      variant: 'default' as const
    }
  ];

  // Loading state
  if (currentDealership === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (currentDealership === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold">No Dealership Found</h2>
          <p className="text-muted-foreground">
            You need to be associated with a dealership to view inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your vehicle inventory
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild>
            <Link href="/inventory/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import / Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Data Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Import Vehicles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export Vehicles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search vehicles by make, model, VIN, or stock..."
                isSearching={isSearching}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <FilterDropdown
                value={String(filters.status || '')}
                onChange={(value) => setFilter('status', value)}
                options={statusOptions}
                placeholder="Filter by status"
              />
              
              <FilterDropdown
                value={String(filters.make || '')}
                onChange={(value) => setFilter('make', value)}
                options={makeOptions}
                placeholder="Filter by make"
              />

              <FilterDropdown
                value={String(filters.year || '')}
                onChange={(value) => setFilter('year', value)}
                options={yearOptions}
                placeholder="Filter by year"
              />
              
              <ItemsPerPageSelector
                value={limit}
                onChange={setLimit}
                options={[10, 25, 50, 100]}
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <FilterChips
              chips={activeFilterChips}
              onClearAll={clearAllFilters}
            />
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedVehicles.length > 0 && (
        <BulkActionBar
          selectedCount={selectedVehicles.length}
          totalOnPage={vehicles.length}
          onSelectAll={selectAllOnPage}
          onDeselectAll={deselectAllOnPage}
          isAllSelected={isAllSelected}
          actions={bulkActions}
        />
      )}

      {/* Vehicles Table */}
      <Card>
        <CardContent className="p-0">
          {vehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isSearching ? "Searching..." : "No vehicles found"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters 
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
                        checked={isAllSelected}
                        onCheckedChange={(checked) => checked ? selectAllOnPage() : deselectAllOnPage()}
                        aria-label="Select all vehicles"
                      />
                    </TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Stock/VIN</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedVehicles.includes(vehicle.id)}
                          onCheckedChange={() => toggleVehicleSelection(vehicle.id)}
                          aria-label={`Select ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/inventory/${vehicle.id}`}
                          className="font-medium hover:underline"
                        >
                          <div className="font-medium">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>
                          {vehicle.trim && (
                            <div className="text-sm text-muted-foreground">
                              {vehicle.trim}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">#{vehicle.stock}</div>
                          <div className="text-muted-foreground font-mono text-xs">
                            {vehicle.vin.slice(-8)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(vehicle.price)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {vehicle.mileage.toLocaleString()} mi
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                          {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vehicle.featured && (
                          <Badge variant="outline">
                            Featured
                          </Badge>
                        )}
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
                              onClick={() => handleDeleteVehicle(vehicle.id)}
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
        
        {/* Enhanced Pagination */}
        {!loading && totalPages > 0 && (
          <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t p-4">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalVehicles)} of {totalVehicles} vehicles
            </div>
            
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showPages={5}
            />
          </CardFooter>
        )}
      </Card>
      
      {/* Vehicle Import Dialog */}
      <VehicleImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}