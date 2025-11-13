/**
 * Authentication Rate Limiting - Convex Integration
 * Protects authentication endpoints from brute force attacks
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  checkRateLimit,
  recordAttempt,
  getRateLimitIdentifier,
  getRateLimitErrorMessage,
  getExpiredRateLimitRecords,
  AUTH_RATE_LIMITS,
  type RateLimitResult,
} from "./lib/rateLimit/authRateLimit";
import type { Id } from "./_generated/dataModel";

/**
 * Check if an auth operation is rate limited
 * Call this BEFORE performing the auth operation
 */
export const checkAuthRateLimit = query({
  args: {
    endpoint: v.union(
      v.literal("login"),
      v.literal("register"),
      v.literal("passwordReset"),
      v.literal("emailVerification")
    ),
    email: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RateLimitResult> => {
    const identifier = getRateLimitIdentifier(args.endpoint, args.email, args.ipAddress);
    const config = AUTH_RATE_LIMITS[args.endpoint];

    // Find existing rate limit record
    const existing = await ctx.db
      .query("auth_rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", identifier).eq("endpoint", args.endpoint)
      )
      .first();

    // Check rate limit
    const result = checkRateLimit(
      existing
        ? {
            identifier: existing.identifier,
            endpoint: existing.endpoint,
            attemptCount: existing.attemptCount,
            windowStartedAt: existing.windowStartedAt,
            blockedUntil: existing.blockedUntil,
            lastAttemptAt: existing.lastAttemptAt,
          }
        : null,
      config
    );

    return result;
  },
});

/**
 * Record an auth attempt
 * Call this AFTER checking rate limit (whether auth succeeded or failed)
 */
export const recordAuthAttempt = mutation({
  args: {
    endpoint: v.union(
      v.literal("login"),
      v.literal("register"),
      v.literal("passwordReset"),
      v.literal("emailVerification")
    ),
    email: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    success: v.boolean(), // Whether the auth attempt succeeded
  },
  handler: async (ctx, args) => {
    const identifier = getRateLimitIdentifier(args.endpoint, args.email, args.ipAddress);
    const config = AUTH_RATE_LIMITS[args.endpoint];

    // Find existing rate limit record
    const existing = await ctx.db
      .query("auth_rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", identifier).eq("endpoint", args.endpoint)
      )
      .first();

    // Record attempt
    const updated = recordAttempt(
      existing
        ? {
            identifier: existing.identifier,
            endpoint: existing.endpoint,
            attemptCount: existing.attemptCount,
            windowStartedAt: existing.windowStartedAt,
            blockedUntil: existing.blockedUntil,
            lastAttemptAt: existing.lastAttemptAt,
          }
        : null,
      identifier,
      args.endpoint,
      config
    );

    const now = Date.now();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        attemptCount: updated.attemptCount,
        windowStartedAt: updated.windowStartedAt,
        blockedUntil: updated.blockedUntil,
        lastAttemptAt: updated.lastAttemptAt,
        lastSuccess: args.success ? now : existing.lastSuccess,
        updatedAt: now,
      });
    } else {
      // Create new record
      await ctx.db.insert("auth_rate_limits", {
        identifier: updated.identifier,
        endpoint: updated.endpoint,
        attemptCount: updated.attemptCount,
        windowStartedAt: updated.windowStartedAt,
        blockedUntil: updated.blockedUntil,
        lastAttemptAt: updated.lastAttemptAt,
        lastSuccess: args.success ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log significant events
    if (updated.blockedUntil && updated.blockedUntil > now) {
      console.warn(
        `🚨 Rate limit exceeded: ${args.endpoint} for ${identifier} - blocked until ${new Date(updated.blockedUntil).toISOString()}`
      );
    }

    return {
      success: true,
      blocked: !!updated.blockedUntil && updated.blockedUntil > now,
    };
  },
});

/**
 * Reset rate limit for a specific identifier
 * Use this for successful auth or manual intervention
 */
