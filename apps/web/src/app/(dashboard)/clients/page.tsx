'use client';

import { useState, useMemo } from 'react';
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  MoreHorizontal,
  ChevronDown,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

// Shared Components
import { SearchInput } from '@/components/shared/SearchInput';
import { FilterDropdown } from '@/components/shared/FilterDropdown';

import { FilterChips } from '@/components/shared/FilterChips';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { BulkActionBar } from '@/components/shared/BulkActionBar';

// Hooks
import { usePaginatedSearch } from '@/hooks/usePaginationSearch';

// Import/Export Dialogs
import { ClientExportDialog } from './_components/export-dialog';
import { ClientImportDialog } from './_components/import-dialog';
import { ItemsPerPageSelector } from '@/components/shared/ItemsPerPageSelector';

export default function ClientsPage() {
  // Convex: Get current user (and dealershipId)
  const currentUser = useConvexQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId ?? null;
  const isLoadingDealership = currentUser === undefined;

  // State for selected clients and dialogs
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

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
      source: ''
    },
    searchDelay: 500
  });

  // Convex: Query to fetch clients with enhanced filtering
  const clientsQuery = useConvexQuery(
    api.clients.listClients,
    !isLoadingDealership && dealershipId
      ? {
          page,
          limit,
          search: debouncedSearch || undefined,
          status: (filters.status as string) || undefined,
          source: (filters.source as string) || undefined,
          dealershipId: dealershipId as string,
        }
      : "skip"
  );

  const isLoading = isLoadingDealership || clientsQuery === undefined;
  const isError = !isLoading && !clientsQuery;

  // Extract clients and pagination from data
  const clients = clientsQuery?.data || [];
  const pagination = clientsQuery?.meta || {
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 1,
  };

  // Get unique sources for filtering (you'll need to add this query to Convex)
  const sourcesQuery = useConvexQuery(
    api.clients.getUniqueSources,
    dealershipId ? { dealershipId } : "skip"
  );
  const uniqueSources = sourcesQuery || [];

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'LEAD', label: 'Leads' },
    { value: 'CUSTOMER', label: 'Customers' },
    { value: 'PREVIOUS', label: 'Previous' }
  ];

  const sourceOptions = [
    { value: '', label: 'All Sources' },
    ...uniqueSources.map(source => ({ value: source, label: source }))
  ];

  // Filter chips for active filters
  const activeFilterChips = useMemo(() => {
    const chips = [];
    
    if (debouncedSearch) {
      chips.push({
        key: 'search',
        label: 'Search',
        value: debouncedSearch,
        onRemove: () => setSearchTerm('')
      });
    }
    
    if (filters.status) {
      // const statusLabel = statusOptions.find(opt => opt.value === filters.status)?.label || String(filters.status);
      chips.push({
        key: 'status',
        label: 'Status',
        value: String(filters.status),
        onRemove: () => clearFilter('status')
      });
    }
    
    if (filters.source) {
      chips.push({
        key: 'source',
        label: 'Source',
        value: String(filters.source),
        onRemove: () => clearFilter('source')
      });
    }
    
    return chips;
  }, [debouncedSearch, filters, setSearchTerm, clearFilter]);

  // Selection handlers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };
  
  const selectAllOnPage = () => {
    const currentPageClientIds = clients.map(client => client._id);
    setSelectedClients(prev => {
      const newSelection = [...prev];
      currentPageClientIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const deselectAllOnPage = () => {
    const currentPageClientIds = clients.map(client => client._id);
    setSelectedClients(prev => prev.filter(id => !currentPageClientIds.includes(id as Id<"clients">)));
  };

  const isAllSelected = clients.length > 0 && clients.every(client => selectedClients.includes(client._id));

  // Event handlers
  const handleImportComplete = (count: number) => {
    toast.success(`${count} clients imported successfully`);
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'LEAD':
        return 'secondary';
      case 'CUSTOMER':
        return 'default';
      case 'PREVIOUS':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(parseInt(dateString)).toLocaleDateString();
  };
  
  // Convex: Mutations for deleting and bulk deleting clients
  const deleteClient = useMutation(api.clients.deleteClient);
  const bulkDeleteClients = useMutation(api.clients.bulkDeleteClients);

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return;
    }
    try {
      await deleteClient({ clientId: clientId as Id<'clients'> });
      setSelectedClients(prev => prev.filter(id => id !== clientId));
      toast.success('Client deleted successfully');
    } catch {
      toast.error('Failed to delete client');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedClients.length} clients?`)) return;
    
    try {
      const result = await bulkDeleteClients({ clientIds: selectedClients.map(id => id as Id<'clients'>) });
      setSelectedClients([]);
      toast.success(`${result.deletedCount} clients deleted successfully`);
    } catch {
      toast.error('Failed to delete clients');
    }
  };

  const handleBulkExport = () => {
    setIsExportDialogOpen(true);
  };

  // Bulk actions configuration
  const bulkActions = [
    {
      key: 'delete',
      label: `Delete (${selectedClients.length})`,
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: handleBulkDelete,
      variant: 'destructive' as const
    },
    {
      key: 'export',
      label: 'Export Selected',
      icon: <Download className="mr-2 h-4 w-4" />,
      onClick: handleBulkExport,
      variant: 'default' as const
    }
  ];

  // Loading state
  if (isLoadingDealership) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error states
  if (!dealershipId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="text-xl font-semibold text-destructive">Access Denied</div>
        <div className="text-muted-foreground">
          You must be associated with a dealership to view clients.
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="text-xl font-semibold text-destructive">Error Loading Clients</div>
        <div className="text-muted-foreground">
          Unable to load clients. Please try again later.
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild>
            <Link href="/clients/add">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Client
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
                Import Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsExportDialogOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Export Clients
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
                placeholder="Search clients by name, email, or phone..."
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
                value={String(filters.source || '')}
                onChange={(value) => setFilter('source', value)}
                options={sourceOptions}
                placeholder="Filter by source"
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
      {selectedClients.length > 0 && (
        <BulkActionBar
          selectedCount={selectedClients.length}
          totalOnPage={clients.length}
          onSelectAll={selectAllOnPage}
          onDeselectAll={deselectAllOnPage}
          isAllSelected={isAllSelected}
          actions={bulkActions}
        />
      )}

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {isSearching ? "Searching..." : "No clients found"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters 
                  ? "Try adjusting your search or filters" 
                  : "Add a client to get started"}
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
                        aria-label="Select all clients"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client._id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedClients.includes(client._id)}
                          onCheckedChange={() => toggleClientSelection(client._id)}
                          aria-label={`Select ${client.firstName} ${client.lastName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/clients/${client._id}`}
                          className="font-medium hover:underline"
                        >
                          {client.firstName} {client.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {client.email && (
                          <a 
                            href={`mailto:${client.email}`}
                            className="text-blue-400 hover:underline"
                          >
                            {client.email}
                          </a>
                        )}
                        {client.phone && (
                          <div className="text-sm text-muted-foreground">
                            {client.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.city && client.state && (
                          <span className="text-sm">{client.city}, {client.state}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.source && (
                          <span className="text-sm">{client.source}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(client.status)}>
                          {client.status === 'LEAD' ? 'Lead' : 
                           client.status === 'CUSTOMER' ? 'Customer' : 'Previous'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(client.createdAt.toString())}</span>
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
                              <Link href={`/clients/${client._id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/clients/${client._id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClient(client._id)}
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
        {!isLoading && !isError && pagination.totalPages > 0 && (
          <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t p-4">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.totalItems)} of {pagination.totalItems} clients
            </div>
            
            <PaginationControls
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              showPages={5}
            />
          </CardFooter>
        )}
      </Card>
      
      {/* Import Dialog */}
      <ClientImportDialog 
        open={isImportDialogOpen} 
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
      
      {/* Export Dialog */}
      <ClientExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        selectedClientIds={selectedClients as unknown as Id<'clients'>[]}
        filters={{ 
          search: debouncedSearch, 
          status: (filters.status as string) || undefined
        }}
      />
    </div>
  );
}