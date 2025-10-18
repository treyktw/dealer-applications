// src/routes/index-redesign.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { convexQuery } from "@/lib/convex";
import { api } from "@dealer/convex";

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

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
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

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => convexQuery(api.api.users.getCurrentUser, {}),
  });

  const firstName = currentUser?.name?.split(" ")[0] || "there";

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["deals", currentUser?.dealershipId],
    queryFn: async () => {
      if (!currentUser?.dealershipId) return { deals: [] };
      return await convexQuery(api.api.deals.getDeals, {
        dealershipId: currentUser.dealershipId,
      });
    },
    enabled: !!currentUser?.dealershipId,
  });

  const deals: Deal[] = Array.isArray(dealsData) ? dealsData : dealsData?.deals || [];

  // Calculate stats
  const stats = {
    total: deals.length,
    pending: deals.filter((d) => d.status === "pending" || d.status === "draft").length,
    ready: deals.filter((d) => d.status === "READY_TO_SIGN" || d.status === "PENDING_SIGNATURE").length,
    completed: deals.filter((d) => d.status === "COMPLETED").length,
    totalValue: deals.reduce((sum, d) => sum + (d.totalAmount || d.saleAmount || 0), 0),
  };

  // Calculate trends (mock data for now - replace with actual monthly data)
  const monthlyGrowth = 12.5; // percentage
  const dealsGrowth = 8.3;

  // Get recent deals
  const recentDeals = deals
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  // Quick action cards
  const quickActions: QuickAction[] = [
    {
      title: "New Deal",
      description: "Start a fresh deal",
      icon: Plus,
      color: "from-blue-500 to-cyan-500",
      onClick: () => navigate({ to: "/deals/new" }),
    },
    {
      title: "Analytics",
      description: "View insights",
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500",
      onClick: () => navigate({ to: "/analytics" }),
    },
    {
      title: "Teams",
      description: "Manage users",
      icon: User,
      color: "from-orange-500 to-red-500",
      onClick: () => navigate({ to: "/teams" }),
    },
  ];

  if (userLoading || dealsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 pb-24">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Welcome back, {firstName}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Here's what's happening with your dealership today
            </p>
          </div>
          <Button size="lg" className="gap-2 shadow-lg">
            <Plus className="h-5 w-5" />
            New Deal
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{dealsGrowth}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Deals</p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">+{Math.floor(stats.total * (dealsGrowth / 100))} this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ready to Sign</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.ready}</p>
                <p className="text-xs text-muted-foreground mt-1">Action required</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{monthlyGrowth}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">${(stats.totalValue / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground mt-1">+${((stats.totalValue * (monthlyGrowth / 100)) / 1000).toFixed(0)}k this month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.title}
                  className="border-none shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                  onClick={action.onClick}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-3 rounded-xl bg-gradient-to-br", action.color)}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Deals */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Recent Deals</CardTitle>
                <CardDescription className="mt-1">Your latest customer transactions</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate({ to: "/deals" })}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDeals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No deals yet</p>
                <Button onClick={() => navigate({ to: "/deals/new" })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Deal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDeals.map((deal) => (
                  <button
                    type="button"
                    key={deal.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                    onClick={() => navigate({ to: "/deals/$dealsId/documents", params: { dealsId: deal.id } })}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {deal.client ? `${deal.client.firstName} ${deal.client.lastName}` : deal.clientName || "No Client"}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {deal.vehicle ? `${deal.vehicle.year} ${deal.vehicle.make}` : "No Vehicle"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(deal.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">${(deal.totalAmount || deal.saleAmount || 0).toLocaleString()}</p>
                        <StatusBadge status={deal.status} />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
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
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}