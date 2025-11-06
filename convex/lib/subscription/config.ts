/**
 * Centralized Subscription Configuration
 * 
 * This file is the single source of truth for all subscription plans,
 * features, pricing, and limits across the entire application.
 * 
 * Update this file to change subscription offerings, and all UI and
 * backend checks will automatically reflect the changes.
 */

// ============================================================================
// PLAN TYPES
// ============================================================================

export const SubscriptionPlan = {
  BASIC: "basic",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
} as const;

export type SubscriptionPlanType = typeof SubscriptionPlan[keyof typeof SubscriptionPlan];

export const BillingCycle = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type BillingCycleType = typeof BillingCycle[keyof typeof BillingCycle];

// ============================================================================
// FEATURE FLAGS (Technical names used in code)
// ============================================================================

export const FeatureFlags = {
  // Inventory
  INVENTORY_MANAGEMENT: "inventory_management",
  
  // Reporting & Analytics
  BASIC_REPORTING: "basic_reporting",
  ADVANCED_REPORTING: "advanced_reporting",
  ANALYTICS: "analytics",
  
  // Management
  EMPLOYEE_MANAGEMENT: "employee_management",
  CUSTOMER_MANAGEMENT: "customer_management",
  
  // Documents
  DOCUMENT_GENERATION: "document_generation",
  CUSTOM_DOCUMENT_UPLOAD: "custom_document_upload",
  
  // Deals
  DEALS_MANAGEMENT: "deals_management",
  
  // Storage
  FILE_STORAGE_5GB: "file_storage_5gb",
  FILE_STORAGE_50GB: "file_storage_50gb",
  FILE_STORAGE_UNLIMITED: "file_storage_unlimited",
  
  // Access & Integration
  API_ACCESS: "api_access",
  DESKTOP_APP_ACCESS: "desktop_app_access",
  CUSTOM_INTEGRATIONS: "custom_integrations",
  
  // Support
  PRIORITY_SUPPORT: "priority_support",
  AUDIT_LOGS: "audit_logs",
} as const;

export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

// ============================================================================
// FEATURE MAPPING BY PLAN
// ============================================================================

export const SubscriptionFeatures: Record<SubscriptionPlanType, FeatureFlag[]> = {
  [SubscriptionPlan.BASIC]: [
    FeatureFlags.INVENTORY_MANAGEMENT,
    FeatureFlags.BASIC_REPORTING,
    FeatureFlags.EMPLOYEE_MANAGEMENT,
    FeatureFlags.CUSTOMER_MANAGEMENT,
    FeatureFlags.FILE_STORAGE_5GB,
  ],
  [SubscriptionPlan.PREMIUM]: [
    FeatureFlags.INVENTORY_MANAGEMENT,
    FeatureFlags.ADVANCED_REPORTING,
    FeatureFlags.EMPLOYEE_MANAGEMENT,
    FeatureFlags.CUSTOMER_MANAGEMENT,
    FeatureFlags.DOCUMENT_GENERATION,
    FeatureFlags.ANALYTICS,
    FeatureFlags.FILE_STORAGE_50GB,
    FeatureFlags.API_ACCESS,
    FeatureFlags.DEALS_MANAGEMENT,
    FeatureFlags.DESKTOP_APP_ACCESS,
    FeatureFlags.CUSTOM_DOCUMENT_UPLOAD,
  ],
  [SubscriptionPlan.ENTERPRISE]: [
    FeatureFlags.INVENTORY_MANAGEMENT,
    FeatureFlags.ADVANCED_REPORTING,
    FeatureFlags.EMPLOYEE_MANAGEMENT,
    FeatureFlags.CUSTOMER_MANAGEMENT,
    FeatureFlags.DOCUMENT_GENERATION,
    FeatureFlags.ANALYTICS,
    FeatureFlags.FILE_STORAGE_UNLIMITED,
    FeatureFlags.API_ACCESS,
    FeatureFlags.CUSTOM_INTEGRATIONS,
    FeatureFlags.PRIORITY_SUPPORT,
    FeatureFlags.AUDIT_LOGS,
    FeatureFlags.DEALS_MANAGEMENT,
    FeatureFlags.DESKTOP_APP_ACCESS,
    FeatureFlags.CUSTOM_DOCUMENT_UPLOAD,
  ],
} as const;

// ============================================================================
// PRICING (in cents)
// ============================================================================

export const SubscriptionPricing: Record<
  SubscriptionPlanType,
  Record<BillingCycleType, number>
