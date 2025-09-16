// src/routes/deals/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@/lib/convex';
import { api, Id } from '@dealer/convex';
import { useAuth } from '@clerk/clerk-react';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Search,
  Filter,
  Calendar,
  Car,
  User,
  DollarSign,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/deals/')({
  component: DealsPage,
});

function DealsPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Fetch current user from Convex
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => convexQuery(api.api.users.getCurrentUser, {}),
    enabled: isSignedIn,
  });

  // Fetch dealership information
  const { data: dealership, isLoading: dealershipLoading } = useQuery({
    queryKey: ['dealership', currentUser?.dealershipId],
    queryFn: () => convexQuery(api.api.dealerships.getDealershipById, { 
      dealershipId: currentUser?.dealershipId as Id<"dealerships"> 
    }),
    enabled: !!currentUser?.dealershipId,
  });

  // Fetch deals for the user's dealership
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', currentUser?.dealershipId, statusFilter, searchQuery],
    queryFn: async () => {
      if (!currentUser?.dealershipId) return { deals: [] };
      
      return await convexQuery(api.api.deals.getDeals, {
        dealershipId: currentUser.dealershipId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
    },
    enabled: !!currentUser?.dealershipId,
  });

  const deals = Array.isArray(dealsData) ? dealsData : dealsData?.deals || [];

  // Sort deals
  const sortedDeals = [...deals].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.updatedAt || b.createdAt).getTime() - 
               new Date(a.updatedAt || a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - 
               new Date(b.createdAt).getTime();
      case 'amount':
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      case 'client':
        return (a.client?.lastName || '').localeCompare(b.client?.lastName || '');
      default:
        return 0;
    }
  });

  // Calculate statistics
  const stats = {
    total: deals.length,
    pending: deals.filter((d: any) => d.status === 'pending' || d.status === 'draft').length,
    ready: deals.filter((d: any) => d.status === 'READY_TO_SIGN' || d.status === 'PENDING_SIGNATURE').length,
    completed: deals.filter((d: any) => d.status === 'COMPLETED').length,
    totalValue: deals.reduce((sum: any, d: any) => sum + (d.totalAmount || 0), 0),
  };

  const isLoading = userLoading || dealershipLoading || dealsLoading;

  if (userLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  // Handle missing current user after hooks are declared to keep hook order stable
  if (!currentUser) {
    return (
      <Layout>
        <div className="p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Please contact your administrator to be assigned to a dealership.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!currentUser?.dealershipId) {
    return (
      <Layout>
        <div className="p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">No Dealership Associated</h2>
              <p className="text-muted-foreground">
                Please contact your administrator to be assigned to a dealership.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground mt-1">
              {dealership?.name || 'Dealership'} - Manage all deals
            </p>
          </div>
          
          <Button onClick={() => navigate({ to: '/deals/new' })}>
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ready to Sign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.ready}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${stats.totalValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name, VIN, or deal ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="READY_TO_SIGN">Ready to Sign</SelectItem>
                  <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount">Highest Value</SelectItem>
                  <SelectItem value="client">Client Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Deals List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading deals...</p>
            </CardContent>
          </Card>
        ) : sortedDeals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Deals Found</h2>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by creating your first deal'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => navigate({ to: '/deals/new' })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Deal
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sortedDeals.map((deal) => (
              <DealCard key={deal._id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function DealCard({ deal }: { deal: any }) {
  const navigate = useNavigate();
  
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft', color: 'text-gray-600', icon: FileText },
    pending: { label: 'Pending', color: 'text-amber-600', icon: Calendar },
    READY_TO_SIGN: { label: 'Ready to Sign', color: 'text-blue-600', icon: FileText },
    PENDING_SIGNATURE: { label: 'Pending Signature', color: 'text-amber-600', icon: FileText },
    COMPLETED: { label: 'Completed', color: 'text-green-600', icon: FileText },
  };
  
  const status = statusConfig[deal.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate({ 
        to: '/deals/$dealsId/documents', 
        params: { dealsId: deal._id } 
      })}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Client Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {deal.client ? 
                    `${deal.client.firstName} ${deal.client.lastName}` : 
                    'No Client'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deal.clientEmail || deal.client?.email || 'No email'}
                </p>
              </div>
            </div>
            
            {/* Vehicle Info */}
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {deal.vehicle ? 
                    `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}` :
                    'No Vehicle'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deal.vin || deal.vehicle?.vin || 'No VIN'}
                </p>
              </div>
            </div>
            
            {/* Deal Value */}
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  ${(deal.totalAmount || deal.saleAmount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deal.type || 'Sale'}
                </p>
              </div>
            </div>
            
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-5 w-5", status.color)} />
                <span className={cn("text-sm font-medium", status.color)}>
                  {status.label}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        {/* Bottom row with date and deal ID */}
        <div className="mt-4 pt-4 border-t flex justify-between text-sm text-muted-foreground">
          <span>Deal #{deal._id.slice(-6)}</span>
          <span>{new Date(deal.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}