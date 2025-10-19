import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// Helper function to require authentication
async function requireAuth(ctx: QueryCtx, token?: string): Promise<any> {
  if (!token) {
    throw new Error("Authentication token required");
  }

  // Validate session using desktopAuth
  const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, {
    token,
  });
  if (!sessionData) {
    throw new Error("Invalid or expired session");
  }

  return sessionData.user;
}

export const getDeals = query({
  args: {
    dealershipId: v.string(),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args) => {
    // Use the new auth helper that supports both Clerk and email auth
    await requireAuth(ctx, args.token);

    // Check subscription for deals management
    const subscriptionStatus = await ctx.runQuery(
      api.subscriptions.checkSubscriptionStatus,
      {
        token: args.token,
      }
    );
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for deal management");
    }

    if (!subscriptionStatus?.hasActiveSubscription) {
      console.log("❌ No active subscription found");
      throw new Error("Premium subscription required for deal management");
    }

    const hasDealsManagement =
      subscriptionStatus.subscription?.features?.includes("deals_management");
    if (!hasDealsManagement) {
      throw new Error("Premium subscription with deals management required");
    }

    let deals = await ctx.db
      .query("deals")
      .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId))
      .collect();
    if (args.status && args.status !== "all") {
      deals = deals.filter((d) => d.status === args.status);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      deals = deals.filter((d) => d._id.toLowerCase().includes(search));
    }
    // Fetch related client and vehicle for each deal
    const dealsWithRelations = await Promise.all(
      deals.map(async (deal) => {
        const client = deal.clientId ? await ctx.db.get(deal.clientId) : null;
        const vehicle = deal.vehicleId
          ? await ctx.db.get(deal.vehicleId)
          : null;
        return {
          ...deal,
          id: deal._id,
          client,
          vehicle,
        };
      })
    );
    return { deals: dealsWithRelations };
  },
});

export const getDeal = query({
  args: {
    dealId: v.id("deals"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      return null;
    }

    // Fetch related client and vehicle
    const client = deal.clientId ? await ctx.db.get(deal.clientId) : null;
    const vehicle = deal.vehicleId ? await ctx.db.get(deal.vehicleId) : null;

    // Return deal with related data
    return {
      ...deal,
      id: deal._id,
      clientEmail: client?.email,
      clientPhone: client?.phone,
      vin: vehicle?.vin,
      stockNumber: vehicle?.stock,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            vin: vehicle.vin,
            stock: vehicle.stock,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            mileage: vehicle.mileage,
            price: vehicle.price,
            status: vehicle.status,
            featured: vehicle.featured,
            trim: vehicle.trim,
            exteriorColor: vehicle.exteriorColor,
            interiorColor: vehicle.interiorColor,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
            engine: vehicle.engine,
            description: vehicle.description,
            features: vehicle.features,
            images: vehicle.images,
          }
        : null,
      documents: await ctx.db
        .query("documents")
        .filter((q) => q.eq(q.field("dealId"), deal._id))
        .collect(),
    };
  },
});

export const updateDealStatus = mutation({
  args: {
    dealId: v.id("deals"),
    status: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    await ctx.db.patch(args.dealId, {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.status === "COMPLETED" && { completedAt: Date.now() }),
      ...(args.status === "CANCELLED" && { cancelledAt: Date.now() }),
    });

    return { success: true };
  },
});

