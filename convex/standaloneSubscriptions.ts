/**
 * Standalone Subscriptions Management
 * Internal mutations for managing Stripe subscriptions
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query, mutation, action } from "./_generated/server";
import { getStripeClient } from "./lib/stripe/client";
import { PRICING_CONFIG } from "./lib/pricing";

/**
 * Create a new subscription (called by Stripe webhook)
 */
export const create = internalMutation({
  args: {
    userId: v.id("standalone_users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    stripeProductId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    planName: v.string(),
    amount: v.number(),
    currency: v.string(),
    interval: v.union(v.literal("month"), v.literal("year")),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const subscriptionId = await ctx.db.insert("standalone_subscriptions", {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      stripeProductId: args.stripeProductId,
      status: args.status as "active" | "past_due" | "cancelled" | "incomplete" | "trialing" | "unpaid",
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      planName: args.planName,
      amount: args.amount,
      currency: args.currency,
      interval: args.interval,
      trialStart: args.trialStart,
      trialEnd: args.trialEnd,
      createdAt: now,
      updatedAt: now,
    });

    // Update user with subscription ID
    await ctx.db.patch(args.userId, {
      subscriptionId,
      updatedAt: now,
    });

    console.log(`âœ… Subscription created: ${subscriptionId}`);
    return subscriptionId;
  },
});

/**
 * Update subscription (called by Stripe webhook)
 */
export const update = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.string(),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    cancelledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("standalone_subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found: ${args.stripeSubscriptionId}`);
    }

    // Map Stripe status to our schema status
    const mapStripeStatus = (stripeStatus: string): "active" | "past_due" | "cancelled" | "incomplete" | "trialing" | "unpaid" => {
      switch (stripeStatus) {
        case "active":
          return "active";
        case "trialing":
          return "trialing";
        case "past_due":
          return "past_due";
        case "canceled":
        case "cancelled":
          return "cancelled";
        case "incomplete":
        case "incomplete_expired":
          return "incomplete";
        case "unpaid":
          return "unpaid";
        default:
          return "incomplete";
      }
    };

    const updates: {
      status: "active" | "past_due" | "cancelled" | "incomplete" | "trialing" | "unpaid";
      updatedAt: number;
      currentPeriodStart?: number;
      currentPeriodEnd?: number;
      cancelAtPeriodEnd?: boolean;
      cancelledAt?: number;
    } = {
      status: mapStripeStatus(args.status),
      updatedAt: Date.now(),
    };

    if (args.currentPeriodStart !== undefined)
      updates.currentPeriodStart = args.currentPeriodStart;
    if (args.currentPeriodEnd !== undefined)
      updates.currentPeriodEnd = args.currentPeriodEnd;
    if (args.cancelAtPeriodEnd !== undefined)
      updates.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
    if (args.cancelledAt !== undefined) updates.cancelledAt = args.cancelledAt;

    await ctx.db.patch(subscription._id, updates);

    console.log(`âœ… Subscription updated: ${subscription._id}`);
    return subscription._id;
  },
});

/**
 * Find subscription by Stripe ID
 */
export const findByStripeId = internalQuery({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("standalone_subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();
  },
});

/**
 * Get user's subscription
 */
export const getUserSubscription = query({
  args: {
    userId: v.id("standalone_users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("standalone_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Cancel subscription
 */
export const cancel = mutation({
  args: {
    userId: v.id("standalone_users"),
    immediately: v.optional(v.boolean()), // Cancel now vs at period end
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("standalone_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // TODO: Call Stripe API to cancel subscription
    // For now, just update the local record

    if (args.immediately) {
      await ctx.db.patch(subscription._id, {
        status: "cancelled",
        cancelledAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.patch(args.userId, {
        subscriptionStatus: "cancelled",
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(subscription._id, {
        cancelAtPeriodEnd: true,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: args.immediately
        ? "Subscription cancelled immediately"
        : "Subscription will cancel at end of billing period",
    };
  },
});

/**
 * Reactivate cancelled subscription
 */
export const reactivate = mutation({
  args: {
    userId: v.id("standalone_users"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("standalone_subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new Error("Subscription is not set to cancel");
    }

    // TODO: Call Stripe API to reactivate

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: false,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Subscription reactivated",
    };
  },
});

/**
 * Get subscription statistics
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("standalone_subscriptions").collect();

    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter((s) => s.status === "active").length,
      trialing: subscriptions.filter((s) => s.status === "trialing").length,
      pastDue: subscriptions.filter((s) => s.status === "past_due").length,
      cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
      mrr: subscriptions
        .filter((s) => s.status === "active")
        .reduce((sum, s) => {
          const monthlyAmount =
            s.interval === "year" ? s.amount / 12 : s.amount;
          return sum + monthlyAmount;
        }, 0),
    };

    return stats;
  },
});

/**
 * Create Stripe checkout session for subscription
 */
export const createSubscriptionCheckout = action({
  args: {
    subscriptionTier: v.union(v.literal("monthly"), v.literal("annual")),
    customerEmail: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const stripe = await getStripeClient();
    
    // Validate email
    if (!args.customerEmail || !args.customerEmail.includes("@")) {
      throw new Error("Valid email address is required");
    }
    
    // Get price ID for the subscription tier
    const priceId = PRICING_CONFIG.stripePriceIds[args.subscriptionTier];
    if (!priceId) {
      throw new Error(`No price ID configured for subscription tier: ${args.subscriptionTier}`);
    }

    // Create or get Stripe customer with the provided email
    let customerId: string;
    try {
      // Try to find existing customer by email
      const customers = await stripe.customers.list({
        email: args.customerEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`✅ Found existing Stripe customer: ${customerId}`);
      } else {
        // Create new customer with email
        const customer = await stripe.customers.create({
          email: args.customerEmail,
          metadata: {
            type: "standalone_subscription",
          },
        });
        customerId = customer.id;
        console.log(`✅ Created new Stripe customer: ${customerId} for ${args.customerEmail}`);
      }
    } catch (error) {
      console.error("Error creating/finding Stripe customer:", error);
      throw new Error("Failed to create customer");
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: {
        // Allow customer to update their email if needed
        address: "auto",
      },
      mode: "subscription", // Recurring subscription
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        type: "standalone_subscription",
        subscriptionTier: args.subscriptionTier,
        customerEmail: args.customerEmail,
      },
      subscription_data: {
        metadata: {
          type: "standalone_subscription",
          subscriptionTier: args.subscriptionTier,
          customerEmail: args.customerEmail,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session");
    }

    console.log(`✅ Created checkout session: ${session.id} for ${args.customerEmail}`);

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});