/**
 * Standalone Users Management
 * Internal helpers for user management
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
 * Update user subscription status
 */
export const updateSubscriptionStatus = internalMutation({
  args: {
    userId: v.id("standalone_users"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscriptionStatus: args.status as any,
      updatedAt: Date.now(),
    });

    console.log(`✅ User ${args.userId} subscription status updated to: ${args.status}`);
  },
});
