// src/routes/standalone/subscription.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  Calendar,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api, type Id } from "@dealer/convex";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { formatPrice } from "@/lib/pricing";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { convexAction } from "@/lib/convex";

export const Route = createFileRoute("/standalone/subscription")({
  component: StandaloneSubscriptionPage,
});

function ManageSubscriptionButton({ 
  userId, 
  returnUrl 
}: { 
  userId: Id<"standalone_users">; 
  returnUrl: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { url } = await convexAction(api.api.standaloneSubscriptions.createBillingPortalSession, {
        userId,
        returnUrl,
      });
      
      if (url) {
        await invoke("open_url", { url });
        toast.info("Opening Stripe billing portal in your browser...");
      }
    } catch (error) {
      console.error("Failed to create billing portal session:", error);
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleManageSubscription}
      disabled={loading}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          Opening...
        </>
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Manage Subscription in Stripe
        </>
      )}
    </Button>
  );
}

function StandaloneSubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useUnifiedAuth();

  // Get user's subscription
  // Note: user.id is a string from useUnifiedAuth, but we need to cast it to Convex Id
  const subscription = useQuery(
    api.api.standaloneSubscriptions.getUserSubscription,
    user?.id ? { userId: user.id as unknown as Id<"standalone_users"> } : "skip"
  );

  if (!user) {
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
              <Button 
                size="lg" 
                onClick={() => navigate({ to: "/subscribe" })}
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isActive = subscription.status === "active";
  const planName = subscription.planName === "monthly" ? "Monthly" : "Annual";
  const nextBillingDate = new Date(subscription.currentPeriodEnd);
  const formattedAmount = formatPrice(subscription.amount / 100, subscription.currency.toUpperCase());

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

        {/* Status Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-card via-card to-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-primary to-primary/60 rounded-xl">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle>Subscription Status</CardTitle>
                  <CardDescription className="mt-1">
                    Your current subscription plan
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="text-sm"
              >
                {isActive ? (
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
          <CardContent className="space-y-6">
            {/* Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm text-muted-foreground mb-1">Plan</p>
                <p className="text-xl font-semibold">{planName} Plan</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className="text-xl font-semibold">
                  {formattedAmount} / {subscription.interval === "month" ? "month" : "year"}
                </p>
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Next Billing Date</p>
                    <p className="text-sm text-muted-foreground">
                      {nextBillingDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Subscription will cancel
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Your subscription will end on {nextBillingDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Manage Subscription Button */}
            <ManageSubscriptionButton 
              userId={user.id as unknown as Id<"standalone_users">}
              returnUrl={window.location.href}
            />
          </CardContent>
        </Card>

        {/* Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Included Features</CardTitle>
            <CardDescription>
              Features included in your {planName.toLowerCase()} subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Deal Management",
                "Client Management",
                "Vehicle Management",
                "PDF Generation",
                "Local Data Storage",
                "Desktop App Access",
                "Email Support",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade/Downgrade Options */}
        {subscription.planName === "monthly" && (
          <Card>
            <CardHeader>
              <CardTitle>Upgrade to Annual</CardTitle>
              <CardDescription>
                Save money with an annual subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Switch to an annual plan and save $98 per year. You'll be charged annually instead of monthly.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/subscribe" })}
              >
                View Annual Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
