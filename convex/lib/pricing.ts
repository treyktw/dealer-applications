/**
 * Centralized Pricing Configuration
 * Used across Polar products, frontend UI, and license validation
 */

export const PRICING_CONFIG = {
  currency: "USD",
  tiers: {
    single: {
      id: "single",
      name: "Single License",
      description: "Perfect for solo dealers or small operations",
      price: 497,
      priceMonthly: null, // One-time purchase
      maxActivations: 1,
      features: [
        "1 device activation",
        "Full access to all features",
        "Lifetime updates",
        "Email support",
        "Document generation",
        "Client & inventory management",
        "Deal tracking",
      ],
      recommended: false,
    },
    team: {
      id: "team",
      name: "Team License",
      description: "For growing dealerships with multiple staff",
      price: 997,
      priceMonthly: null,
      maxActivations: 5,
      features: [
        "5 device activations",
        "All Single features",
        "Priority email support",
        "Team collaboration tools",
        "Advanced reporting",
        "Custom document templates",
        "Multi-user workflows",
      ],
      recommended: true,
    },
    enterprise: {
      id: "enterprise",
      name: "Enterprise License",
      description: "Unlimited devices for large dealership groups",
      price: 2497,
      priceMonthly: null,
      maxActivations: -1, // Unlimited
      features: [
        "Unlimited device activations",
        "All Team features",
        "Priority phone & email support",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced security features",
        "SLA guarantees",
        "On-premise deployment option",
      ],
      recommended: false,
    },
  },

  // Optional: Subscription pricing (if you want to offer monthly option)
  subscriptions: {
    monthly: {
      id: "monthly",
      name: "Monthly Subscription",
      description: "Pay as you go with no long-term commitment",
      price: 49,
      priceMonthly: 49,
      billingCycle: "monthly",
      maxActivations: 1,
      features: [
        "1 device activation",
        "All features included",
        "Cancel anytime",
        "Always up-to-date",
        "Email support",
      ],
    },
    annual: {
      id: "annual",
      name: "Annual Subscription",
      description: "Best value - save 17% with annual billing",
      price: 490,
      priceMonthly: 40.83,
      billingCycle: "annual",
      maxActivations: 1,
      features: [
        "1 device activation",
        "All features included",
        "2 months free",
        "Priority support",
        "Annual license renewal",
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

  // Polar product IDs (set these after creating products in Polar)
  polarProductIds: {
    single: process.env.POLAR_PRODUCT_SINGLE_ID || "",
    team: process.env.POLAR_PRODUCT_TEAM_ID || "",
    enterprise: process.env.POLAR_PRODUCT_ENTERPRISE_ID || "",
    monthly: process.env.POLAR_PRODUCT_MONTHLY_ID || "",
    annual: process.env.POLAR_PRODUCT_ANNUAL_ID || "",
  },

  // Feature comparison matrix
  featureComparison: {
    core: {
      name: "Core Features",
      features: {
        clientManagement: { name: "Client Management", single: true, team: true, enterprise: true },
        inventoryManagement: { name: "Inventory Management", single: true, team: true, enterprise: true },
        dealTracking: { name: "Deal Tracking", single: true, team: true, enterprise: true },
        documentGeneration: { name: "Document Generation", single: true, team: true, enterprise: true },
        digitalSignatures: { name: "Digital Signatures", single: true, team: true, enterprise: true },
      },
    },
    collaboration: {
      name: "Collaboration",
      features: {
        multiUser: { name: "Multi-User Access", single: false, team: true, enterprise: true },
        teamWorkflows: { name: "Team Workflows", single: false, team: true, enterprise: true },
        rolePermissions: { name: "Role-based Permissions", single: false, team: true, enterprise: true },
      },
    },
    advanced: {
      name: "Advanced Features",
      features: {
        advancedReporting: { name: "Advanced Reporting", single: false, team: true, enterprise: true },
        customTemplates: { name: "Custom Templates", single: false, team: true, enterprise: true },
        apiAccess: { name: "API Access", single: false, team: false, enterprise: true },
        customIntegrations: { name: "Custom Integrations", single: false, team: false, enterprise: true },
        onPremise: { name: "On-Premise Option", single: false, team: false, enterprise: true },
      },
    },
    support: {
      name: "Support",
      features: {
        emailSupport: { name: "Email Support", single: "Standard", team: "Priority", enterprise: "24/7 Priority" },
        phoneSupport: { name: "Phone Support", single: false, team: false, enterprise: true },
        accountManager: { name: "Dedicated Account Manager", single: false, team: false, enterprise: true },
        sla: { name: "SLA Guarantee", single: false, team: false, enterprise: true },
      },
    },
  },
} as const;

export type PricingTier = keyof typeof PRICING_CONFIG.tiers;
export type SubscriptionTier = keyof typeof PRICING_CONFIG.subscriptions;

/**
 * Get pricing for a specific tier
 */
export function getTierPrice(tier: PricingTier): number {
  return PRICING_CONFIG.tiers[tier].price;
}

/**
 * Get max activations for a tier
 */
export function getTierMaxActivations(tier: PricingTier): number {
  return PRICING_CONFIG.tiers[tier].maxActivations;
}

/**
 * Calculate discounted price
 */
export function getDiscountedPrice(price: number, discountPercent: number): number {
  return Math.round(price * (1 - discountPercent));
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = PRICING_CONFIG.currency): string {
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
export function isPromotionActive(promoId: keyof typeof PRICING_CONFIG.promotions): boolean {
  const promo = PRICING_CONFIG.promotions[promoId];
  if (!promo.enabled) return false;
  if (promo.expiresAt && promo.expiresAt < Date.now()) return false;
  return true;
}

/**
 * Get tier by Polar product ID
 */
export function getTierByPolarProductId(productId: string): PricingTier | null {
  const entries = Object.entries(PRICING_CONFIG.polarProductIds);
  const found = entries.find(([_, id]) => id === productId);
  return found ? (found[0] as PricingTier) : null;
}
