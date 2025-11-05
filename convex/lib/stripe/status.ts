// convex/lib/stripe/status.ts
// Stripe status mapping utilities

import Stripe from "stripe";
import { SubscriptionStatus } from "../../schema";

/**
 * Map Stripe subscription status to our internal status
 * Handles all possible Stripe subscription states
 */
export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: SubscriptionStatus.ACTIVE,
    trialing: SubscriptionStatus.ACTIVE, // Treat trial as active
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    unpaid: SubscriptionStatus.CANCELLED, // Treat unpaid as cancelled
    incomplete: SubscriptionStatus.PENDING,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    paused: SubscriptionStatus.PAST_DUE, // Treat paused as past due
  };

  const mappedStatus = statusMap[stripeStatus];

  if (!mappedStatus) {
    console.warn(`⚠️ Unknown Stripe status: ${stripeStatus}, defaulting to PENDING`);
    return SubscriptionStatus.PENDING;
  }

  return mappedStatus;
}

/**
 * Check if a status represents an active subscription
 */
export function isActiveStatus(status: string): boolean {
  return status === SubscriptionStatus.ACTIVE;
}

/**
 * Check if a status represents a problematic state that needs user action
 */
export function requiresUserAction(status: string): boolean {
  return [
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
  ].includes(status);
}

/**
 * Get user-friendly message for a subscription status
 */
export function getStatusMessage(status: string): {
  title: string;
  message: string;
  action?: string;
} {
  const messages: Record<
    string,
    { title: string; message: string; action?: string }
  > = {
    [SubscriptionStatus.ACTIVE]: {
      title: "Active",
      message: "Your subscription is active and all features are available.",
    },
    [SubscriptionStatus.PAST_DUE]: {
      title: "Payment Required",
      message: "Your payment failed. Please update your payment method to continue using the service.",
      action: "Update Payment Method",
    },
    [SubscriptionStatus.CANCELLED]: {
      title: "Subscription Cancelled",
      message: "Your subscription has been cancelled. Renew to regain access.",
      action: "Renew Subscription",
    },
    [SubscriptionStatus.EXPIRED]: {
      title: "Subscription Expired",
      message: "Your subscription has expired. Subscribe again to continue.",
      action: "Subscribe Now",
    },
    [SubscriptionStatus.PENDING]: {
      title: "Payment Processing",
      message: "Your payment is being processed. This usually takes a few moments.",
    },
  };

  return (
    messages[status] || {
      title: "Unknown Status",
      message: "Please contact support for assistance.",
    }
  );
}

/**
 * Determine if features should be available based on status
 */
export function canAccessFeatures(status: string): boolean {
  return status === SubscriptionStatus.ACTIVE;
}
