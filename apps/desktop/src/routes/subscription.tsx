// src/routes/subscription/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, convexMutation } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import {
  Calendar,
  TrendingUp,
  Users,
  Database,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-hot-toast";

export const Route = createFileRoute("/subscription")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const queryClient = useQueryClient();

  // Get subscription status
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: () =>
      convexQuery(api.api.subscriptions.checkSubscriptionStatus, {}),
  });


  
  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await convexMutation(api.api.subscriptions.cancelSubscription, {
        subscriptionId: subscription?._id as Id<"subscriptions">,
      });
    },
    onSuccess: () => {
      toast.success("Subscription cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel subscription"
      );
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              Loading subscription details...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const subscription = subscriptionData?.subscription;
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  const handleViewPlans = () => {
    open("https://universalautobrokers.net/pricing");
  };

  if (!hasActiveSubscription || !subscription) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                No Active Subscription
              </h2>
              <p className="text-muted-foreground mb-6">
                You don't have an active subscription. Choose a plan to get
                started.
              </p>

              {/* Route to pricing on web app */}
              <Button size="lg" onClick={handleViewPlans}>
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Calculate usage percentages
  const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  const storageUsed = subscription.storageUsed || 0;
  const storagePercentage = (storageUsed / storageLimit) * 100;

  const usersLimit =
    subscription.plan === "BASIC"
      ? 5
      : subscription.plan === "PREMIUM"
        ? 15
        : 50;
  const usersCount = subscription.usersCount || 1;
  const usersPercentage = (usersCount / usersLimit) * 100;

  const apiCallsLimit =
    subscription.plan === "BASIC"
      ? 10000
      : subscription.plan === "PREMIUM"
        ? 50000
        : 200000;
  const apiCallsUsed = subscription.apiCallsUsed || 0;
  const apiCallsPercentage = (apiCallsUsed / apiCallsLimit) * 100;

  // Format bytes to readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Get plan details
  const planConfig = {
    BASIC: {
      name: "Basic",
      color: "from-blue-500 to-cyan-500",
      icon: Zap,
    },
    PREMIUM: {
      name: "Premium",
      color: "from-purple-500 to-pink-500",
      icon: Sparkles,
    },
    ENTERPRISE: {
      name: "Enterprise",
      color: "from-orange-500 to-red-500",
      icon: Shield,
    },
  };

  const currentPlan =
    planConfig[subscription.plan as keyof typeof planConfig] ||
    planConfig.BASIC;
  const PlanIcon = currentPlan.icon;

  // Feature mapping for better display
  const featureDisplayNames: Record<string, string> = {
    deals_management: "Deal Management",
    desktop_app_access: "Desktop App Access",
    custom_document_upload: "Custom Document Upload",
    advanced_analytics: "Advanced Analytics",
    priority_support: "Priority Support",
    team_collaboration: "Team Collaboration",
    unlimited_storage: "Unlimited Storage",
    api_access: "API Access",
    white_label: "White Label Branding",
  };

  const nextBillingDate = new Date(
    subscription.currentPeriodStart + 30 * 24 * 60 * 60 * 1000
  );
  const daysUntilRenewal = Math.ceil(
    (nextBillingDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Plan Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-card via-card to-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 bg-gradient-to-br ${currentPlan.color} rounded-xl`}
                >
                  <PlanIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Current Plan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {currentPlan.name} -{" "}
                    {subscription.billingCycle === "MONTHLY"
                      ? "Monthly"
                      : "Annual"}{" "}
                    Billing
                  </CardDescription>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2">{subscription.plan}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-background/50 backdrop-blur">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Next Billing Date
                  </p>
                  <p className="font-semibold">
                    {nextBillingDate.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {daysUntilRenewal} days remaining
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-background/50 backdrop-blur">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold text-green-600 capitalize">
                    {subscription.status}
                  </p>
                  {subscription.cancelAtPeriodEnd && (
                    <p className="text-xs text-orange-600">
                      Cancels on {nextBillingDate.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleViewPlans}>
                Upgrade Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!subscription.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  className="ml-auto text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to cancel your subscription? You'll retain access until the end of your billing period."
                      )
                    ) {
                      cancelSubscriptionMutation.mutate();
                    }
                  }}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Track your resource usage this billing period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storage Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Storage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
                </span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(storagePercentage)}% used
              </p>
            </div>

            {/* Team Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Team Members</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usersCount} / {usersLimit}
                </span>
              </div>
              <Progress value={usersPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(usersPercentage)}% used
              </p>
            </div>

            {/* API Calls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    API Calls (This Month)
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {apiCallsUsed.toLocaleString()} /{" "}
                  {apiCallsLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={apiCallsPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(apiCallsPercentage)}% used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
            <CardDescription>
              Features included in your {currentPlan.name} plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subscription.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-accent/50"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium">
                    {featureDisplayNames[feature] ||
                      feature
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Prompt */}
        {subscription.plan === "BASIC" && (
          <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/10 via-background to-background">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Upgrade to Premium
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get advanced analytics, priority support, and more team
                    members with our Premium plan.
                  </p>
                  <Button onClick={handleViewPlans}>
                    View Premium Features
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
