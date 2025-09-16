// src/routes/index.tsx
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  ArrowRight,
  CheckCircle,
  Plus,
  Upload,
  History,
  Edit,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@/lib/convex";
import { api } from "@dealer/convex";
import { TemplateSetup } from "@/components/admin/TemplateSetup";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (!context.auth?.isLoaded) return;
    if (!context.auth?.isSignedIn) {
      throw redirect({ to: "/login" });
    }
  },
  component: HomePage,
});

function HomePage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const firstName = user?.firstName || "there";

  // Fetch recent activity
  const { data: deals } = useQuery({
    queryKey: ["dashboard-deals", user?.id],
    queryFn: async () => {
      if (!user?.publicMetadata?.dealershipId) return [];
      const allDeals = await convexQuery(api.api.deals.getDeals, {
        dealershipId: user.publicMetadata.dealershipId as string,
      });
      return Array.isArray(allDeals) ? allDeals : allDeals?.deals || [];
    },
    enabled: !!user?.publicMetadata?.dealershipId,
  });

  // Get recent activity and signing queue from deals
  const recentActivity = (deals || [])
    .sort(
      (a: any, b: any) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    )
    .slice(0, 5);

  const signingQueue = (deals || [])
    .filter(
      (d: any) =>
        d.status === "READY_TO_SIGN" || d.status === "PENDING_SIGNATURE"
    )
    .slice(0, 3);

  // Get featured deal (most recent pending signature)
  const featuredDeal = signingQueue[0];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6 bg-">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome Back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your deals today.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Deal Banner */}
            {featuredDeal ? (
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">
                        Finalize the {featuredDeal.clientName || "Pending"} Deal
                      </h2>
                      <p className="text-blue-100 mb-6">
                        {featuredDeal.clientName || "Customer"} is waiting for
                        the final documents to sign.
                      </p>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() =>
                          navigate({
                            to: "/deals/$dealsId/documents",
                            params: { dealsId: featuredDeal._id },
                          })
                        }
                        className="bg-white text-blue-700 hover:bg-blue-50"
                      >
                        View Documents
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    <div className="ml-6">
                      <div className="w-20 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-blue-100 via-cyan-100 to-teal-100 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-900 border-0">
                <CardContent className="p-8">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                    <h2 className="text-xl font-semibold mb-2">
                      All Caught Up!
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      No pending signatures at the moment.
                    </p>
                    <Button onClick={() => navigate({ to: "/deals" })}>
                      View All Deals
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: "/deals" })}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentActivity.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">
                      No recent activity
                    </p>
                  ) : (
                    recentActivity.map((deal: any) => (
                      <div
                        key={deal._id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                        onClick={() =>
                          navigate({
                            to: "/deals/$dealsId",
                            params: { dealsId: deal._id },
                          })
                        }
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {deal.clientName?.[0] || "D"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {deal.clientName || `Deal #${deal._id.slice(-6)}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {deal.vehicleInfo || "Vehicle details pending"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={deal.status} />
                          <span className="text-sm text-muted-foreground">
                            {getTimeAgo(deal.updatedAt || deal.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Signing Queue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Signing Queue</CardTitle>
                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                  {signingQueue.length}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                {signingQueue.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No documents awaiting signature
                  </p>
                ) : (
                  signingQueue.map((deal: any) => (
                    <div
                      key={deal._id}
                      className="space-y-2 cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: "/deals/$dealsId",
                          params: { dealsId: deal._id },
                        })
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {deal.clientName || "Unknown"} -{" "}
                            {deal.documentType || "Sales Agreement"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Awaiting your signature
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      {deal._id !==
                        signingQueue[signingQueue.length - 1]._id && (
                        <div className="border-b" />
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <QuickActionButton
                    icon={Plus}
                    label="New Deal"
                    color="blue"
                    onClick={() => navigate({ to: "/deals/new" })}
                  />
                  <QuickActionButton
                    icon={Upload}
                    label="Upload Doc"
                    color="green"
                    onClick={() => console.log("Upload document")}
                  />
                  <QuickActionButton
                    icon={TrendingUp}
                    label="Create Quote"
                    color="amber"
                    onClick={() => console.log("Create quote")}
                  />
                  <QuickActionButton
                    icon={History}
                    label="View History"
                    color="purple"
                    onClick={() => navigate({ to: "/deals" })}
                  />
                </div>
              </CardContent>
            </Card>
            <TemplateSetup />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  color: "blue" | "green" | "amber" | "purple";
  onClick: () => void;
}) {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400",
    green:
      "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400",
    amber:
      "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400",
    purple:
      "bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg transition-colors",
        colorClasses[color]
      )}
    >
      <Icon className="h-5 w-5 mb-2" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    PENDING: {
      label: "Pending",
      class:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    PENDING_SIGNATURE: {
      label: "Pending Signature",
      class:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    READY_TO_SIGN: {
      label: "Ready to Sign",
      class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    COMPLETED: {
      label: "Completed",
      class:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    ACTION_REQUIRED: {
      label: "Action Required",
      class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const { label, class: className } = config[status] || config.PENDING;

  return (
    <span
      className={cn("px-2 py-1 text-xs font-medium rounded-full", className)}
    >
      {label}
    </span>
  );
}

function getTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return past.toLocaleDateString();
}