export const resetAuthRateLimit = mutation({
  args: {
    endpoint: v.union(
      v.literal("login"),
      v.literal("register"),
      v.literal("passwordReset"),
      v.literal("emailVerification")
    ),
    email: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identifier = getRateLimitIdentifier(args.endpoint, args.email, args.ipAddress);

    const existing = await ctx.db
      .query("auth_rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", identifier).eq("endpoint", args.endpoint)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      console.log(`✅ Reset rate limit for ${args.endpoint}:${identifier}`);
    }

    return { success: true };
  },
});

/**
 * Get rate limit stats for an identifier
 */
export const getAuthRateLimitStats = query({
  args: {
    endpoint: v.union(
      v.literal("login"),
      v.literal("register"),
      v.literal("passwordReset"),
      v.literal("emailVerification")
    ),
    email: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identifier = getRateLimitIdentifier(args.endpoint, args.email, args.ipAddress);

    const record = await ctx.db
      .query("auth_rate_limits")
      .withIndex("by_identifier_endpoint", (q) =>
        q.eq("identifier", identifier).eq("endpoint", args.endpoint)
      )
      .first();

    if (!record) {
      return {
        attemptCount: 0,
        blocked: false,
        remaining: AUTH_RATE_LIMITS[args.endpoint].maxAttempts,
      };
    }

    const now = Date.now();
    const blocked = !!record.blockedUntil && record.blockedUntil > now;

    return {
      attemptCount: record.attemptCount,
      blocked,
      blockedUntil: record.blockedUntil,
      windowStartedAt: record.windowStartedAt,
      lastAttemptAt: record.lastAttemptAt,
      lastSuccess: record.lastSuccess,
      remaining: Math.max(0, AUTH_RATE_LIMITS[args.endpoint].maxAttempts - record.attemptCount),
    };
  },
});

/**
 * Clear expired rate limit records
 * Should be called periodically (e.g., daily cron job)
 */
export const clearExpiredAuthRateLimits = mutation({
  args: {},
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("auth_rate_limits").collect();

    const recordsWithIds = allRecords.map((r) => ({
      _id: r._id,
      identifier: r.identifier,
      endpoint: r.endpoint,
      attemptCount: r.attemptCount,
      windowStartedAt: r.windowStartedAt,
      blockedUntil: r.blockedUntil,
      lastAttemptAt: r.lastAttemptAt,
      createdAt: r.createdAt,
    }));

    const expiredIds = getExpiredRateLimitRecords(recordsWithIds);

    let deletedCount = 0;
    for (const id of expiredIds as Id<"auth_rate_limits">[]) {
      await ctx.db.delete(id);
      deletedCount++;
    }

    console.log(`🗑️ Cleared ${deletedCount} expired auth rate limit records`);
    return { deletedCount };
  },
});

/**
 * Get global rate limit statistics
 */
export const getGlobalAuthRateLimitStats = query({
  args: {},
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("auth_rate_limits").collect();
    const now = Date.now();

    const stats = {
      total: allRecords.length,
      blocked: allRecords.filter((r) => r.blockedUntil && r.blockedUntil > now).length,
      byEndpoint: {
        login: allRecords.filter((r) => r.endpoint === "login").length,
        register: allRecords.filter((r) => r.endpoint === "register").length,
        passwordReset: allRecords.filter((r) => r.endpoint === "passwordReset").length,
        emailVerification: allRecords.filter((r) => r.endpoint === "emailVerification").length,
      },
      blockedByEndpoint: {
        login: allRecords.filter(
          (r) => r.endpoint === "login" && r.blockedUntil && r.blockedUntil > now
        ).length,
        register: allRecords.filter(
          (r) => r.endpoint === "register" && r.blockedUntil && r.blockedUntil > now
        ).length,
        passwordReset: allRecords.filter(
          (r) => r.endpoint === "passwordReset" && r.blockedUntil && r.blockedUntil > now
        ).length,
        emailVerification: allRecords.filter(
          (r) => r.endpoint === "emailVerification" && r.blockedUntil && r.blockedUntil > now
        ).length,
      },
    };

    return stats;
  },
});

/**
 * Helper function to throw rate limit error if blocked
 * Use this in auth mutations
 */
export function throwIfRateLimited(
  result: RateLimitResult,
  endpoint: keyof typeof AUTH_RATE_LIMITS
): void {
  if (!result.allowed) {
    const message = getRateLimitErrorMessage(result, endpoint);
    throw new Error(message);
  }
}
