import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { SubscriptionPlan, SubscriptionStatus, BillingCycle, SubscriptionFeatures } from "./schema";
import Stripe from "stripe";
import { api } from "./_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Helper function to get Stripe price ID
export function getPriceId(plan: string, billingCycle: string): string {
  const prices = {
    [SubscriptionPlan.BASIC]: {
      monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID, 
    },
    [SubscriptionPlan.PREMIUM]: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID, 
    },
    [SubscriptionPlan.ENTERPRISE]: {
      monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID, 
    },
  } as const;

  const priceId = prices[plan as keyof typeof prices]?.[billingCycle.toLowerCase() as keyof typeof prices[keyof typeof prices]];
  if (!priceId) {
    throw new Error(`Invalid plan (${plan}) or billing cycle (${billingCycle})`);
  }

  return priceId;
}

// Helper function to determine plan from price ID
function getPlanFromPriceId(priceId: string): { plan: string; billingCycle: string } {
  const priceMapping: Record<string, { plan: string; billingCycle: string }> = {
    [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!]: { plan: SubscriptionPlan.BASIC, billingCycle: BillingCycle.MONTHLY },
    [process.env.STRIPE_BASIC_YEARLY_PRICE_ID!]: { plan: SubscriptionPlan.BASIC, billingCycle: BillingCycle.YEARLY },
    [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!]: { plan: SubscriptionPlan.PREMIUM, billingCycle: BillingCycle.MONTHLY },
    [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!]: { plan: SubscriptionPlan.PREMIUM, billingCycle: BillingCycle.YEARLY },
    [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!]: { plan: SubscriptionPlan.ENTERPRISE, billingCycle: BillingCycle.MONTHLY },
    [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!]: { plan: SubscriptionPlan.ENTERPRISE, billingCycle: BillingCycle.YEARLY },
  };

  return priceMapping[priceId] || { plan: SubscriptionPlan.BASIC, billingCycle: BillingCycle.MONTHLY };
}

// Helper function to map Stripe status to our status
function mapStripeStatusToOurStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
    case "unpaid":
      return SubscriptionStatus.CANCELLED;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.PENDING;
    default:
      return SubscriptionStatus.PENDING;
  }
}

// Create checkout session
export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("Creating checkout session for user:", identity.subject);

    // Get user from database using consistent clerkId format
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    console.log("Found user for checkout:", user);

    if (!user) {
      throw new Error("User not found");
    }

    // Get the current dealership
    const dealership = await ctx.runQuery(api.dealerships.getCurrentDealership, {});
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    console.log("Using dealership:", dealership._id);

    // Determine plan and billing cycle from price ID
    const { plan, billingCycle } = getPlanFromPriceId(args.priceId);

    // Create or get Stripe customer
    let customerId: string;
    if (dealership.stripeCustomerId) {
      customerId = dealership.stripeCustomerId;
      console.log("Using existing Stripe customer:", customerId);
    } else {
      console.log("Creating new Stripe customer");
      
      const customer = await stripe.customers.create({
        email: identity.email || user.email,
        name: user.name,
        metadata: {
          dealershipId: dealership._id,
          userId: user.id,
        },
      });
      
      customerId = customer.id;
      console.log("Created Stripe customer:", customerId);
      
      // Update dealership with Stripe customer ID
      await ctx.runMutation(api.subscriptions.updateDealershipStripeCustomerId, {
        dealershipId: dealership._id,
        stripeCustomerId: customerId
      });
    }

    // Create or update subscription record
    const subscriptionRecordId = await ctx.runMutation(api.subscriptions.createInitialSubscription, {
      dealershipId: dealership._id,
      plan: plan,
      billingCycle: billingCycle,
      stripeCustomerId: customerId,
    });

    console.log("Created/Updated subscription record:", subscriptionRecordId);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        dealershipId: dealership._id,
        userId: user.id,
        subscriptionRecordId: subscriptionRecordId,
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      subscription_data: {
        metadata: {
          dealershipId: dealership._id,
          userId: user.id,
          subscriptionRecordId: subscriptionRecordId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session");
    }

    console.log("Created checkout session:", session.id);

    return { url: session.url };
  },
});

