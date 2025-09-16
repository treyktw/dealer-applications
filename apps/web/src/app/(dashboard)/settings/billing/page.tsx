"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  stripePriceId: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!,
    features: [
      "Up to 100 vehicles",
      "Basic inventory management",
      "Customer database",
      "Email notifications",
      "Standard support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    features: [
      "Up to 500 vehicles",
      "Advanced inventory management",
      "Customer CRM",
      "Email & SMS notifications",
      "Priority support",
      "Marketing tools",
      "Analytics dashboard",
    ],
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID!,
    features: [
      "Unlimited vehicles",
      "Full feature access",
      "Advanced CRM",
      "All notification channels",
      "24/7 Premium support",
      "Advanced marketing",
      "Custom analytics",
      "API access",
    ],
  },
];

interface BillingFormData {
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  billingCountry: string;
}

interface PaymentFormProps {
  planId: string;
  dealershipId: Id<"dealerships">;
  onSuccess: () => void;
}

function PaymentForm({ planId, dealershipId, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [billingData, setBillingData] = useState<BillingFormData>({
    billingEmail: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZipCode: "",
    billingCountry: "",
  });
  const createSubscription = useMutation(api.subscriptions.createInitialSubscription);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      const { error: paymentError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
      });

      if (paymentError) {
        throw paymentError;
      }

      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Invalid plan");

      await createSubscription({
        dealershipId,
        plan: plan.id,
        billingCycle: "monthly",
        stripeCustomerId: paymentMethod.id,
        ...billingData,
      });

      toast.success("Subscription created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label htmlFor="billingEmail" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            type="email"
            id="billingEmail"
            value={billingData.billingEmail}
            onChange={(e) => setBillingData(prev => ({ ...prev, billingEmail: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="billingAddress" className="block text-sm font-medium mb-1">
            Address
          </label>
          <input
            type="text"
            id="billingAddress"
            value={billingData.billingAddress}
            onChange={(e) => setBillingData(prev => ({ ...prev, billingAddress: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="billingCity" className="block text-sm font-medium mb-1">
              City
            </label>
            <input
              type="text"
              id="billingCity"
              value={billingData.billingCity}
              onChange={(e) => setBillingData(prev => ({ ...prev, billingCity: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="billingState" className="block text-sm font-medium mb-1">
              State
            </label>
            <input
              type="text"
              id="billingState"
              value={billingData.billingState}
              onChange={(e) => setBillingData(prev => ({ ...prev, billingState: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="billingZipCode" className="block text-sm font-medium mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              id="billingZipCode"
              value={billingData.billingZipCode}
              onChange={(e) => setBillingData(prev => ({ ...prev, billingZipCode: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="billingCountry" className="block text-sm font-medium mb-1">
              Country
            </label>
            <input
              type="text"
              id="billingCountry"
              value={billingData.billingCountry}
              onChange={(e) => setBillingData(prev => ({ ...prev, billingCountry: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Payment Details</h3>
        <PaymentElement />
      </div>
      <Button type="submit" className="w-full mt-6" disabled={loading}>
        {loading ? "Processing..." : "Subscribe"}
      </Button>
    </form>
  );
}

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const dealership = useQuery(api.dealerships.getCurrentDealership);
  const subscription = useQuery(api.subscriptions.getDealershipSubscription, 
    dealership?._id ? { dealershipId: dealership._id } : "skip"
  );
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);
  const updateSubscription = useMutation(api.subscriptions.updateSubscriptionPlan);

  if (dealership === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Please sign in to access billing</h2>
          <p className="text-muted-foreground mt-2">You need to be authenticated to view this page.</p>
        </div>
      </div>
    );
  }

  if (dealership === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold">No Dealership Found</h2>
          <p className="text-muted-foreground mt-2">You need to be associated with a dealership to access billing.</p>
        </div>
      </div>
    );
  }

  if (!dealership._id) {
    return <div>Loading...</div>;
  }

  const handleUpgrade = async (planId: string) => {
    if (!subscription) {
      setSelectedPlan(planId);
      setShowPaymentForm(true);
      return;
    }

    try {
      await updateSubscription({
        subscriptionId: subscription._id,
        newPlan: planId,
        newBillingCycle: "monthly",
      });
      toast.success("Plan updated successfully!");
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    
    try {
      await cancelSubscription({ subscriptionId: subscription._id });
      toast.success("Subscription cancelled successfully");
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription plan and payment methods
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription plan and usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{subscription?.plan || "No active plan"}</h3>
              <p className="text-sm text-muted-foreground">
                {subscription?.billingCycle || "No subscription"}
              </p>
            </div>
            <Badge variant={subscription?.status === "active" ? "default" : "outline"}>
              {subscription?.status || "Inactive"}
            </Badge>
          </div>
          {subscription && (
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">Next billing date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Amount due</p>
                <p className="text-sm text-muted-foreground">
                  ${plans.find(p => p.id === subscription.plan)?.price || 0}.00
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      {showPaymentForm && selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Subscription</CardTitle>
            <CardDescription>Enter your payment details to subscribe</CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <PaymentForm
                planId={selectedPlan}
                dealershipId={dealership._id!}
                onSuccess={() => {
                  setShowPaymentForm(false);
                  setSelectedPlan(null);
                }}
              />
            </Elements>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.isPopular ? "border-primary" : undefined}>
            {plan.isPopular && (
              <Badge className="absolute top-28 right-2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold">${plan.price}</span>
                /month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={plan.id === subscription?.plan ? "outline" : "default"}
                className="w-full"
                disabled={plan.id === subscription?.plan}
                onClick={() => handleUpgrade(plan.id)}
              >
                {plan.id === subscription?.plan ? "Current Plan" : "Upgrade"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Cancel Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>Cancel Subscription</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Warning: Cancelling your subscription will remove access to premium features at the end of your billing period.
            </p>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 