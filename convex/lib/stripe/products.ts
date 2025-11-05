// convex/lib/stripe/products.ts
// Stripe product and price ID management

import { SubscriptionPlan, BillingCycle } from "../../schema";

/**
 * Stripe price IDs from environment variables
 * These are configured in the Stripe Dashboard and referenced here
 */
export const STRIPE_PRICE_IDS = {
  BASIC_MONTHLY: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "",
  BASIC_YEARLY: process.env.STRIPE_BASIC_YEARLY_PRICE_ID || "",
  PREMIUM_MONTHLY: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "",
  PREMIUM_YEARLY: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || "",
  ENTERPRISE_MONTHLY: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "",
  ENTERPRISE_YEARLY: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || "",
} as const;

/**
 * Get Stripe price ID for a given plan and billing cycle
 */
export function getPriceId(plan: string, cycle: string): string {
  const key = `${plan.toUpperCase()}_${cycle.toUpperCase()}` as keyof typeof STRIPE_PRICE_IDS;
  const priceId = STRIPE_PRICE_IDS[key];

  if (!priceId) {
    throw new Error(`Price ID not configured for ${plan} ${cycle}`);
  }

  return priceId;
}

/**
 * Parse a Stripe price ID to determine plan and cycle
 * Useful for webhook handlers
 */
export function parsePriceId(priceId: string): {
  plan: string;
  cycle: string;
} | null {
  const entry = Object.entries(STRIPE_PRICE_IDS).find(([, id]) => id === priceId);

  if (!entry) {
    return null;
  }

  const [key] = entry;
  const [plan, cycle] = key.split("_");

  return {
    plan: plan.toLowerCase(),
    cycle: cycle.toLowerCase(),
  };
}

/**
 * Validate that all required price IDs are configured
 */
export function validatePriceIds(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  Object.entries(STRIPE_PRICE_IDS).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get display name for a plan
 */
export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    basic: "Basic",
    premium: "Premium",
    enterprise: "Enterprise",
  };

  return names[plan.toLowerCase()] || plan;
}

/**
 * Get display name for billing cycle
 */
export function getCycleDisplayName(cycle: string): string {
  const names: Record<string, string> = {
    monthly: "Monthly",
    yearly: "Yearly (Save 20%)",
  };

  return names[cycle.toLowerCase()] || cycle;
}

/**
 * Get price amount in cents (for display)
 * These are hardcoded but could be fetched from Stripe API
 */
export function getPriceAmount(plan: string, cycle: string): number {
  const prices: Record<string, Record<string, number>> = {
    basic: {
      monthly: 4900, // $49/month
      yearly: 47040, // $39.20/month * 12 = $470.40/year (20% off)
    },
    premium: {
      monthly: 7900, // $79/month
      yearly: 75840, // $63.20/month * 12 = $758.40/year (20% off)
    },
    enterprise: {
      monthly: 19900, // $199/month
      yearly: 191040, // $159.20/month * 12 = $1910.40/year (20% off)
    },
  };

  return prices[plan.toLowerCase()]?.[cycle.toLowerCase()] || 0;
}

/**
 * Format price for display
 */
export function formatPrice(amountInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
}
