// src/components/subscription/SubscriptionRequiredScreen.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, Crown, Zap, Building2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { convexAction } from "@/lib/convex";
import { api } from "@dealer/convex";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "$99",
    period: "per month",
    description: "Perfect for small dealerships getting started",
    icon: Building2,
    features: [
      "Up to 50 deals per month",
      "Basic document management",
      "Email support",
      "1 user account",
      "Standard templates",
    ],
    priceId: import.meta.env.VITE_STRIPE_BASIC_MONTHLY_PRICE_ID,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$299",
    period: "per month",
    popular: true,
    description: "Most popular for growing dealerships",
    icon: Zap,
    features: [
      "Unlimited deals",
      "Advanced document management",
      "Priority support",
      "5 user accounts",
      "Custom branding",
      "API access",
      "Advanced analytics",
    ],
    priceId: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For large dealerships with custom needs",
    icon: Crown,
    features: [
      "Everything in Premium",
      "Unlimited users",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Training & onboarding",
      "White-label options",
    ],
    priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
  },
];

export function SubscriptionRequiredScreen() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const createCheckout = useMutation({
    mutationFn: async (priceId: string) => {
      const result = await convexAction(api.api.subscriptions.createCheckoutSession, {
        priceId,
        successUrl: `${window.location.origin}/?subscription=success`,
        cancelUrl: `${window.location.origin}/?subscription=cancelled`,
      });
      return result;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(`Failed to create checkout: ${error.message}`);
      setSelectedPlan(null);
    },
  });

  const handleSelectPlan = (plan: typeof PLANS[0]) => {
    if (plan.id === "enterprise") {
      // For enterprise, show contact sales
      toast.success("Please contact our sales team for enterprise pricing");
      window.location.href = "mailto:sales@yourcompany.com";
      return;
    }

    if (!plan.priceId) {
      toast.error("Price ID not configured for this plan");
      return;
    }

    setSelectedPlan(plan.id);
    createCheckout.mutate(plan.priceId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 p-6">
      <div className="max-w-7xl w-full space-y-8">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select a subscription plan to unlock all features and start managing your dealership
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={
                  plan.popular
                    ? "border-primary border-2 relative shadow-lg scale-105"
                    : "relative"
                }
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary shadow-lg">
                      <Crown className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.period}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isLoading || createCheckout.isPending}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : plan.id === "enterprise" ? (
                      "Contact Sales"
                    ) : (
                      "Get Started"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <Button variant="link" size="sm">
              Compare Plans
            </Button>
            <span className="text-muted-foreground">•</span>
            <Button variant="link" size="sm">
              Contact Sales
            </Button>
            <span className="text-muted-foreground">•</span>
            <Button variant="link" size="sm">
              View FAQ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}