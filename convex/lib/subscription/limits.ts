/**
 * Subscription Limit Enforcement
 * 
 * This module provides utilities to check and enforce subscription limits
 * for vehicles, storage, users, deals, etc.
 */

import { query } from "../../_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { SubscriptionLimits, SubscriptionPlan, type SubscriptionPlanType, type PlanLimits } from "./config";
import { SubscriptionStatus } from "../../schema";

/**
 * Get current subscription limits for a dealership
 */
export async function getSubscriptionLimits(
  ctx: QueryCtx | MutationCtx,
  dealershipId: string
): Promise<PlanLimits & { plan: SubscriptionPlanType; isUnlimited: boolean }> {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId as Id<"dealerships">))
    .first();

  // Default to BASIC plan if no subscription
  const plan = (subscription?.plan?.toLowerCase() as SubscriptionPlanType) || SubscriptionPlan.BASIC;
  const limits = SubscriptionLimits[plan];

  return {
    ...limits,
    plan,
    isUnlimited: plan === SubscriptionPlan.ENTERPRISE,
  };
}

/**
 * Check if a value is within limits
 */
export function isWithinLimit(
  current: number,
  limit: number | "unlimited"
): { allowed: boolean; remaining?: number } {
  if (limit === "unlimited") {
    return { allowed: true };
  }

  const remaining = limit - current;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}

/**
 * Check vehicle limit
 */
export async function checkVehicleLimit(
  ctx: QueryCtx | MutationCtx,
  dealershipId: string
): Promise<{ allowed: boolean; current: number; limit: number | "unlimited"; remaining?: number }> {
  const limits = await getSubscriptionLimits(ctx, dealershipId);
  
  // Count current vehicles
  const vehicles = await ctx.db
    .query("vehicles")
    .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
    .collect();
  const vehicleCount = vehicles.length;

  const check = isWithinLimit(vehicleCount, limits.vehicles);

  return {
    allowed: check.allowed,
    current: vehicleCount,
    limit: limits.vehicles,
    remaining: check.remaining,
  };
}

/**
 * Check storage limit (in bytes)
 */
export async function checkStorageLimit(
  ctx: QueryCtx | MutationCtx,
  dealershipId: string
): Promise<{ allowed: boolean; current: number; limit: number | "unlimited"; remaining?: number }> {
  const limits = await getSubscriptionLimits(ctx, dealershipId);
  
  // Convert GB to bytes
  const limitBytes = limits.storageGB === "unlimited" 
    ? "unlimited" 
    : limits.storageGB * 1024 * 1024 * 1024;

  // TODO: Calculate actual storage usage from S3/files
  // For now, we'll return a placeholder
  // This should query S3 or file storage to get actual usage
  const currentBytes = 0; // Placeholder

  const check = isWithinLimit(currentBytes, limitBytes);

  return {
    allowed: check.allowed,
    current: currentBytes,
    limit: limitBytes,
    remaining: check.remaining,
  };
}

/**
 * Check user limit
 */
export async function checkUserLimit(
  ctx: QueryCtx | MutationCtx,
  dealershipId: string
): Promise<{ allowed: boolean; current: number; limit: number | "unlimited"; remaining?: number }> {
  const limits = await getSubscriptionLimits(ctx, dealershipId);
  
  // Count current users
  const users = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("dealershipId"), dealershipId as Id<"dealerships">))
    .collect();
  const userCount = users.length;

  const check = isWithinLimit(userCount, limits.users);

  return {
    allowed: check.allowed,
    current: userCount,
    limit: limits.users,
    remaining: check.remaining,
  };
}

/**
 * Check deals limit (for current month)
 */
export async function checkDealsLimit(
  ctx: QueryCtx | MutationCtx,
  dealershipId: string
): Promise<{ allowed: boolean; current: number; limit: number | "unlimited"; remaining?: number }> {
  const limits = await getSubscriptionLimits(ctx, dealershipId);
  
  if (limits.dealsPerMonth === "unlimited") {
    return {
      allowed: true,
      current: 0,
      limit: "unlimited",
    };
  }

  // Get current month start timestamp
  const now = Date.now();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartTimestamp = monthStart.getTime();

  // Count deals created this month
  const deals = await ctx.db
    .query("deals")
    .filter((q) => 
      q.and(
        q.eq(q.field("dealershipId"), dealershipId),
        q.gte(q.field("createdAt"), monthStartTimestamp)
      )
    )
    .collect();

  const dealCount = deals.length;
  const dealLimit = limits.dealsPerMonth || "unlimited";
  const check = isWithinLimit(dealCount, dealLimit);

  return {
    allowed: check.allowed,
    current: dealCount,
    limit: dealLimit,
    remaining: check.remaining,
  };
}

/**
 * Get comprehensive subscription status with limits
 */
export const getSubscriptionStatusWithLimits = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId as Id<"dealerships">))
      .first();

    const plan = (subscription?.plan?.toLowerCase() as SubscriptionPlanType) || SubscriptionPlan.BASIC;
    const limits = SubscriptionLimits[plan];

    // Get current usage
    const [vehicleCheck, userCheck, dealsCheck] = await Promise.all([
      checkVehicleLimit(ctx, args.dealershipId),
      checkUserLimit(ctx, args.dealershipId),
      checkDealsLimit(ctx, args.dealershipId),
    ]);

    return {
      subscription: subscription ? {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        features: subscription.features,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      } : null,
      plan,
      limits,
      usage: {
        vehicles: {
          current: vehicleCheck.current,
          limit: vehicleCheck.limit,
          remaining: vehicleCheck.remaining,
          atLimit: !vehicleCheck.allowed,
        },
        users: {
          current: userCheck.current,
          limit: userCheck.limit,
          remaining: userCheck.remaining,
          atLimit: !userCheck.allowed,
        },
        deals: {
          current: dealsCheck.current,
          limit: dealsCheck.limit || "unlimited",
          remaining: dealsCheck.remaining,
          atLimit: !dealsCheck.allowed,
        },
      },
      hasActiveSubscription: subscription?.status === SubscriptionStatus.ACTIVE,
    };
  },
});