export const markDocumentSigned = mutation({
  args: {
    documentId: v.id("documents"),
    type: v.string(), // "client" | "dealer" | "notary"
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const updates: Record<string, boolean> = {};
    if (args.type === "client") updates.clientSigned = true;
    if (args.type === "dealer") updates.dealerSigned = true;
    if (args.type === "notary") updates.notarized = true;

    await ctx.db.patch(args.documentId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const createDeal = mutation({
  args: {
    type: v.string(),
    clientFirstName: v.optional(v.string()),
    clientLastName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    clientPhone: v.optional(v.string()),
    vin: v.optional(v.string()),
    stockNumber: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = (await requireAuth(ctx, args.token)) as Doc<"users">;
    if (!user) {
      throw new Error("User not found");
    }

    // Check subscription for deals management
    const subscriptionStatus = await ctx.runQuery(
      api.subscriptions.checkSubscriptionStatus,
      {
        token: args.token,
      }
    );
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for deal management");
    }

    const hasDealsManagement =
      subscriptionStatus.subscription?.features?.includes("deals_management");
    if (!hasDealsManagement) {
      throw new Error("Premium subscription with deals management required");
    }

    if (!user.dealershipId) {
      throw new Error("User not associated with a dealership");
    }

    // Create or find client
    let clientId = null;
    if (args.clientFirstName && args.clientLastName) {
      // Check if client exists
      const existingClient = await ctx.db
        .query("clients")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", user.dealershipId as Id<"dealerships">)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("firstName"), args.clientFirstName),
            q.eq(q.field("lastName"), args.clientLastName)
          )
        )
        .first();

      if (existingClient) {
        clientId = existingClient._id;
      } else {
        // Create new client
        clientId = await ctx.db.insert("clients", {
          client_id: `CLIENT-${Date.now()}`,
          firstName: args.clientFirstName,
          lastName: args.clientLastName,
          email: args.clientEmail,
          phone: args.clientPhone,
          status: "LEAD",
          dealershipId: user.dealershipId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Create or find vehicle if VIN provided
    let vehicleId: Id<"vehicles"> | undefined;
    if (args.vin) {
      const existingVehicle = await ctx.db
        .query("vehicles")
        .withIndex("by_vehicle_id", (q) => q.eq("id", args.vin as string))
        .filter((q) => q.eq(q.field("dealershipId"), user.dealershipId))
        .first();

      if (existingVehicle) {
        vehicleId = existingVehicle._id;
      } else {
        vehicleId = await ctx.db.insert("vehicles", {
          id: args.vin,
          vin: args.vin,
          stock: args.stockNumber || "",
          make: "Unknown",
          model: "Unknown",
          year: new Date().getFullYear(),
          mileage: 0,
          price: 0,
          status: "AVAILABLE",
          featured: false,
          dealershipId: user.dealershipId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Create the deal
    const dealId = await ctx.db.insert("deals", {
      type: args.type,
      clientId: clientId as Id<"clients">,
      vehicleId: vehicleId as Id<"vehicles">, // Will be set later if needed
      generated: false,
      clientSigned: false,
      dealerSigned: false,
      notarized: false,
      status: "draft",
      totalAmount: 0,
      dealershipId: user.dealershipId,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone,
      vin: args.vin,
      stockNumber: args.stockNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return dealId;
  },
});

export const deleteDeal = mutation({
  args: {
    dealId: v.id("deals"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new Error("Deal not found");

    // Verify user has access to this deal
    if (deal.dealershipId !== user.dealershipId) {
      throw new Error("Unauthorized: Deal belongs to different dealership");
    }

    // Delete related documents first
    const documents = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("dealId"), args.dealId))
      .collect();

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    // Delete the deal
    await ctx.db.delete(args.dealId);

    return { success: true, message: "Deal deleted successfully" };
  },
});

// Get complete deal data for desktop app
export const getCompleteDealData = query({
  args: {
    dealId: v.id("deals"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    // Check subscription for deals management
    const subscriptionStatus = await ctx.runQuery(
      api.subscriptions.checkSubscriptionStatus,
      {
        token: args.token,
      }
    );
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for deal management");
    }

    const hasDealsManagement =
      subscriptionStatus.subscription?.features?.includes("deals_management");
    if (!hasDealsManagement) {
      throw new Error("Premium subscription with deals management required");
    }

    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      return null;
    }

    // Fetch related data
    const client = deal.clientId ? await ctx.db.get(deal.clientId) : null;
    const vehicle = deal.vehicleId ? await ctx.db.get(deal.vehicleId) : null;

    // Get document pack
    const documentPack = await ctx.db
      .query("document_packs")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .first();

    // Get custom uploaded documents
    const customDocuments = await ctx.db
      .query("dealer_uploaded_documents")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get dealership info
    const dealership = deal.dealershipId
      ? await ctx.db.get(deal.dealershipId as Id<"dealerships">)
      : null;

    return {
      // Core deal data
      deal: {
        ...deal,
        id: deal._id,
      },
      // Related entities
      client,
      vehicle,
      dealership,
      // Document data
      documentPack,
      customDocuments,
      // Metadata
      lastUpdated: Date.now(),
    };
  },
});
