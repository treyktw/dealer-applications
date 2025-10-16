"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

interface FeatureGateProps {
  children: React.ReactNode;
  requiredPlan?: "basic" | "premium" | "enterprise";
  fallback?: React.ReactNode;
}

export function FeatureGate({ children, requiredPlan, fallback }: FeatureGateProps) {
  const subscription = useQuery(api.subscriptions.checkSubscriptionStatus);

  if (!subscription?.hasActiveSubscription) {
    return fallback || (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Subscription Required</AlertTitle>
        <AlertDescription>
          This feature requires an active subscription.
          <Button asChild className="ml-4">
            <Link href="/settings/billing">Upgrade Now</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (requiredPlan) {
    const planLevels = {
      basic: 1,
      premium: 2,
      enterprise: 3,
    };

    const currentPlanLevel = planLevels[subscription.subscription?.plan as keyof typeof planLevels] || 0;
    const requiredPlanLevel = planLevels[requiredPlan];

    if (currentPlanLevel < requiredPlanLevel) {
      return fallback || (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Upgrade Required</AlertTitle>
          <AlertDescription>
            This feature requires the {requiredPlan} plan.
            <Button asChild className="ml-4">
              <Link href="/settings/billing">Upgrade Now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
  }

  return <>{children}</>;
} 