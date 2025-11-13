// src/routes/index.tsx - Fixed with proper data fetching
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  User,
  Car,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex";
import { api } from "@dealer/convex";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { getCachedAppMode } from "@/lib/mode-detection";

// Type definitions
interface Deal {
  id: string;
  status: string;
  totalAmount?: number;
  saleAmount?: number;
  createdAt: number;
  updatedAt?: number;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
  } | null;
  clientName?: string;
  vehicle?: {
    year: number;
    make: string;
  } | null;
}

interface StatusConfig {
  label: string;
  class: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const auth = useUnifiedAuth();
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";
  
  const user = auth.user;
  const token = auth.token;

  // Fetch deals - only for dealership mode
  // In standalone mode, deals are stored locally
  // Must be called before any early returns (React hooks rule)
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["deals", user?.dealershipId],
    queryFn: async () => {
      if (isStandalone) {
        // In standalone mode, deals are stored locally
        // Return empty array for now - standalone deals would be fetched from local storage
        return [];
      }

      if (!user?.dealershipId) {
        throw new Error("User not associated with a dealership");
      }

      if (!token) {
        throw new Error("No authentication token found");
      }

      return await convexClient.query(api.api.deals.getDeals, {
        dealershipId: user.dealershipId,
        token: token,
      });
    },
    enabled: !isStandalone && !!user?.dealershipId && !!token,
  });

  // Redirect standalone users to standalone dashboard
  useEffect(() => {
    if (isStandalone) {
      if (!auth.isLoading && !auth.isAuthenticated) {
        console.log("🔒 [HOMEPAGE] Not authenticated in standalone mode, redirecting to login...");
        navigate({ 
          to: "/standalone-login",
          search: { email: "" }
        });
      } else if (auth.isAuthenticated) {
        console.log("🔄 [HOMEPAGE] Standalone user on dealership route, redirecting to standalone dashboard...");
        navigate({ to: "/standalone" });
      }
    }
  }, [isStandalone, auth.isLoading, auth.isAuthenticated, navigate]);

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 animate-spin border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (isStandalone && !auth.isAuthenticated) {
    return null;
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  // Handle subscription requirement - return empty array if subscription required
  const deals: Deal[] = Array.isArray(dealsData) 
    ? dealsData 
    : (dealsData && typeof dealsData === 'object' && 'subscriptionRequired' in dealsData && dealsData.subscriptionRequired)
      ? []
      : (dealsData && typeof dealsData === 'object' && 'deals' in dealsData && Array.isArray(dealsData.deals))
        ? dealsData.deals
        : [];

  // Calculate stats
  // Only count COMPLETED deals for revenue - draft/pending deals shouldn't count toward revenue
  const completedDeals = deals.filter((d) => 
    d.status === "COMPLETED" || 
    d.status === "DELIVERED" || 
    d.status === "FINALIZED" ||
    d.status === "completed" // Legacy status
  );
  
  const stats = {
    total: deals.length,
    pending: deals.filter((d) => d.status === "pending" || d.status === "draft" || d.status === "DRAFT" || d.status === "PENDING_APPROVAL").length,
    ready: deals.filter((d) => d.status === "READY_TO_SIGN" || d.status === "PENDING_SIGNATURE" || d.status === "AWAITING_SIGNATURES").length,
    completed: completedDeals.length,
    // Only sum totalAmount from completed deals (totalAmount is required field, no need for fallback)
    totalValue: completedDeals.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
  };

  // Calculate trends (mock data for now - replace with actual monthly data)
  const monthlyGrowth = 12.5; // percentage
  const dealsGrowth = 8.3;

  // Format currency with proper units (k for thousands, M for millions)
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      // Millions
      const millions = value / 1000000;
      return millions >= 10 
        ? `$${millions.toFixed(0)}M`
        : `$${millions.toFixed(1)}M`;
    } else if (value >= 1000) {
      // Thousands
      const thousands = value / 1000;
      return thousands >= 10
        ? `$${thousands.toFixed(0)}k`
        : `$${thousands.toFixed(1)}k`;
    } else {
      // Less than 1000
      return `$${value.toFixed(0)}`;
    }
  };

  // Get recent deals
  const recentDeals = deals
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);


  if (dealsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 animate-spin border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-24 mx-auto space-y-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-foreground to-foreground/60">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Here's what's happening with your dealership today
            </p>
          </div>
          <Button size="lg" className="gap-2 shadow-lg" onClick={() => navigate({ to: "/deals/new" })}>
            <Plus className="w-5 h-5" />
            New Deal
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="to-transparent border-none shadow-lg bg-linear-to-br from-blue-500/10 via-blue-500/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex gap-1 items-center text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">{dealsGrowth}%</span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Total Deals</p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="mt-1 text-xs text-muted-foreground">+{Math.floor(stats.total * (dealsGrowth / 100))} this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="to-transparent border-none shadow-lg bg-linear-to-br from-amber-500/10 via-amber-500/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                <p className="mt-1 text-xs text-muted-foreground">Needs attention</p>
              </div>
            </CardContent>
          </Card>

          <Card className="to-transparent border-none shadow-lg bg-linear-to-br from-blue-500/10 via-blue-500/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Ready to Sign</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.ready}</p>
                <p className="mt-1 text-xs text-muted-foreground">Action required</p>
              </div>
            </CardContent>
          </Card>

          <Card className="to-transparent border-none shadow-lg bg-linear-to-br from-green-500/10 via-green-500/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex gap-1 items-center text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">{monthlyGrowth}%</span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalValue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">+{formatCurrency(stats.totalValue * (monthlyGrowth / 100))} this month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deals */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Recent Deals</CardTitle>
                <CardDescription className="mt-1">Your latest customer transactions</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate({ to: "/deals" })}>
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDeals.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground/30" />
                <p className="mb-4 text-muted-foreground">No deals yet</p>
                <Button onClick={() => navigate({ to: "/deals/new" })}>
                  <Plus className="mr-2 w-4 h-4" />
                  Create Your First Deal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDeals.map((deal) => (
                  <button
                    type="button"
                    key={deal.id}
                    className="flex justify-between items-center p-4 w-full text-left rounded-lg transition-colors cursor-pointer hover:bg-accent/50 group"
                    onClick={() => navigate({ to: `/deals/${deal.id}` })}
                  >
                    <div className="flex flex-1 gap-4 items-center">
                      <div className="flex justify-center items-center w-12 h-12 rounded-full bg-linear-to-br from-primary/20 to-primary/10">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {deal.client ? `${deal.client.firstName} ${deal.client.lastName}` : deal.clientName || "No Client"}
                        </p>
                        <div className="flex gap-4 items-center mt-1 text-sm text-muted-foreground">
                          <span className="flex gap-1 items-center">
                            <Car className="w-3 h-3" />
                            {deal.vehicle ? `${deal.vehicle.year} ${deal.vehicle.make}` : "No Vehicle"}
                          </span>
                          <span className="flex gap-1 items-center">
                            <Calendar className="w-3 h-3" />
                            {new Date(deal.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="text-right">
                        <p className="font-semibold">${(deal.totalAmount || deal.saleAmount || 0).toLocaleString()}</p>
                        <StatusBadge status={deal.status} />
                      </div>
                      <ArrowRight className="w-5 h-5 transition-transform text-muted-foreground group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, StatusConfig> = {
    draft: {
      label: "Draft",
      class: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      icon: Clock,
    },
    pending: {
      label: "Pending",
      class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: Clock,
    },
    PENDING_SIGNATURE: {
      label: "Pending",
      class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      icon: AlertCircle,
    },
    READY_TO_SIGN: {
      label: "Ready",
      class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: Sparkles,
    },
    COMPLETED: {
      label: "Complete",
      class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: CheckCircle2,
    },
  };

  const { label, class: className, icon: Icon } = config[status] || config.pending;

  return (
    <span className={cn("inline-flex gap-1 items-center px-2 py-1 text-xs font-medium rounded-full", className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}