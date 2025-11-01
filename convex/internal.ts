import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const checkRateLimit = internalQuery({
  args: {
    apiKeyId: v.id("api_keys"),
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in ms
    
    // Get API key config
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      return {
        limited: true,
        remaining: 0,
        limit: 0,
        resetTime: now + 3600000,
        retryAfter: 3600,
        shouldWait: false,
        waitMs: 0,
      };
    }
    
    // Count requests in last hour for this key
    const recentRequests = await ctx.db
      .query("rate_limits")
      .withIndex("by_key_timestamp", (q) => 
        q.eq("key", `api_key:${args.apiKeyId}`).gt("timestamp", hourAgo)
      )
      .collect();
    
    const requestCount = recentRequests.length;
    const limit = apiKey.rateLimitPerHour || 1000;
    const remaining = Math.max(0, limit - requestCount);
    
    // Find oldest request to determine reset time
    const oldestRequest = recentRequests[0];
    const resetTime = oldestRequest ? oldestRequest.timestamp + 3600000 : now + 3600000;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    
    if (requestCount >= limit) {
      const overage = requestCount - limit;
      
      // If slightly over limit, wait instead of rejecting
      if (overage <= 10) {
        const waitMs = Math.min(5000, overage * 500); // Wait up to 5 seconds
        return {
          limited: true,
          remaining: 0,
          limit,
          resetTime,
          retryAfter,
          shouldWait: true,
          waitMs,
        };
      }
      
      // Too many requests, reject
      return {
        limited: true,
        remaining: 0,
        limit,
        resetTime,
        retryAfter,
        shouldWait: false,
        waitMs: 0,
      };
    }
    
    return {
      limited: false,
      remaining,
      limit,
      resetTime,
      retryAfter: 0,
      shouldWait: false,
      waitMs: 0,
    };
  },
});

// Record a request
export const recordRequest = internalMutation({
  args: {
    apiKeyId: v.id("api_keys"),
    dealershipId: v.string(),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rate_limits", {
      key: `api_key:${args.apiKeyId}`,
      identifier: args.dealershipId,
      action: `public_api:${args.endpoint}`,
      timestamp: Date.now(),
      ipAddress: "api-request", // Placeholder
      blocked: false,
    });
  },
});

// Track API usage for analytics
export const trackApiUsage = internalMutation({
  args: {
    apiKeyId: v.id("api_keys"),
    dealershipId: v.string(),
    endpoint: v.string(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Log to security_logs
    await ctx.db.insert("security_logs", {
      dealershipId: args.dealershipId as Id<"dealerships">,
      action: "public_api_request",
      userId: undefined,
      ipAddress: "api-request",
      success: true,
      details: JSON.stringify({
        endpoint: args.endpoint,
        responseTime: args.responseTime,
        apiKeyId: args.apiKeyId,
      }),
      timestamp: Date.now(),
      resource: args.endpoint,
      method: "GET",
      severity: "low",
    });
  },
});

export const purgeCacheForVehicle = internalMutation({
  args: {
    dealershipId: v.string(),
    vehicleId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    // Call Vercel purge API if VERCEL_TOKEN is set
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      console.warn('VERCEL_TOKEN not set, skipping cache purge');
      return;
    }
    
    try {
      const tags = [`dealership:${args.dealershipId}`];
      if (args.vehicleId) {
        tags.push(`vehicle:${args.vehicleId}`);
      }
      
      await fetch('https://api.vercel.com/v1/purge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags })
      });
      
      console.log(`Cache purged for ${args.vehicleId ? `vehicle ${args.vehicleId}` : 'all dealership inventory'}`);
    } catch (error) {
      console.error('Failed to purge cache:', error);
    }
  },
});

// Public mutation wrapper for manual cache purging
export const manualPurgeCache = mutation({
  args: {
    dealershipId: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    
    // Verify user has access to this dealership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user || user.dealershipId !== args.dealershipId) {
      throw new Error("Unauthorized");
    }
    
    // Call internal mutation
    await ctx.scheduler.runAfter(0, internal.internal.purgeCacheForVehicle, {
      dealershipId: args.dealershipId,
      vehicleId: args.vehicleId,
    });
    
    return { success: true };
  },
});

export const getApiUsageLogs = query({
  args: {
    dealershipId: v.id("dealerships"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Require admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new Error("Access denied");
    }

    // Fetch security logs for API requests
    const logs = await ctx.db
      .query("security_logs")
      .withIndex("by_dealership_timestamp", (q) =>
        q
          .eq("dealershipId", args.dealershipId)
          .gte("timestamp", args.startDate)
          .lte("timestamp", args.endDate)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("action"), "public_api_request"),
          q.eq(q.field("action"), "public_api_access"),
          q.eq(q.field("action"), "public_api_rate_limited")
        )
      )
      .collect();

    return logs;
  },
});


// T16: Cache Invalidation Strategy

// Approach

// Update Vehicle → Purge specific vehicle cache
// Delete Vehicle → Purge specific vehicle cache
// Bulk Update → Purge entire dealership inventory cache