// Create initial subscription record
export const createInitialSubscription = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    plan: v.string(),
    billingCycle: v.string(),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("Creating initial subscription for dealership:", args.dealershipId);

    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .first();

    let subscriptionId: Id<"subscriptions">;
    const subscriptionStatus = SubscriptionStatus.PENDING; // Always start as pending

    if (existingSubscription) {
      // Update existing subscription
      await ctx.db.patch(existingSubscription._id, {
        plan: args.plan,
        billingCycle: args.billingCycle,
        status: subscriptionStatus, // Make sure status is set
        stripeCustomerId: args.stripeCustomerId || existingSubscription.stripeCustomerId,
        features: [...SubscriptionFeatures[args.plan as keyof typeof SubscriptionFeatures]],
        updatedAt: Date.now(),
      });
      subscriptionId = existingSubscription._id;
      console.log("Updated existing subscription:", subscriptionId, "with status:", subscriptionStatus);
    } else {
      // Create new subscription record
      subscriptionId = await ctx.db.insert("subscriptions", {
        dealershipId: args.dealershipId,
        status: subscriptionStatus, // Set as pending
        plan: args.plan,
        billingCycle: args.billingCycle,
        currentPeriodStart: Date.now(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: args.stripeCustomerId || "",
        stripeSubscriptionId: "",
        features: [...SubscriptionFeatures[args.plan as keyof typeof SubscriptionFeatures]],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created new subscription:", subscriptionId, "with status:", subscriptionStatus);
    }

    // Update dealership subscription reference
    await ctx.db.patch(args.dealershipId, {
      subscriptionId: subscriptionId,
      updatedAt: Date.now(),
    });

    // CRITICAL FIX: Update ALL users in the dealership with the new subscription status
    const users = await ctx.db
      .query("users")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    console.log(`Updating ${users.length} users with subscription status: ${subscriptionStatus}`);

    for (const user of users) {
      const oldStatus = user.subscriptionStatus;
      await ctx.db.patch(user._id, {
        subscriptionStatus: subscriptionStatus, // Update to pending
        subscriptionId: subscriptionId,
        updatedAt: Date.now(),
      });
      console.log(`Updated user ${user._id} from ${oldStatus} to ${subscriptionStatus}`);
    }

    return subscriptionId;
  },
});

// Update dealership Stripe customer ID
export const updateDealershipStripeCustomerId = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dealershipId, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now()
    });
    return { success: true };
  },
});

// Get dealership subscription
export const getDealershipSubscription = query({
  args: {
    dealershipId: v.id("dealerships"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For desktop auth, validate the token
    if (args.token) {
      try {
        const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token: args.token });
        if (!sessionData) {
          throw new Error("Invalid or expired session");
        }
      } catch (error) {
        console.error("Desktop auth validation failed:", error);
        throw new Error("Authentication failed");
      }
    } else {
      // Fallback to web auth
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .first();

    return subscription;
  },
});

// Check subscription status
export const checkSubscriptionStatus = query({
  args: {
    token: v.optional(v.string()),
  },
   handler: async (ctx, args): Promise<{
     hasActiveSubscription: boolean;
     hasPendingSubscription?: boolean;
     hasAnySubscription?: boolean;
     subscription?: Doc<"subscriptions"> | null;
     subscriptionStatus: string;
     dealershipId?: Id<"dealerships">;
   }> => {
     let user: { dealershipId?: Id<"dealerships"> } | null = null;

    // Desktop auth: validate token
    if (args.token) {
      try {
        const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { 
          token: args.token 
        });
        if (!sessionData) {
          return { hasActiveSubscription: false, subscriptionStatus: "none" };
        }
        user = sessionData.user;
      } catch (error) {
        console.error("Desktop auth validation failed:", error);
        return { hasActiveSubscription: false, subscriptionStatus: "none" };
      }
    } else {
      // Web auth: use Clerk
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { hasActiveSubscription: false, subscriptionStatus: "none" };
      }

      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        return { hasActiveSubscription: false, subscriptionStatus: "none" };
      }
    }

    // If user has no dealership, they need to complete onboarding first
    if (!user.dealershipId) {
      console.log("User needs to complete onboarding first");
      return { hasActiveSubscription: false, subscriptionStatus: "no_dealership" };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    // Check various subscription states
    const hasActiveSubscription = subscription?.status === SubscriptionStatus.ACTIVE;
    const hasPendingSubscription = subscription?.status === SubscriptionStatus.PENDING;
    const hasAnySubscription = !!subscription;

    return {
      hasActiveSubscription,
      hasPendingSubscription,
      hasAnySubscription,
      subscription,
      subscriptionStatus: subscription?.status || "none",
      dealershipId: user.dealershipId,
    };
  },
});

