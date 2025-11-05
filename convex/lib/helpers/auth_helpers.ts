// convex/lib/auth-helpers.ts
/**
 * Authentication helper functions for token-based auth
 * Used by deal generation and other actions that need user context
 */

import { query } from "../../_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "../../_generated/server";

/**
 * Get user by authentication token
 * This is used by actions that receive a token from the web/desktop app
 */
export const getUserByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, _args) => {
    // The token is the Clerk/auth token
    // We need to verify the current session and get the user
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

/**
 * Get current authenticated user
 * Helper function for mutations/queries
 */
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}

/**
 * Require authenticated user (throws if not logged in)
 */
export async function requireUser(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

/**
 * Verify user has access to a specific dealership
 */
export async function verifyDealershipAccess(
  ctx: QueryCtx,
  userId: string,
  dealershipId: string
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.dealershipId !== dealershipId) {
    throw new Error("User does not have access to this dealership");
  }

  return user;
}

/**
 * Check if user is a master/platform admin
 * Master admins have ADMIN role and no dealershipId (platform-level access)
 */
export async function isMasterAdmin(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    return false;
  }

  // Master admin = ADMIN role + no dealershipId (platform level)
  return user.role === "ADMIN" && !user.dealershipId;
}

/**
 * Require master admin access (throws if not master admin)
 */
export async function requireMasterAdmin(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.role !== "ADMIN" || user.dealershipId) {
    throw new Error("Master admin access required. This feature is only available to platform administrators.");
  }

  return user;
}