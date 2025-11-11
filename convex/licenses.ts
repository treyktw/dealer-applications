/**
 * License Management for Desktop App
 * Integrates with Stripe for license key distribution and validation
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Validate a license key
 * Called by desktop app on startup and periodically
 */
export const validateLicense = query({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      return {
        valid: false,
        reason: "LICENSE_NOT_FOUND",
        message: "License key not found. Please check your key and try again.",
      };
    }

    if (!license.isActive) {
      return {
        valid: false,
        reason: "LICENSE_DEACTIVATED",
        message: "This license has been deactivated. Please contact support.",
      };
    }

    // Check expiration for non-perpetual licenses
    if (license.expiresAt && license.expiresAt < Date.now()) {
      return {
        valid: false,
        reason: "LICENSE_EXPIRED",
        message: "This license has expired. Please renew your license.",
      };
    }

    // Check if already activated on this machine
    const existingActivation = license.activations.find(
      (a) => a.machineId === args.machineId
    );

    if (existingActivation) {
      return {
        valid: true,
        license: {
          tier: license.tier,
          expiresAt: license.expiresAt,
          dealershipId: license.dealershipId,
        },
      };
    }

    // Check activation limit (enterprise has unlimited = -1)
    if (license.maxActivations !== -1 && license.activations.length >= license.maxActivations) {
      return {
        valid: false,
        reason: "MAX_ACTIVATIONS_REACHED",
        message: `This license is already activated on ${license.maxActivations} device(s). Please deactivate a device or upgrade your license.`,
        activations: license.activations.map((a) => ({
          platform: a.platform,
          hostname: a.hostname,
          activatedAt: a.activatedAt,
        })),
      };
    }

    // License is valid but not yet activated on this machine
    return {
      valid: true,
      needsActivation: true,
      license: {
        tier: license.tier,
        expiresAt: license.expiresAt,
        availableActivations: license.maxActivations === -1
          ? "unlimited"
          : license.maxActivations - license.activations.length,
      },
    };
  },
});

/**
 * Activate a license on a new machine
 */
export const activateLicense = mutation({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
    platform: v.string(),
    appVersion: v.string(),
    hostname: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      throw new Error("License not found");
    }

    if (!license.isActive) {
      throw new Error("License is deactivated");
    }

    // Check if already activated
    const existingIndex = license.activations.findIndex(
      (a) => a.machineId === args.machineId
    );

    if (existingIndex >= 0) {
      // Update last seen time
      const updated = [...license.activations];
      updated[existingIndex].lastSeen = Date.now();
      updated[existingIndex].appVersion = args.appVersion;

      await ctx.db.patch(license._id, {
        activations: updated,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        message: "License already activated on this machine",
      };
    }

    // Check activation limit
    if (license.maxActivations !== -1 && license.activations.length >= license.maxActivations) {
      throw new Error("Maximum activations reached");
    }

    // Add new activation
    await ctx.db.patch(license._id, {
      activations: [
        ...license.activations,
        {
          machineId: args.machineId,
          activatedAt: Date.now(),
          lastSeen: Date.now(),
          platform: args.platform,
          appVersion: args.appVersion,
          hostname: args.hostname,
        },
      ],
      updatedAt: Date.now(),
    });

    console.log(`✅ License ${args.licenseKey} activated on machine ${args.machineId}`);

    // Find standalone user associated with this license
    const standaloneUser = await ctx.db
      .query("standalone_users")
      .withIndex("by_license", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    let sessionToken: string | null = null;
    let userId: string | null = null;

    if (standaloneUser) {
      console.log(`🔍 Found standalone user ${standaloneUser._id} for license ${args.licenseKey}`);
      
      // Generate session token
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      sessionToken = '';
      for (let i = 0; i < 64; i++) {
        sessionToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const now = Date.now();
      const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
      const expiresAt = now + SESSION_EXPIRY_MS;

      // Create session
      await ctx.db.insert("standalone_sessions", {
        userId: standaloneUser._id,
        token: sessionToken,
        licenseKey: args.licenseKey,
        machineId: args.machineId,
        expiresAt,
        createdAt: now,
        lastAccessedAt: now,
        userAgent: `${args.platform} ${args.appVersion}`,
        ipAddress: undefined,
      });

      // Update user's last login
      await ctx.db.patch(standaloneUser._id, {
        lastLoginAt: now,
        updatedAt: now,
      });

      userId = standaloneUser._id;
      console.log(`✅ Created session for user ${userId} with token ${sessionToken.substring(0, 8)}...`);
    } else {
      console.log(`⚠️ No standalone user found for license ${args.licenseKey} - session not created`);
    }

    return {
      success: true,
      message: "License activated successfully",
      sessionToken: sessionToken || undefined,
      userId: userId || undefined,
    };
  },
});

/**
 * Deactivate a license from a machine
 * Allows user to move license to a different computer
 */
export const deactivateLicense = mutation({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      throw new Error("License not found");
    }

    // Remove the activation
    const updated = license.activations.filter((a) => a.machineId !== args.machineId);

    if (updated.length === license.activations.length) {
      throw new Error("License not activated on this machine");
    }

    await ctx.db.patch(license._id, {
      activations: updated,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "License deactivated successfully",
    };
  },
});

