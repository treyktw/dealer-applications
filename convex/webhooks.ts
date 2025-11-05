// convex/webhooks.ts - Webhook idempotency utilities
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if a webhook event has already been processed
 * Used for idempotency to prevent duplicate processing
 */
export const checkProcessed = internalQuery({
  args: {
    eventId: v.string(),
    source: v.string(), // "stripe", "clerk", etc.
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("webhook_events")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      console.log(`✅ Event ${args.eventId} already processed at ${new Date(existing.processedAt).toISOString()}`);
      return {
        processed: true,
        event: existing,
      };
    }

    return {
      processed: false,
      event: null,
    };
  },
});

/**
 * Mark a webhook event as processed
 * Records success/failure for audit trail
 */
export const markProcessed = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    source: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("webhook_events", {
      eventId: args.eventId,
      type: args.type,
      source: args.source,
      processedAt: Date.now(),
      success: args.success,
      error: args.error,
      metadata: args.metadata,
    });

    console.log(`📝 Marked event ${args.eventId} as processed (success: ${args.success})`);

    return eventId;
  },
});

/**
 * Get recent webhook events for debugging/monitoring
 */
export const getRecentEvents = internalQuery({
  args: {
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Use the processedAt index for ordering; filter by source if provided
    let query = ctx.db
      .query("webhook_events")
      .withIndex("by_processed_at", (q) => q.gte("processedAt", 0));

    if (args.source) {
      query = query.filter((q) => q.eq(q.field("source"), args.source as string));
    }

    const events = await query.order("desc").take(limit);

    return events;
  },
});

/**
 * Clean up old webhook events (older than 90 days)
 * Call this periodically via cron
 */
export const cleanupOldEvents = internalMutation({
  args: {
    daysToKeep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.daysToKeep || 90;
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    const oldEvents = await ctx.db
      .query("webhook_events")
      .withIndex("by_processed_at", (q) => q.lt("processedAt", cutoffTime))
      .collect();

    let deletedCount = 0;
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      deletedCount++;
    }

    console.log(`🗑️ Cleaned up ${deletedCount} webhook events older than ${daysToKeep} days`);

    return {
      deletedCount,
      cutoffDate: new Date(cutoffTime).toISOString(),
    };
  },
});
