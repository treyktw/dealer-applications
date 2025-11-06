/**
 * License-Based Authentication for Desktop App
 * Provides authentication endpoints that work with license keys
 * instead of Clerk, enabling offline-first standalone operation
 */

import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

/**
 * Get user by license key
 * Helper function to retrieve user associated with a license
 */
async function getUserByLicense(
  ctx: QueryCtx | MutationCtx,
  licenseKey: string
): Promise<Doc<"licenses"> | null> {
  const license = await ctx.db
    .query("licenses")
    .withIndex("by_license_key", (q) => q.eq("licenseKey", licenseKey))
    .first();

  return license;
}

/**
 * Authenticate with license key
 * Returns user and dealership info if license is valid
 */
export const authenticateWithLicense = query({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate license
    const license = await getUserByLicense(ctx, args.licenseKey);

    if (!license) {
      return {
        authenticated: false,
        error: "Invalid license key",
      };
    }

    if (!license.isActive) {
      return {
        authenticated: false,
        error: "License is not active",
      };
    }

    // Check if license is expired
    if (license.expiresAt && license.expiresAt < Date.now()) {
      return {
        authenticated: false,
        error: "License has expired",
      };
    }

    // Check if this machine is activated
    const activation = license.activations.find((a) => a.machineId === args.machineId);

    if (!activation) {
      return {
        authenticated: false,
        error: "License not activated on this machine",
        needsActivation: true,
      };
    }

    // Get associated user if exists
    let user = null;
    if (license.userId) {
      user = await ctx.db.get(license.userId);
    }

    // Get associated dealership if exists
    let dealership = null;
    if (license.dealershipId) {
      dealership = await ctx.db.get(license.dealershipId);
    }

    return {
      authenticated: true,
      license: {
        key: license.licenseKey,
        tier: license.tier,
        expiresAt: license.expiresAt,
        maxActivations: license.maxActivations,
        currentActivations: license.activations.length,
      },
      user: user
        ? {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            dealershipId: user.dealershipId,
          }
        : {
            id: license._id,
            email: license.customerEmail,
            name: license.customerEmail.split("@")[0],
            role: "USER",
            dealershipId: license.dealershipId,
          },
      dealership: dealership
        ? {
            id: dealership._id,
            name: dealership.name,
            logo: dealership.logo,
          }
        : null,
    };
  },
});

/**
 * Link license to existing user
 * Called when user wants to link their license to their Clerk account
 */
export const linkLicenseToUser = mutation({
  args: {
    licenseKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get authenticated user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get license
    const license = await getUserByLicense(ctx, args.licenseKey);

    if (!license) {
      throw new Error("Invalid license key");
    }

    if (!license.isActive) {
      throw new Error("License is not active");
    }

    // Link license to user and dealership
    await ctx.db.patch(license._id, {
      userId: user._id,
      dealershipId: user.dealershipId,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "License linked to your account",
    };
  },
});

/**
 * Create dealership from license
 * For new users activating a standalone license
 */
export const createDealershipFromLicense = mutation({
  args: {
    licenseKey: v.string(),
    dealershipName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const license = await getUserByLicense(ctx, args.licenseKey);

    if (!license) {
      throw new Error("Invalid license key");
    }

    if (!license.isActive) {
      throw new Error("License is not active");
    }

    if (license.dealershipId) {
      throw new Error("License already linked to a dealership");
    }

    // Create dealership
    const now = Date.now();
    const dealershipId = await ctx.db.insert("dealerships", {
      name: args.dealershipName,
      email: args.email,
      phone: args.phone,
      createdAt: now,
      updatedAt: now,
    });

    // Create admin user for this dealership
    const userId = await ctx.db.insert("users", {
      clerkId: `license_${license._id}`, // Pseudo clerk ID for license-only users
      email: args.email,
      name: args.dealershipName,
      role: "ADMIN",
      dealershipId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Link license to dealership and user
    await ctx.db.patch(license._id, {
      dealershipId,
      userId,
      updatedAt: now,
    });

    return {
      success: true,
      dealershipId,
      userId,
    };
  },
});

/**
 * Check if license can access API
 * Used as middleware for desktop app requests
 */
export const checkLicenseAccess = query({
  args: {
    licenseKey: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await getUserByLicense(ctx, args.licenseKey);

    if (!license || !license.isActive) {
      return { hasAccess: false };
    }

    if (license.expiresAt && license.expiresAt < Date.now()) {
      return { hasAccess: false, reason: "expired" };
    }

    return {
      hasAccess: true,
      dealershipId: license.dealershipId,
      userId: license.userId,
      tier: license.tier,
    };
  },
});

/**
 * Get feature access for license tier
 * Determines what features are available based on license
 */
export const getLicenseFeatures = query({
  args: {
    licenseKey: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await getUserByLicense(ctx, args.licenseKey);

    if (!license) {
      throw new Error("Invalid license key");
    }

    // Feature matrix based on tier
    const features = {
      single: {
        maxUsers: 1,
        maxDeals: -1, // unlimited
        maxVehicles: -1,
        maxClients: -1,
        advancedReporting: false,
        apiAccess: false,
        customIntegrations: false,
        prioritySupport: false,
      },
      team: {
        maxUsers: 5,
        maxDeals: -1,
        maxVehicles: -1,
        maxClients: -1,
        advancedReporting: true,
        apiAccess: false,
        customIntegrations: false,
        prioritySupport: true,
      },
      enterprise: {
        maxUsers: -1, // unlimited
        maxDeals: -1,
        maxVehicles: -1,
        maxClients: -1,
        advancedReporting: true,
        apiAccess: true,
        customIntegrations: true,
        prioritySupport: true,
      },
    };

    return {
      tier: license.tier,
      features: features[license.tier],
      expiresAt: license.expiresAt,
    };
  },
});

/**
 * Validate license for API request
 * Used in other mutations/queries to check access
 */
export async function requireLicenseAuth(
  ctx: QueryCtx | MutationCtx,
  licenseKey: string
): Promise<Doc<"licenses">> {
  const license = await getUserByLicense(ctx, licenseKey);

  if (!license) {
    throw new Error("Invalid license key");
  }

  if (!license.isActive) {
    throw new Error("License is not active");
  }

  if (license.expiresAt && license.expiresAt < Date.now()) {
    throw new Error("License has expired");
  }

  return license;
}