// Internal mutation to update subscription after successful checkout
export const updateSubscriptionAfterCheckout = internalMutation({
  args: {
    dealershipId: v.id("dealerships"),
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    subscriptionRecordId: v.optional(v.id("subscriptions")),
  },
  handler: async (ctx, args) => {
    console.log("Updating subscription after checkout:", args);

    var subscription: Doc<"subscriptions"> | null = null;
    var subscriptionId: Id<"subscriptions"> | undefined;
    
    if (args.subscriptionRecordId) {
      // Update specific subscription record
      subscription = await ctx.db.get(args.subscriptionRecordId);
      if (subscription) {
        await ctx.db.patch(args.subscriptionRecordId, {
          status: mapStripeStatusToOurStatus(args.status),
          stripeCustomerId: args.stripeCustomerId,
          stripeSubscriptionId: args.stripeSubscriptionId,
          currentPeriodStart: args.currentPeriodStart,
          updatedAt: Date.now(),
        });
        subscriptionId = args.subscriptionRecordId;
        console.log("Updated specific subscription record:", subscriptionId);
      }
    }
    
    if (!subscription) {
      // Find subscription by dealership
      subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
        .first();

      if (subscription) {
        await ctx.db.patch(subscription._id, {
          status: mapStripeStatusToOurStatus(args.status),
          stripeCustomerId: args.stripeCustomerId,
          stripeSubscriptionId: args.stripeSubscriptionId,
          currentPeriodStart: args.currentPeriodStart,
          updatedAt: Date.now(),
        });
        subscriptionId = subscription._id;
        console.log("Updated subscription by dealership:", subscriptionId);
      }
    }

    if (!subscription) {
      // Create new subscription record if none exists
      subscriptionId = await ctx.db.insert("subscriptions", {
        dealershipId: args.dealershipId,
        status: mapStripeStatusToOurStatus(args.status),
        plan: SubscriptionPlan.BASIC, // Default plan
        billingCycle: BillingCycle.MONTHLY, // Default cycle
        currentPeriodStart: args.currentPeriodStart,
        cancelAtPeriodEnd: false,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        features: [...SubscriptionFeatures[SubscriptionPlan.BASIC]],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created new subscription record:", subscriptionId);
    }

    // Update dealership with subscription info
    if (subscriptionId) {
      await ctx.db.patch(args.dealershipId, {
        stripeCustomerId: args.stripeCustomerId,
        subscriptionId: subscriptionId,
        updatedAt: Date.now(),
      });
    }

    // Update all users in the dealership with the subscription status
    if (subscriptionId) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
        .collect();

      const ourStatus = mapStripeStatusToOurStatus(args.status);

      for (const user of users) {
        await ctx.db.patch(user._id, {
          subscriptionStatus: ourStatus,
          subscriptionId: subscriptionId,
          updatedAt: Date.now(),
        });
        console.log(`Updated user ${user._id} subscription status to: ${ourStatus}`);
      }
    }

    console.log("Successfully updated subscription after checkout");
    return { success: true, subscriptionId };
  },
});

// Internal mutation to update subscription status from webhooks
export const updateSubscriptionStatus = internalMutation({
  args: {
    dealershipId: v.id("dealerships"),
    stripeSubscriptionId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("Updating subscription status from webhook:", args);

    // Get the subscription record
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .first();

    if (!subscription) {
      console.log("No subscription found for dealership:", args.dealershipId);
      return;
    }

    const ourStatus = mapStripeStatusToOurStatus(args.status);

    // Update the subscription record
    await ctx.db.patch(subscription._id, {
      status: ourStatus,
      stripeSubscriptionId: args.stripeSubscriptionId,
      currentPeriodStart: args.currentPeriodStart,
      updatedAt: Date.now(),
    });

    // Update all users in the dealership
    const users = await ctx.db
      .query("users")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    for (const user of users) {
      await ctx.db.patch(user._id, {
        subscriptionStatus: ourStatus,
        subscriptionId: subscription._id,
        updatedAt: Date.now(),
      });
      console.log(`Updated user ${user._id} subscription status to: ${ourStatus}`);
    }

    console.log("Successfully updated subscription status");
  },
});

// Cancel subscription
export const cancelSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Cancel Stripe subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update subscription status
    await ctx.db.patch(args.subscriptionId, {
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Check if feature is enabled
export const isFeatureEnabled = query({
  args: {
    dealershipId: v.id("dealerships"),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership || !dealership.subscriptionId) {
      return false;
    }

    const subscription = await ctx.db.get(dealership.subscriptionId);
    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    return subscription.features.includes(args.feature);
  },
});

// Force sync current user subscription status
export const forceSyncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("Force syncing user:", identity.subject);

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) {
      throw new Error("User or dealership not found");
    }

    console.log("Found user:", user._id, "dealership:", user.dealershipId);

    // Get the subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    if (!subscription) {
      console.log("No subscription found, setting user to inactive");
      await ctx.db.patch(user._id, {
        subscriptionStatus: SubscriptionStatus.EXPIRED,
        subscriptionId: undefined,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        message: "No subscription found, user set to expired",
        oldStatus: user.subscriptionStatus,
        newStatus: SubscriptionStatus.EXPIRED,
      };
    }

    console.log("Found subscription:", subscription._id, "status:", subscription.status);

    // Update user status to match subscription
    const oldStatus = user.subscriptionStatus;
    await ctx.db.patch(user._id, {
      subscriptionStatus: subscription.status,
      subscriptionId: subscription._id,
      updatedAt: Date.now(),
    });

    console.log(`Updated user ${user._id} from ${oldStatus} to ${subscription.status}`);

    return {
      success: true,
      message: "User synced successfully",
      oldStatus,
      newStatus: subscription.status,
      subscriptionId: subscription._id,
    };
  },
});

