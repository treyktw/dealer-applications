// convex/deeplink.ts (single file)
import { action, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Store token mutation
export const storeToken = mutation({
  args: {
    token: v.string(),
    dealId: v.id("deals"),
    userId: v.string(),
    dealershipId: v.id("dealerships"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("deeplink_tokens", {
      token: args.token,
      dealId: args.dealId,
      userId: args.userId,
      dealershipId: args.dealershipId,
      used: false,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

// Generate deep-link token action
export const generateDeepLinkToken = action({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args): Promise<{
    deepLink: string;
    expiresAt: number;
    dealId: Id<"deals">;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has Premium subscription for deals management and desktop access
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for deal management and desktop app access");
    }

    // Check for specific features
    const hasDealsManagement = subscriptionStatus.subscription?.features?.includes("deals_management");
    const hasDesktopAccess = subscriptionStatus.subscription?.features?.includes("desktop_app_access");
    
    if (!hasDealsManagement || !hasDesktopAccess) {
      throw new Error("Premium subscription with deals management and desktop app access required");
    }

    const deal = await ctx.runQuery(api.deals.getDeal, {
      dealId: args.dealId,
    });

    if (!deal || deal.dealershipId !== user.dealershipId) {
      throw new Error("Access denied: Deal not found or unauthorized");
    }

    // Generate random token
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await ctx.runMutation(api.deeplink.storeToken, {
      token,
      dealId: args.dealId,
      userId: user.id,
      dealershipId: user.dealershipId as Id<"dealerships">,
      expiresAt,
    });

    const deepLink = `dealer-sign://open?dealId=${args.dealId}&token=${token}`;

    return {
      deepLink,
      expiresAt,
      dealId: args.dealId,
    };
  },
});

// Get token record query
export const getTokenRecord = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deeplink_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

// Mark token as used mutation
export const markTokenUsed = mutation({
  args: {
    tokenId: v.id("deeplink_tokens"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, {
      used: true,
      usedAt: Date.now(),
      usedBy: args.userId,
    });
  },
});

// Exchange action - all in one file to avoid circular deps
export const exchangeDeepLinkToken = action({
  args: {
    dealId: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error: string | null;
    deal: any | null;
    templates: any[] | null;
    dealershipId: string | null;
  }> => {
    try {
      
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return {
          success: false,
          error: "Not authenticated",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      const user = await ctx.runQuery(api.users.getUserByClerkId, {
        clerkId: identity.subject,
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      // Validate token directly in the action
      const tokenRecord = await ctx.runQuery(api.deeplink.getTokenRecord, {
        token: args.token,
      });

      if (!tokenRecord) {
        return {
          success: false,
          error: "Token not found",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      if (tokenRecord.expiresAt < Date.now()) {
        return {
          success: false,
          error: "Token expired",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      if (tokenRecord.used) {
        return {
          success: false,
          error: "Token already used",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      if (tokenRecord.dealId !== args.dealId) {
        return {
          success: false,
          error: "Token mismatch",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      if (tokenRecord.userId !== user.id) {
        return {
          success: false,
          error: "Token belongs to another user",
          deal: null,
          templates: null,
          dealershipId: null,
        };
      }

      // Mark token as used
      await ctx.runMutation(api.deeplink.markTokenUsed, {
        tokenId: tokenRecord._id,
        userId: user.id,
      });

      const deal = await ctx.runQuery(api.deals.getDeal, {
        dealId: args.dealId as Id<"deals">,
      });

      if (!deal) {
        return {
          success: false,
          error: "Deal not found",
          deal: null,
          templates: [],
          dealershipId: null,
        };
      }

      // Get complete deal data including document pack and custom documents
      const completeDealData = await ctx.runQuery(api.deals.getCompleteDealData, {
        dealId: args.dealId as Id<"deals">,
      });

      return {
        success: true,
        error: null,
        deal: completeDealData,
        templates: [],
        dealershipId: user.dealershipId || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        deal: null,
        templates: null,
        dealershipId: null,
      };
    }
  },
});