> = {
  [SubscriptionPlan.BASIC]: {
    [BillingCycle.MONTHLY]: 4900, // $49/month
    [BillingCycle.YEARLY]: 47040, // $39.20/month * 12 = $470.40/year (20% off)
  },
  [SubscriptionPlan.PREMIUM]: {
    [BillingCycle.MONTHLY]: 9900, // $99/month
    [BillingCycle.YEARLY]: 95040, // $79.20/month * 12 = $950.40/year (20% off)
  },
  [SubscriptionPlan.ENTERPRISE]: {
    [BillingCycle.MONTHLY]: 19900, // $199/month
    [BillingCycle.YEARLY]: 191040, // $159.20/month * 12 = $1910.40/year (20% off)
  },
} as const;

// ============================================================================
// PLAN LIMITS
// ============================================================================

export interface PlanLimits {
  vehicles: number | "unlimited";
  storageGB: number | "unlimited";
  users: number | "unlimited";
  dealsPerMonth?: number | "unlimited";
}

export const SubscriptionLimits: Record<SubscriptionPlanType, PlanLimits> = {
  [SubscriptionPlan.BASIC]: {
    vehicles: 100,
    storageGB: 5,
    users: 1,
  },
  [SubscriptionPlan.PREMIUM]: {
    vehicles: 500,
    storageGB: 50,
    users: 5,
    dealsPerMonth: "unlimited",
  },
  [SubscriptionPlan.ENTERPRISE]: {
    vehicles: "unlimited",
    storageGB: "unlimited",
    users: "unlimited",
    dealsPerMonth: "unlimited",
  },
} as const;

// ============================================================================
// UI DISPLAY CONFIGURATION
// ============================================================================

export interface PlanDisplayConfig {
  name: string;
  description: string;
  features: string[]; // Human-readable feature descriptions for UI
  isPopular?: boolean;
  isRecommended?: boolean;
}

export const SubscriptionPlanDisplay: Record<SubscriptionPlanType, PlanDisplayConfig> = {
  [SubscriptionPlan.BASIC]: {
    name: "Basic",
    description: "Perfect for small dealerships",
    features: [
      "Up to 100 vehicles",
      "Basic inventory management",
      "Customer management",
      "5GB file storage",
      "REST API access",
      "Email support",
    ],
    isPopular: false,
    isRecommended: false,
  },
  [SubscriptionPlan.PREMIUM]: {
    name: "Premium",
    description: "For growing dealerships",
    features: [
      "Up to 500 vehicles",
      "Advanced inventory management",
      "Customer CRM",
      "Deal tracking",
      "50GB file storage",
      "REST API access",
      "Advanced analytics",
      "Email & SMS notifications",
      "Priority support",
      "Marketing tools",
      "Analytics dashboard",
    ],
    isPopular: true,
    isRecommended: true,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    name: "Enterprise",
    description: "For large dealerships",
    features: [
      "Unlimited vehicles",
      "Full feature access",
      "Advanced CRM",
      "Custom integrations",
      "Unlimited file storage",
      "REST API access",
      "Advanced analytics",
      "24/7 dedicated support",
      "Custom branding",
      "Audit logs",
      "White-label options",
    ],
    isPopular: false,
    isRecommended: false,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get price amount in cents for a plan and billing cycle
 */
export function getPriceAmount(
  plan: SubscriptionPlanType,
  cycle: BillingCycleType
): number {
  return SubscriptionPricing[plan]?.[cycle] || 0;
}

/**
 * Format price for display (e.g., "$99/month")
 */
export function formatPrice(
  plan: SubscriptionPlanType,
  cycle: BillingCycleType
): string {
  const amount = getPriceAmount(plan, cycle);
  const dollars = amount / 100;
  
  if (cycle === BillingCycle.YEARLY) {
    const monthly = dollars / 12;
    return `$${monthly.toFixed(2)}/month (billed annually)`;
  }
  
  return `$${dollars.toFixed(0)}/month`;
}

/**
 * Get all features for a plan
 */
export function getPlanFeatures(plan: SubscriptionPlanType): FeatureFlag[] {
  return SubscriptionFeatures[plan] || [];
}

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(
  plan: SubscriptionPlanType,
  feature: FeatureFlag
): boolean {
  return SubscriptionFeatures[plan]?.includes(feature) || false;
}

/**
 * Check if a plan string (from database) has a specific feature
 * This is a convenience function that handles case-insensitive plan matching
 */
export function planHasFeature(
  planName: string | undefined | null,
  feature: FeatureFlag
): boolean {
  if (!planName) return false;
  
  const plan = planName.toLowerCase() as SubscriptionPlanType;
  if (!Object.values(SubscriptionPlan).includes(plan)) {
    return false;
  }
  
  return hasFeature(plan, feature);
}

/**
 * Get plan limits
 */
export function getPlanLimits(plan: SubscriptionPlanType): PlanLimits {
  return SubscriptionLimits[plan];
}

/**
 * Get plan display configuration
 */
export function getPlanDisplay(plan: SubscriptionPlanType): PlanDisplayConfig {
  return SubscriptionPlanDisplay[plan];
}

