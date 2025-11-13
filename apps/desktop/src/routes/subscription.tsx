// src/routes/subscription.tsx - Cleaned up subscription page
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Sparkles,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/subscription")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { user, token } = useAuth();
  
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", user?.dealershipId],
    queryFn: async () => {
      if (!user?.dealershipId) {
        throw new Error("User not associated with a dealership");
      }
      
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      return await convexClient.query(api.api.subscriptions.getDealershipSubscription, { 
        dealershipId: user.dealershipId as Id<"dealerships">,
        token: token
      });
    },
    enabled: !!user?.dealershipId && !!token,
  });

  if (subscriptionLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading subscription details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle no subscription
  if (!subscription) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription and billing information
            </p>
          </div>

          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-6">
                You don't have an active subscription yet. Subscribe to unlock all features.
              </p>
              <Button size="lg" onClick={() => {
                window.open("https://dealer.universalautobrokers.net/subscription", "_blank");
              }}>
                <ArrowUpCircle className="mr-2 h-5 w-5" />
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Get plan icon
  const planConfig = {
    BASIC: {
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
    },
    PREMIUM: {
      icon: Sparkles,
      color: "from-purple-500 to-pink-500",
    },
    ENTERPRISE: {
      icon: Shield,
      color: "from-orange-500 to-red-500",
    },
  };

  const currentPlan = planConfig[subscription.plan as keyof typeof planConfig] || planConfig.BASIC;
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and features
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-card via-card to-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 bg-gradient-to-br ${currentPlan.color} rounded-xl`}>
                  <PlanIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle>Subscription Status</CardTitle>
                  <CardDescription className="mt-1">
                    Your current subscription status
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={subscription.status === "active" ? "default" : "secondary"}
                className="text-sm"
              >
                {subscription.status === "active" ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    {subscription.status}
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a href="https://dealer.universalautobrokers.net/settings/billing" target="_blank" rel="noopener noreferrer">Manage Subscription</a>
            </Button>
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Available Features</CardTitle>
            <CardDescription>Features included in your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subscription.features.map((feature: string) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{featureDisplayNames[feature] || feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}