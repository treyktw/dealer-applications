// app/(onboarding)/subscription/page.tsx - NEW FILE
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, CreditCard, Building2 } from 'lucide-react';
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SubscriptionPage() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Convex mutations and queries
  const createCheckoutSession = useAction(api.subscriptions.createCheckoutSession);
  const createUser = useMutation(api.users.createUser);
  const subscriptionStatus = useQuery(api.subscriptions.checkSubscriptionStatus, {});

  // Create user when component mounts
  useEffect(() => {
    if (user && isLoaded) {
      console.log("Creating user during subscription flow for:", user.id);
      createUser({
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
        clerkId: user.id,
      }).catch((error) => {
        console.error("Error creating user during subscription:", error);
      });
    }
  }, [user, isLoaded, createUser]);

  // Redirect if user already has active subscription
  useEffect(() => {
    if (subscriptionStatus?.hasActiveSubscription) {
      console.log("User already has active subscription, redirecting to onboarding");
      router.push('/onboarding');
    }
  }, [subscriptionStatus, router]);

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (!user) {
      toast.error('User not loaded');
      return;
    }

    // Check if priceId is valid
    if (!priceId || priceId.includes('placeholder')) {
      toast.error('Stripe price IDs not configured. Please set up your environment variables.');
      console.error('Missing Stripe price ID for plan:', planName);
      return;
    }

    try {
      setIsSubscribing(true);
      console.log("Starting subscription process for plan:", planName, "with priceId:", priceId);

      const { url } = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/onboarding?subscription=success`,
        cancelUrl: `${window.location.origin}/subscription?subscription=cancelled`,
      });

      if (!url) throw new Error("No checkout URL returned");

      console.log("Redirecting to Stripe checkout:", url);
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start subscription: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // If user already has a subscription (pending or active), show different message
  if (subscriptionStatus?.hasPendingSubscription) {
    return (
      <div className="container max-w-2xl py-20 mx-auto min-h-screen flex items-center">
        <Card className="w-full border-yellow-200 bg-yellow-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-900">Subscription Processing</CardTitle>
            <CardDescription className="text-yellow-700">
              Your subscription is being processed. You can now proceed to create your dealership.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/onboarding')}>
              Continue to Dealership Setup
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const plans = [
    {
      name: "Basic",
      price: "$49",
      period: "month",
      description: "Perfect for small dealerships",
      priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID || "price_basic_monthly_placeholder",
      features: [
        "Up to 100 vehicles",
        "Basic inventory management", 
        "Customer management",
        "5GB file storage",
        "REST API access",
        "Email support"
      ],
      recommended: false
    },
    {
      name: "Premium", 
      price: "$79",
      period: "month",
      description: "For growing dealerships",
      priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly_placeholder",
      features: [
        "Up to 500 vehicles",
        "Advanced inventory management",
        "Customer management", 
        "Deal tracking",
        "50GB file storage",
        "REST API access",
        "Advanced analytics",
        "Priority support"
      ],
      recommended: true
    },
    {
      name: "Enterprise",
      price: "$199", 
      period: "month",
      description: "For large dealerships",
      priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "price_enterprise_monthly_placeholder",
      features: [
        "Unlimited vehicles",
        "Full feature access",
        "Custom integrations",
        "Unlimited file storage", 
        "REST API access",
        "Advanced analytics",
        "24/7 dedicated support",
        "Custom branding"
      ],
      recommended: false
    }
  ];

  return (
    <div className="container max-w-6xl py-20 mx-auto min-h-screen flex flex-col items-center justify-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get started with your dealership management system. Choose the plan that fits your needs.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.recommended ? 'border-primary ring-2 ring-primary/20' : ''}`}
          >
            {plan.recommended && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                Recommended
              </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => handleSubscribe(plan.priceId, plan.name)}
                disabled={isSubscribing}
                className={`w-full ${plan.recommended ? 'bg-primary' : ''}`}
                variant={plan.recommended ? 'default' : 'outline'}
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscribe to {plan.name}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
          <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
          <p className="text-sm text-blue-700">
            After subscribing, you&apos;ll set up your dealership profile and get access to your REST API endpoints for website integration.
          </p>
        </div>
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-zinc-900 rounded-lg p-4 max-w-2xl mx-auto">
            <h4 className="font-medium text-sm mb-2">Debug Info (Development Only)</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Basic Price ID: {process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID || 'Not Set'}</div>
              <div>Premium Price ID: {process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'Not Set'}</div>
              <div>Enterprise Price ID: {process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'Not Set'}</div>
            </div>
            {(!process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID) && (
              <div className="mt-2 text-xs text-red-600">
                ⚠️ Stripe price IDs not configured. Add them to your .env.local file.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}