/**
 * Get license info for a user
 */
export const getLicenseInfo = query({
  args: {
    licenseKey: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      return null;
    }

    return {
      tier: license.tier,
      isActive: license.isActive,
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      maxActivations: license.maxActivations,
      currentActivations: license.activations.length,
      activations: license.activations.map((a) => ({
        platform: a.platform,
        hostname: a.hostname,
        activatedAt: a.activatedAt,
        lastSeen: a.lastSeen,
        appVersion: a.appVersion,
      })),
    };
  },
});

/**
 * Get license by payment intent ID (for webhook)
 */
export const getLicenseByPaymentIntent = query({
  args: {
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_payment_intent", (q) => q.eq("paymentIntentId", args.paymentIntentId))
      .first();

    return license;
  },
});

/**
 * Generate and create a license for a subscription
 * Used when a user subscribes via Stripe
 */
export const generateAndCreateLicense = internalMutation({
  args: {
    customerEmail: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    stripeProductId: v.string(),
    subscriptionTier: v.string(), // "monthly" or "annual"
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate unique license key
    const licenseKey = generateLicenseKey();
    
    // For subscription-based licenses, we use "single" tier (1 device)
    // Users can have multiple subscriptions if they need multiple devices
    const tier = "single";
    const maxActivations = 1;
    
    const now = Date.now();

    const licenseId = await ctx.db.insert("licenses", {
      licenseKey,
      customerEmail: args.customerEmail,
      stripeCustomerId: args.stripeCustomerId,
      stripeProductId: args.stripeProductId,
      stripePriceId: args.stripePriceId,
      tier,
      maxActivations,
      activations: [],
      isActive: true,
      issuedAt: now,
      amount: args.amount,
      currency: args.currency,
      // For subscriptions, no expiration - handled by subscription status
      expiresAt: undefined,
      // Link to subscription
      stripeSubscriptionId: args.stripeSubscriptionId,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ License created: ${licenseId} (${licenseKey}) for subscription ${args.stripeSubscriptionId}`);

    return {
      licenseId,
      licenseKey,
    };
  },
});

/**
 * Create a new license (called by Stripe webhook for one-time purchases)
 * DEPRECATED: Use generateAndCreateLicense for subscriptions
 */
export const createLicense = internalMutation({
  args: {
    paymentIntentId: v.string(),
    checkoutSessionId: v.optional(v.string()),
    stripeCustomerId: v.string(),
    customerEmail: v.string(),
    stripeProductId: v.string(),
    stripePriceId: v.string(),
    licenseKey: v.string(),
    tier: v.union(v.literal("single"), v.literal("team"), v.literal("enterprise")),
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    // Determine max activations based on tier
    const maxActivations = {
      single: 1,
      team: 5,
      enterprise: -1, // unlimited
    }[args.tier];

    const now = Date.now();

    const licenseId = await ctx.db.insert("licenses", {
      paymentIntentId: args.paymentIntentId,
      checkoutSessionId: args.checkoutSessionId,
      licenseKey: args.licenseKey,
      customerEmail: args.customerEmail,
      stripeCustomerId: args.stripeCustomerId,
      stripeProductId: args.stripeProductId,
      stripePriceId: args.stripePriceId,
      tier: args.tier,
      maxActivations,
      activations: [],
      isActive: true,
      issuedAt: now,
      amount: args.amount,
      currency: args.currency,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`License created: ${licenseId} for ${args.customerEmail}`);

    return licenseId;
  },
});

/**
 * Update license activation heartbeat
 * Called periodically by desktop app to track active installations
 */
export const updateHeartbeat = mutation({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      throw new Error("License not found");
    }

    // Update last seen time for this machine
    const updated = license.activations.map((a) =>
      a.machineId === args.machineId
        ? { ...a, lastSeen: Date.now() }
        : a
    );

    await ctx.db.patch(license._id, {
      activations: updated,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * List all activations for admin
 */
export const listActivations = query({
  args: {},
  handler: async (ctx) => {
    // Check if user is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    // Get all licenses
    const licenses = await ctx.db.query("licenses").collect();

    return licenses.map((license) => ({
      licenseKey: license.licenseKey,
      customerEmail: license.customerEmail,
      tier: license.tier,
      isActive: license.isActive,
      activations: license.activations,
      createdAt: license.createdAt,
    }));
  },
});

/**
 * Revoke a license (admin only)
 */
export const revokeLicense = mutation({
  args: {
    licenseKey: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      throw new Error("License not found");
    }

    await ctx.db.patch(license._id, {
      isActive: false,
      notes: args.reason || "Revoked by admin",
      updatedAt: Date.now(),
    });

    return { success: true, message: "License revoked" };
  },
});

/**
 * Generate a license key
 * Format: DEALER-XXXX-XXXX-XXXX
 */
function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  const segments = 3;
  const segmentLength = 4;

  let key = "DEALER";

  for (let i = 0; i < segments; i++) {
    key += "-";
    for (let j = 0; j < segmentLength; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return key;
}

