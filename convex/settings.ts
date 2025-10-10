import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
// import { Id } from "./_generated/dataModel";

export const getDealershipSettings = query({
  args: { dealershipId: v.id("dealerships") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to view this dealership's settings");
    }

    // Get dealership settings
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    return {
      name: dealership.name,
      description: dealership.description,
      address: dealership.address,
      city: dealership.city,
      state: dealership.state,
      zipCode: dealership.zipCode,
      phone: dealership.phone,
      email: dealership.email,
      taxId: dealership.taxId,
      businessHours: dealership.businessHours,
    };
  },
});

export const updateDealershipSettings = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    taxId: v.optional(v.string()),
    businessHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to update this dealership's settings");
    }

    // Update dealership settings
    await ctx.db.patch(args.dealershipId, {
      ...args,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getNotificationSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const settings = await ctx.db
      .query("notificationSettings")
      .filter((q) => q.eq(q.field("userId"), user.tokenIdentifier))
      .collect();

    return settings;
  },
});

export const createDefaultNotificationSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user || !user.tokenIdentifier) {
      throw new Error("Not authenticated");
    }

    const defaultSettings = [
      { type: "new_lead", emailEnabled: true, inAppEnabled: true },
      { type: "lead_updates", emailEnabled: true, inAppEnabled: true },
      { type: "inventory", emailEnabled: true, inAppEnabled: true },
      { type: "task_reminders", emailEnabled: true, inAppEnabled: true },
      { type: "system_updates", emailEnabled: true, inAppEnabled: true },
    ];

    const createdSettings = await Promise.all(
      defaultSettings.map(async (setting) => {
        const id = await ctx.db.insert("notificationSettings", {
          userId: user.tokenIdentifier,
          type: setting.type,
          emailEnabled: setting.emailEnabled,
          inAppEnabled: setting.inAppEnabled,
        });
        return { _id: id, ...setting };
      })
    );

    return createdSettings;
  },
});

export const updateNotificationSettings = mutation({
  args: {
    settings: v.array(
      v.object({
        _id: v.id("notificationSettings"),
        type: v.string(),
        emailEnabled: v.boolean(),
        inAppEnabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("Not authenticated");
    }

    await Promise.all(
      args.settings.map((setting) =>
        ctx.db.patch(setting._id, {
          emailEnabled: setting.emailEnabled,
          inAppEnabled: setting.inAppEnabled,
        })
      )
    );

    return { success: true };
  },
}); 