// Internal query to find subscription by Stripe subscription ID
export const findByStripeSubscriptionId = internalQuery({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) => q.eq("stripeSubscriptionId", args.stripeSubscriptionId))
      .first();

    return subscription;
  },
});

// Public mutation to update subscription plan
export const updateSubscriptionPlan = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    newPlan: v.string(),
    newBillingCycle: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await ctx.db.patch(args.subscriptionId, {
      plan: args.newPlan,
      billingCycle: args.newBillingCycle,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Check if user has access to a specific feature
export const checkFeatureAccess = query({
  args: {
    feature: v.string(),
  },
  handler: async (ctx, args): Promise<{ hasAccess: boolean; reason: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasAccess: false, reason: "Not authenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) {
      return { hasAccess: false, reason: "User not found or no dealership" };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return { hasAccess: false, reason: "No active subscription" };
    }

    const hasFeature = subscription.features.includes(args.feature);
    return { 
      hasAccess: hasFeature, 
      reason: hasFeature ? "Feature available" : "Feature not included in current plan"
    };
  },
});

// Get all available features for current user
export const getAvailableFeatures = query({
  args: {},
  handler: async (ctx): Promise<{ features: string[]; subscriptionStatus: string; hasActiveSubscription: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { features: [], subscriptionStatus: "none", hasActiveSubscription: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) {
      return { features: [], subscriptionStatus: "no_dealership", hasActiveSubscription: false };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    return {
      features: subscription?.features || [],
      subscriptionStatus: subscription?.status || "none",
      hasActiveSubscription: subscription?.status === SubscriptionStatus.ACTIVE,
    };
  },
});