// convex/notifications.ts
// In-app notification system

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/helpers/auth_helpers";
import  type { Doc } from "./_generated/dataModel";

// ============================================================================
// CREATE NOTIFICATIONS
// ============================================================================

/**
 * Create a notification for a user
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("deal_update"),
      v.literal("payment_received"),
      v.literal("document_signed"),
      v.literal("subscription_expiring"),
      v.literal("new_feature"),
      v.literal("system_alert")
    ),
    title: v.string(),
    message: v.string(),
    icon: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    relatedEntityType: v.optional(
      v.union(
        v.literal("deal"),
        v.literal("vehicle"),
        v.literal("client"),
        v.literal("subscription"),
        v.literal("document")
      )
    ),
    relatedEntityId: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    metadata: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      dealershipId: user.dealershipId,
      type: args.type,
      title: args.title,
      message: args.message,
      icon: args.icon,
      actionUrl: args.actionUrl,
      actionLabel: args.actionLabel,
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId,
      metadata: args.metadata,
      isRead: false,
      isArchived: false,
      priority: args.priority || "medium",
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return { notificationId };
  },
});

/**
 * Create notifications for multiple users (bulk)
 */
export const createBulk = mutation({
  args: {
    userIds: v.array(v.id("users")),
    type: v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("deal_update"),
      v.literal("payment_received"),
      v.literal("document_signed"),
      v.literal("subscription_expiring"),
      v.literal("new_feature"),
      v.literal("system_alert")
    ),
    title: v.string(),
    message: v.string(),
    icon: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
  },
  handler: async (ctx, args) => {
    const notificationIds = [];

    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;

      const notificationId = await ctx.db.insert("notifications", {
        userId,
        dealershipId: user.dealershipId,
        type: args.type,
        title: args.title,
        message: args.message,
        icon: args.icon,
        actionUrl: args.actionUrl,
        actionLabel: args.actionLabel,
        isRead: false,
        isArchived: false,
        priority: args.priority || "medium",
        createdAt: Date.now(),
      });

      notificationIds.push(notificationId);
    }

    return { count: notificationIds.length, notificationIds };
  },
});

/**
 * Create notification for all users in a dealership
 */
export const createForDealership = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    type: v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("deal_update"),
      v.literal("payment_received"),
      v.literal("document_signed"),
      v.literal("subscription_expiring"),
      v.literal("new_feature"),
      v.literal("system_alert")
    ),
    title: v.string(),
    message: v.string(),
    icon: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get all users in the dealership
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId))
      .collect();

    const notificationIds = [];

    for (const user of users) {
      const notificationId = await ctx.db.insert("notifications", {
        userId: user._id,
        dealershipId: args.dealershipId,
        type: args.type,
        title: args.title,
        message: args.message,
        icon: args.icon,
        actionUrl: args.actionUrl,
        actionLabel: args.actionLabel,
        isRead: false,
        isArchived: false,
        priority: args.priority || "medium",
        createdAt: Date.now(),
      });

      notificationIds.push(notificationId);
    }

    return { count: notificationIds.length, notificationIds };
  },
});

// ============================================================================
// READ NOTIFICATIONS
// ============================================================================

/**
 * Get user's notifications (paginated)
 */
export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit || 50;

    let notifications: Doc<"notifications">[];
    if (args.includeRead) {
      // Get all notifications
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit);
    } else {
      // Get only unread notifications
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
        .order("desc")
        .take(limit);
    }

    // Filter out expired notifications
    const now = Date.now();
    return notifications.filter(
      (n) => !n.expiresAt || n.expiresAt > now
    );
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    // Filter out expired notifications
    const now = Date.now();
    const validNotifications = unreadNotifications.filter(
      (n) => !n.expiresAt || n.expiresAt > now
    );

    return validNotifications.length;
  },
});

// ============================================================================
// UPDATE NOTIFICATIONS
// ============================================================================

/**
 * Mark notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    // Verify ownership
    if (notification.userId !== user._id) {
      throw new Error("Not authorized to update this notification");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    const now = Date.now();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return { count: unreadNotifications.length };
  },
});

/**
 * Archive notification
 */
export const archive = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    // Verify ownership
    if (notification.userId !== user._id) {
      throw new Error("Not authorized to update this notification");
    }

    await ctx.db.patch(args.notificationId, {
      isArchived: true,
    });

    return { success: true };
  },
});

/**
 * Delete notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    // Verify ownership
    if (notification.userId !== user._id) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up expired notifications (run as scheduled job)
 */
export const cleanupExpiredNotifications = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const expiredNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_expires_at")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();

    for (const notification of expiredNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { deleted: expiredNotifications.length };
  },
});

// ============================================================================
// HELPER FUNCTIONS (for use by other modules)
// ============================================================================

/**
 * Helper: Notify about deal update
 */
export const notifyDealUpdate = mutation({
  args: {
    dealId: v.id("deals"),
    userId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "deal_update",
      title: "Deal Updated",
      message: args.message,
      icon: "📄",
      actionUrl: `/deals/${args.dealId}`,
      actionLabel: "View Deal",
      relatedEntityType: "deal",
      relatedEntityId: args.dealId,
      isRead: false,
      isArchived: false,
      priority: "medium",
      createdAt: Date.now(),
    });
  },
});

/**
 * Helper: Notify about subscription expiring
 */
export const notifySubscriptionExpiring = mutation({
  args: {
    userId: v.id("users"),
    daysRemaining: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "subscription_expiring",
      title: "Subscription Expiring Soon",
      message: `Your subscription will expire in ${args.daysRemaining} days. Renew now to avoid service interruption.`,
      icon: "⚠️",
      actionUrl: "/settings/billing",
      actionLabel: "Manage Subscription",
      relatedEntityType: "subscription",
      isRead: false,
      isArchived: false,
      priority: "high",
      createdAt: Date.now(),
    });
  },
});
