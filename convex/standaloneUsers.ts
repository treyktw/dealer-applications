/**
 * Standalone Users Management
 * Internal helpers for user management
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Find user by Stripe customer ID
 */
export const findByStripeCustomer = internalQuery({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("standalone_subscriptions")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .collect();

    if (subscriptions.length === 0) {
      return null;
    }

    const subscription = subscriptions[0];
    return await ctx.db.get(subscription.userId);
  },
});

/**
 * Find user by email
 */
export const findByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

/**
 * Find user by ID
 */
export const findByUserId = internalQuery({
  args: {
    userId: v.id("standalone_users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Create or find user from checkout session
 * Creates a user account if it doesn't exist, or returns existing user
 */
export const createOrFindFromCheckout = internalMutation({
  args: {
    email: v.string(),
    stripeCustomerId: v.string(),
    checkoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      // Update existing user with Stripe customer ID if not set
      if (!existing.stripeCustomerId) {
        await ctx.db.patch(existing._id, {
          stripeCustomerId: args.stripeCustomerId,
          updatedAt: Date.now(),
        });
      }
      return existing._id;
    }

    // Create new user account (password will be set later)
    const now = Date.now();
    const userId = await ctx.db.insert("standalone_users", {
      email: args.email.toLowerCase(),
      passwordHash: "", // Empty password - user will set it later
      name: "", // Will be collected during account setup
      businessName: undefined,
      emailVerified: false,
      verificationToken: crypto.randomUUID(),
      subscriptionStatus: "none", // Will be updated to "active" when subscription is created
      stripeCustomerId: args.stripeCustomerId,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ Created user account from checkout: ${userId} for ${args.email}`);
    return userId;
  },
});

/**
 * Link license key and update subscription status
 * Called after subscription payment and license generation
 */
export const linkLicenseAndUpdateStatus = internalMutation({
  args: {
    userId: v.id("standalone_users"),
    licenseKey: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      licenseKey: args.licenseKey,
      subscriptionStatus: args.status as "active" | "past_due" | "cancelled" | "trial" | "none" | "pending",
      updatedAt: Date.now(),
    });

    console.log(`✅ User ${args.userId} linked to license ${args.licenseKey} with status: ${args.status}`);
  },
});

/**
 * Link subscription to user and update status
 */
export const linkSubscription = internalMutation({
  args: {
    userId: v.id("standalone_users"),
    subscriptionId: v.id("standalone_subscriptions"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscriptionId: args.subscriptionId,
      subscriptionStatus: args.status as "active" | "past_due" | "cancelled" | "trial" | "none" | "pending",
      updatedAt: Date.now(),
    });

    console.log(`✅ User ${args.userId} linked to subscription ${args.subscriptionId} with status: ${args.status}`);
  },
});

/**
 * Update user subscription status
 */
export const updateSubscriptionStatus = internalMutation({
  args: {
    userId: v.id("standalone_users"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscriptionStatus: args.status as "active" | "past_due" | "cancelled" | "trial" | "none" | "pending",
      updatedAt: Date.now(),
    });

    console.log(`✅ User ${args.userId} subscription status updated to: ${args.status}`);
  },
});
