// convex/masterAdmin.ts
// Master admin functions for managing all dealerships

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMasterAdmin } from "./lib/helpers/auth_helpers";

// ============================================================================
// DEALERSHIP MANAGEMENT
// ============================================================================

/**
 * Get all dealerships with analytics
 */
export const getAllDealerships = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("deleted"))),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    let dealerships = await ctx.db.query("dealerships").collect();

    // Filter by status if provided
    if (args.status) {
      dealerships = dealerships.filter((d) => {
        if (args.status === "deleted") return d.isDeleted;
        if (args.status === "suspended") return d.isSuspended;
        if (args.status === "active") return !d.isDeleted && !d.isSuspended;
        return true;
      });
    }

    // Search filter
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      dealerships = dealerships.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.contactEmail?.toLowerCase().includes(query) ||
          d._id.toString().includes(query)
      );
    }

    // Get analytics for each dealership
    const dealershipsWithAnalytics = await Promise.all(
      dealerships.map(async (dealership) => {
        // Count vehicles
        const vehicleCount = await ctx.db
          .query("vehicles")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealership._id))
          .collect()
          .then((vehicles) => vehicles.length);

        // Count clients
        const clientCount = await ctx.db
          .query("clients")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealership._id))
          .collect()
          .then((clients) => clients.length);

        // Count deals
        const dealCount = await ctx.db
          .query("deals")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealership._id))
          .collect()
          .then((deals) => deals.length);

        // Count users
        const userCount = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("dealershipId"), dealership._id))
          .collect()
          .then((users) => users.length);

        // Get subscription
        const subscription = dealership.subscriptionId
          ? await ctx.db.get(dealership.subscriptionId)
          : null;

        // Get API keys
        const apiKeys = await ctx.db
          .query("api_keys")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealership._id))
          .collect();

        // Get verified domains
        const domains = await ctx.db
          .query("verifiedDomains")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealership._id))
          .collect();

        // Storage usage (if available)
        const storageUsage = dealership.storageUsed || 0;
        const storageLimit = dealership.storageLimit || 0;

        return {
          ...dealership,
          analytics: {
            vehicleCount,
            clientCount,
            dealCount,
            userCount,
            storageUsage,
            storageLimit,
            storagePercentage:
              storageLimit > 0 ? (storageUsage / storageLimit) * 100 : 0,
            apiKeyCount: apiKeys.length,
            activeApiKeys: apiKeys.filter((k) => k.isActive).length,
            verifiedDomains: domains.filter((d) => d.status === "verified").length,
            totalDomains: domains.length,
          },
          subscription: subscription ? {
            status: subscription.status,
            plan: subscription.plan,
            currentPeriodEnd: subscription.currentPeriodStart,
          } : null,
        };
      })
    );

    // Sort by creation date (newest first)
    dealershipsWithAnalytics.sort((a, b) => b.createdAt - a.createdAt);

    return dealershipsWithAnalytics;
  },
});

/**
 * Get single dealership with detailed analytics
 */
export const getDealershipDetails = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) throw new Error("Dealership not found");

    // Get all related data
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const deals = await ctx.db
      .query("deals")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId))
      .collect();

    const apiKeys = await ctx.db
      .query("api_keys")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const domains = await ctx.db
      .query("verifiedDomains")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const subscription = dealership.subscriptionId
      ? await ctx.db.get(dealership.subscriptionId)
      : null;

    // Calculate storage by type
    const storageByType = {
      documents: 0,
      images: 0,
      other: 0,
    };

    // Deal statistics
    const dealStats = {
      total: deals.length,
      pending: deals.filter((d) => d.status === "PENDING_APPROVAL").length,
      approved: deals.filter((d) => d.status === "APPROVED").length,
      completed: deals.filter((d) => d.status === "COMPLETED").length,
      cancelled: deals.filter((d) => d.status === "CANCELLED").length,
    };

    // Recent activity
    const recentDeals = deals
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    const recentClients = clients
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      dealership,
      analytics: {
        vehicleCount: vehicles.length,
        clientCount: clients.length,
        dealCount: deals.length,
        userCount: users.length,
        storageUsage: dealership.storageUsed || 0,
        storageLimit: dealership.storageLimit || 0,
        storageByType,
        dealStats,
      },
      apiKeys,
      domains,
      users,
      subscription,
      recentActivity: {
        deals: recentDeals,
        clients: recentClients,
      },
    };
  },
});

/**
 * Update dealership
 */
export const updateDealership = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    name: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    storageLimit: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    const updates: Partial<{
      name: string;
      contactEmail: string;
      contactPhone: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      storageLimit: number;
      notes: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) updates.contactPhone = args.contactPhone;
    if (args.address !== undefined) updates.address = args.address;
    if (args.city !== undefined) updates.city = args.city;
    if (args.state !== undefined) updates.state = args.state;
    if (args.zipCode !== undefined) updates.zipCode = args.zipCode;
    if (args.storageLimit !== undefined) updates.storageLimit = args.storageLimit;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.dealershipId, updates);

    return { success: true };
  },
});

