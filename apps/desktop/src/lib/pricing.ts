/**
 * Centralized Pricing Configuration
 * Used across Stripe products, frontend UI, and license validation
 *
 *
 *
 *
 * TRHIS IS A COPY DO NOT MODIFY THIS FILE WITHOUT CHANGING THE ONE IN CONVEX AS WELL!
 */

export const PRICING_CONFIG = {
  currency: "USD",

  // Monthly subscriptions (Stripe)
  // PRIMARY MONETIZATION METHOD for standalone desktop app
  subscriptions: {
    monthly: {
      id: "monthly",
      name: "Monthly Subscription",
      description: "Pay as you go with no long-term commitment",
      price: 49,
      priceMonthly: 49,
      billingCycle: "monthly" as const,
      stripeProductId:
        import.meta.env.VITE_STRIPE_PRODUCT_MONTHLY_ID || "prod_TNNBPshhrVHuTv",
      stripePriceId:
        import.meta.env.VITE_STRIPE_PRICE_MONTHLY_ID ||
        "price_1SQcQqIjHWM6MrLtPPXHH2Dq",
      features: [
        "Unlimited deals",
        "Unlimited clients & vehicles",
        "Document generation",
        "Local data storage",
        "Email support",
      ],
    },
    annual: {
      id: "annual",
      name: "Annual Subscription",
      description: "Best value - save 17% with annual billing",
      price: 490,
      priceMonthly: 40.83,
      billingCycle: "annual" as const,
      stripeProductId:
        import.meta.env.VITE_STRIPE_PRODUCT_ANNUAL_ID || "prod_TNNBWF098W9zB8",
      stripePriceId:
        import.meta.env.VITE_STRIPE_PRICE_ANNUAL_ID ||
        "price_1SQcRJIjHWM6MrLtQXiu1GYf",
      features: [
        "All Monthly features",
        "2 months free",
        "Priority email support",
        "Early access to features",
      ],
    },
  },

  // Early bird / promotional pricing
  promotions: {
    earlyBird: {
      enabled: false, // Set to true to enable
      discount: 0.3, // 30% off
      expiresAt: null, // Set timestamp when promotion ends
      limitedTo: 100, // First 100 customers
      message: "Early Bird Special - 30% off for first 100 customers!",
    },
    launch: {
      enabled: false,
      discount: 0.2, // 20% off
      expiresAt: null,
      code: "LAUNCH20",
      message: "Launch Special - 20% off with code LAUNCH20",
    },
  },

  // Add-ons (optional)
  addons: {
    prioritySupport: {
      id: "priority_support",
      name: "Priority Support Upgrade",
      price: 197,
      billingCycle: "annual",
      description: "Get phone support and faster response times",
    },
    customIntegration: {
      id: "custom_integration",
      name: "Custom Integration",
      price: 997,
      billingCycle: "one-time",
      description: "Custom integration with your existing systems",
    },
  },

  // Stripe product IDs (set these after creating products in Stripe)
  stripeProductIds: {
    monthly: import.meta.env.VITE_STRIPE_PRODUCT_MONTHLY_ID || "",
    annual: import.meta.env.VITE_STRIPE_PRODUCT_ANNUAL_ID || "",
  },

  // Stripe price IDs (set these after creating prices in Stripe)
  stripePriceIds: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY_ID || "",
    annual: import.meta.env.VITE_STRIPE_PRICE_ANNUAL_ID || "",
  },
} as const;

export type SubscriptionTier = keyof typeof PRICING_CONFIG.subscriptions;

/**
 * Calculate discounted price
 */
export function getDiscountedPrice(
  price: number,
  discountPercent: number
): number {
  return Math.round(price * (1 - discountPercent));
}

/**
 * Format price for display
 */
export function formatPrice(
  price: number,
  currency: string = PRICING_CONFIG.currency
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Check if promotion is active
 */
export function isPromotionActive(
  promoId: keyof typeof PRICING_CONFIG.promotions
): boolean {
  const promo = PRICING_CONFIG.promotions[promoId];
  if (!promo.enabled) return false;
  if (promo.expiresAt && promo.expiresAt < Date.now()) return false;
  return true;
}

/**
 * Get subscription tier by Stripe product ID
 */
export function getSubscriptionTierByStripeProductId(
  productId: string
): SubscriptionTier | null {
  const entries = Object.entries(PRICING_CONFIG.stripeProductIds);
  const found = entries.find(([_, id]) => id === productId);
  return found ? (found[0] as SubscriptionTier) : null;
}

/**
 * Get subscription tier by Stripe price ID
 */
export function getSubscriptionTierByStripePriceId(
  priceId: string
): SubscriptionTier | null {
  const entries = Object.entries(PRICING_CONFIG.stripePriceIds);
  const found = entries.find(([_, id]) => id === priceId);
  return found ? (found[0] as SubscriptionTier) : null;
}
