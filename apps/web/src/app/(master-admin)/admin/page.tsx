// apps/web/src/app/(admin)/admin/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Users,
  Car,
  FileText,
  TrendingUp,
  Package,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function MasterAdminDashboardPage() {
  // Get current user to check master admin status
  const { user } = useCurrentUser();
  const isMasterAdmin = user?.role === "MASTERADMIN" || (user?.role === "ADMIN" && !user.dealershipId);

  // Fetch platform statistics (only if master admin)
  const platformStats = useQuery(
    api.masterAdmin.getPlatformStats,
    isMasterAdmin ? {} : "skip"
  );

  // Fetch document pack analytics (only if master admin)
  const packAnalytics = useQuery(
    api.documentPackTemplates.getAnalytics,
    isMasterAdmin ? {} : "skip"
  );

  if (platformStats === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-zinc-400">Loading platform statistics...</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-zinc-100">Platform Dashboard</h1>
        <p className="text-zinc-400 mt-2">
          Overview of platform-wide statistics and activity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400">Total Dealerships</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-zinc-100">
                  {platformStats.dealerships.total}
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  {platformStats.dealerships.active} active
                </p>
              </div>
              <Building2 className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400">Total Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-zinc-100">
                  {platformStats.users.total}
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  ~{Math.round(platformStats.users.averagePerDealership)} per dealership
                </p>
              </div>
              <Users className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400">Total Vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-zinc-100">
                  {platformStats.inventory.total}
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  ~{Math.round(platformStats.inventory.averagePerDealership)} per dealership
                </p>
              </div>
              <Car className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400">Total Deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-zinc-100">
                  {platformStats.deals.total}
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  {platformStats.deals.recentlyCreated} this month
                </p>
              </div>
              <FileText className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dealership Status */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Dealership Status</CardTitle>
            <CardDescription className="text-zinc-400">
              Current status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-zinc-300">Active</span>
              </div>
              <span className="text-xl font-bold text-green-500">
                {platformStats.dealerships.active}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-zinc-300">Suspended</span>
              </div>
              <span className="text-xl font-bold text-yellow-500">
                {platformStats.dealerships.suspended}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-zinc-300">Deleted</span>
              </div>
              <span className="text-xl font-bold text-red-500">
                {platformStats.dealerships.deleted}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="text-zinc-300">Recently Added</span>
              </div>
              <span className="text-xl font-bold text-blue-500">
                {platformStats.dealerships.recentlyAdded}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Storage Usage</CardTitle>
            <CardDescription className="text-zinc-400">
              Platform-wide storage statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Used</span>
                <span className="text-zinc-100 font-medium">
                  {formatBytes(platformStats.storage.totalUsed)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Limit</span>
                <span className="text-zinc-100 font-medium">
                  {formatBytes(platformStats.storage.totalLimit)}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 mt-2">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(platformStats.storage.percentageUsed, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-right">
                {platformStats.storage.percentageUsed.toFixed(1)}% used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Statistics */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Client Statistics</CardTitle>
            <CardDescription className="text-zinc-400">
              Total clients across all dealerships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total Clients</span>
                <span className="text-2xl font-bold text-zinc-100">
                  {platformStats.clients.total}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Added This Month</span>
                <span className="text-lg font-semibold text-green-500">
                  +{platformStats.clients.recentlyAdded}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Average per Dealership</span>
                <span className="text-lg font-semibold text-zinc-300">
                  {Math.round(platformStats.clients.averagePerDealership)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Pack Analytics */}
        {packAnalytics && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Document Pack Marketplace</CardTitle>
              <CardDescription className="text-zinc-400">
                Sales and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Packs</span>
                  <span className="text-2xl font-bold text-zinc-100">
                    {packAnalytics.totalPacks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Active Packs</span>
                  <span className="text-lg font-semibold text-green-500">
                    {packAnalytics.activePacks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Revenue</span>
                  <span className="text-lg font-semibold text-green-500">
                    {formatCurrency(packAnalytics.totalRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Purchases</span>
                  <span className="text-lg font-semibold text-zinc-300">
                    {packAnalytics.totalPurchases}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Quick Actions</CardTitle>
          <CardDescription className="text-zinc-400">
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              asChild
              variant="outline"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
            >
              <Link href="/admin/dealerships">
                <Building2 className="w-4 h-4 mr-2" />
                Manage Dealerships
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
            >
              <Link href="/admin/document-packs">
                <Package className="w-4 h-4 mr-2" />
                Document Packs
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
            >
              <Link href="/admin/communications/email">
                <Mail className="w-4 h-4 mr-2" />
                Email Communications
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
            >
              <Link href="/admin/analytics">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