/**
 * Suspend/Resume dealership
 */
export const toggleSuspension = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    suspend: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) throw new Error("Dealership not found");

    await ctx.db.patch(args.dealershipId, {
      isSuspended: args.suspend,
      suspendedAt: args.suspend ? Date.now() : undefined,
      suspensionReason: args.suspend ? args.reason : undefined,
      updatedAt: Date.now(),
    });

    // Notify dealership owners
    const owners = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("dealershipId"), args.dealershipId),
          q.eq(q.field("role"), "ADMIN")
        )
      )
      .collect();

    for (const owner of owners) {
      await ctx.db.insert("notifications", {
        userId: owner._id,
        dealershipId: args.dealershipId,
        type: "system_alert",
        title: args.suspend ? "Service Suspended" : "Service Restored",
        message: args.suspend
          ? `Your dealership services have been suspended. ${args.reason || ""}`
          : "Your dealership services have been restored.",
        icon: args.suspend ? "⚠️" : "✅",
        isRead: false,
        isArchived: false,
        priority: "urgent",
        createdAt: Date.now(),
      });
    }

    return { success: true, suspended: args.suspend };
  },
});

/**
 * Soft delete dealership
 */
export const deleteDealership = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) throw new Error("Dealership not found");

    await ctx.db.patch(args.dealershipId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletionReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Restore deleted dealership
 */
export const restoreDealership = mutation({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    await ctx.db.patch(args.dealershipId, {
      isDeleted: false,
      deletedAt: undefined,
      deletionReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Get API keys for dealership
 */
export const getDealershipApiKeys = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    const apiKeys = await ctx.db
      .query("api_keys")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    return apiKeys;
  },
});

/**
 * Toggle API key status
 */
export const toggleApiKeyStatus = mutation({
  args: {
    apiKeyId: v.id("api_keys"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    await ctx.db.patch(args.apiKeyId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// DOMAIN MANAGEMENT
// ============================================================================

/**
 * Get domains for dealership
 */
export const getDealershipDomains = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    const domains = await ctx.db
      .query("verifiedDomains")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    return domains;
  },
});

/**
 * Manually verify domain
 */
export const verifyDomain = mutation({
  args: {
    domainId: v.id("verifiedDomains"),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    await ctx.db.patch(args.domainId, {
      status: "verified",
      verifiedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Revoke domain verification
 */
export const revokeDomain = mutation({
  args: {
    domainId: v.id("verifiedDomains"),
  },
  handler: async (ctx, args) => {
    await requireMasterAdmin(ctx);

    await ctx.db.patch(args.domainId, {
      status: "revoked",
      revokedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// ANALYTICS & STATS
// ============================================================================

/**
 * Get platform-wide statistics
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    await requireMasterAdmin(ctx);

    const dealerships = await ctx.db.query("dealerships").collect();
    const activeDealerships = dealerships.filter((d) => !d.isDeleted && !d.isSuspended);
    const suspendedDealerships = dealerships.filter((d) => d.isSuspended);

    const allVehicles = await ctx.db.query("vehicles").collect();
    const allClients = await ctx.db.query("clients").collect();
    const allDeals = await ctx.db.query("deals").collect();
    const allUsers = await ctx.db.query("users").collect();

    // Storage stats
    const totalStorageUsed = dealerships.reduce((sum, d) => sum + (d.storageUsed || 0), 0);
    const totalStorageLimit = dealerships.reduce((sum, d) => sum + (d.storageLimit || 0), 0);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentDeals = allDeals.filter((d) => d.createdAt > thirtyDaysAgo);
    const recentClients = allClients.filter((c) => c.createdAt > thirtyDaysAgo);
    const recentDealerships = dealerships.filter((d) => d.createdAt > thirtyDaysAgo);

    return {
      dealerships: {
        total: dealerships.length,
        active: activeDealerships.length,
        suspended: suspendedDealerships.length,
        deleted: dealerships.filter((d) => d.isDeleted).length,
        recentlyAdded: recentDealerships.length,
      },
      inventory: {
        total: allVehicles.length,
        averagePerDealership: dealerships.length > 0 ? allVehicles.length / activeDealerships.length : 0,
      },
      clients: {
        total: allClients.length,
        recentlyAdded: recentClients.length,
        averagePerDealership: dealerships.length > 0 ? allClients.length / activeDealerships.length : 0,
      },
      deals: {
        total: allDeals.length,
        recentlyCreated: recentDeals.length,
        averagePerDealership: dealerships.length > 0 ? allDeals.length / activeDealerships.length : 0,
      },
      users: {
        total: allUsers.length,
        averagePerDealership: dealerships.length > 0 ? allUsers.length / activeDealerships.length : 0,
      },
      storage: {
        totalUsed: totalStorageUsed,
        totalLimit: totalStorageLimit,
        percentageUsed: totalStorageLimit > 0 ? (totalStorageUsed / totalStorageLimit) * 100 : 0,
      },
    };
  },
});
