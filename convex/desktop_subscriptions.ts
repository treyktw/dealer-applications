// convex/subscriptions-desktop.ts - Desktop-compatible subscription queries
import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

// ============================================================================
// HELPER: Validate session token and get user
// ============================================================================

async function validateTokenAndGetUser(ctx: QueryCtx, token: string): Promise<Doc<"users">> {
  const session = await ctx.db
    .query("auth_sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session) {
    throw new ConvexError("Invalid session token");
  }

  // Check if expired
  if (Date.now() > session.expiresAt) {
    throw new ConvexError("Session expired");
  }

  // Get user
  const user = await ctx.db.get(session.userId);
  if (!user || user.isActive === false) {
    throw new ConvexError("User not found or inactive");
  }

  return user;
}

// ============================================================================
// DESKTOP SUBSCRIPTION QUERIES
// ============================================================================

/**
 * Get current user's subscription (desktop-compatible)
 */
export const getSubscription = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await validateTokenAndGetUser(ctx, args.token);

    if (!user.dealershipId) {
      return null;
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    return subscription;
  },
});

/**
 * Get available features for current user (desktop-compatible)
 */
export const getAvailableFeatures = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await validateTokenAndGetUser(ctx, args.token);

    if (!user.dealershipId) {
      return { features: [], subscriptionStatus: "no_dealership", hasActiveSubscription: false };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    return {
      features: subscription?.features || [],
      subscriptionStatus: subscription?.status || "none",
      hasActiveSubscription: subscription?.status === "active",
    };
  },
});

/**
 * Check feature access (desktop-compatible)
 */
export const checkFeatureAccess = query({
  args: {
    token: v.string(),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await validateTokenAndGetUser(ctx, args.token);

    if (!user.dealershipId) {
      return { hasAccess: false, reason: "No dealership" };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    if (!subscription || subscription.status !== "active") {
      return { hasAccess: false, reason: "No active subscription" };
    }

    const hasFeature = subscription.features.includes(args.feature);
    return { 
      hasAccess: hasFeature, 
      reason: hasFeature ? "Feature available" : "Feature not included in current plan"
    };
  },
});