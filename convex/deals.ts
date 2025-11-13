import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  canTransitionDealStatus,
  canTransitionVehicleStatus,
  canTransitionClientStatus,
  DealStatus,
  VehicleStatus,
  ClientStatus,
  type DealStatusType,
} from "./lib/statuses";
import { planHasFeature, FeatureFlags } from "./lib/subscription/config";
import { checkDealsLimit } from "./lib/subscription/limits";

// Helper function to require authentication (supports desktop token or web identity)
async function requireAuth(ctx: QueryCtx, token?: string): Promise<Doc<"users">> {
  // Path 1: Desktop app auth via token
  if (token) {
    type SessionUser = { id?: string; email?: string };
    
    const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { 
      accessToken: token,
    });
    if (!sessionData?.user) throw new Error("Invalid or expired session");
    
    const { id, email } = sessionData.user as SessionUser;
    
    let userDoc =
      id
        ? await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", id)).first()
        : null;
    
    if (!userDoc && email) {
      userDoc = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
    }
    
    if (!userDoc) throw new Error("User not found");
    return userDoc;
  }
  
  // Path 2: Web auth via Clerk identity
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
    
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}

export const getDeals = query({
  args: {
    dealershipId: v.string(),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args) => {
    // Require auth (desktop token or web identity)
    await requireAuth(ctx, args.token);

    // Check subscription for deals management
    const subscriptionStatus = await ctx.runQuery(
      api.subscriptions.checkSubscriptionStatus,
      { token: args.token }
    );
    
    // Return subscription error info instead of throwing
    if (!subscriptionStatus?.hasActiveSubscription) {
      return {
        deals: [],
        subscriptionRequired: true,
        subscriptionError: "Premium subscription required for deal management",
        hasActiveSubscription: false,
        hasDealsManagement: false,
      };
    }

    // Check if plan has deals_management feature (based on centralized config)
    // This is more reliable than checking the stored features array which might be outdated
    const subscription = subscriptionStatus.subscription;
    const hasDealsManagement =
      planHasFeature(subscription?.plan, FeatureFlags.DEALS_MANAGEMENT) ||
      subscription?.features?.includes(FeatureFlags.DEALS_MANAGEMENT);
    
    if (!hasDealsManagement) {
      return {
        deals: [],
        subscriptionRequired: true,
        subscriptionError: "Premium subscription with deals management feature required",
        hasActiveSubscription: true,
        hasDealsManagement: false,
      };
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
    return {
      deals: dealsWithRelations,
      subscriptionRequired: false,
      hasActiveSubscription: true,
      hasDealsManagement: true,
    };
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
      client: client
        ? {
            id: client._id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            address: client.address,
            city: client.city,
            state: client.state,
            zipCode: client.zipCode,
            driversLicense: client.driversLicense,
            ssn: client.ssn,
            creditScore: client.creditScore,
          }
        : null,
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

/**
 * Comprehensive status update function with:
 * - Status transition validation
 * - Full audit trail (status history)
 * - Cascading updates to vehicle and client
 * - Real-time sync (Convex automatically pushes to all clients)
 */
export const updateDealStatus = mutation({
  args: {
    dealId: v.id("deals"),
    newStatus: v.string(), // Will be validated against enum
    reason: v.optional(v.string()),
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args) => {
    // Try to get authenticated user (may be null if called from scheduled action)
    let user = null;
    try {
      user = await requireAuth(ctx, args.token);
    } catch {
      // If auth fails (e.g., in scheduled context), continue without user
      // We'll only verify dealership access if we have a user
      console.log("Running updateDealStatus in scheduled context (no user auth)");
    }

    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    // Verify user has access to this deal (only if we have a user)
    if (user) {
      if (deal.dealershipId !== user.dealershipId) {
        throw new Error("Unauthorized: Deal belongs to different dealership");
      }
    }

    const previousStatus = deal.status;
    const newStatus = args.newStatus;

    // Validate status transition
    if (!canTransitionDealStatus(previousStatus, newStatus)) {
      throw new Error(
        `Invalid status transition: Cannot transition from ${previousStatus} to ${newStatus}`
      );
    }

    // Build status history entry
    // Use system user ID if no user is available (scheduled context)
    const userId = user?._id || ("system" as Id<"users">);
    
    const historyEntry = {
      previousStatus,
      newStatus,
      changedAt: Date.now(),
      changedBy: userId,
      reason: args.reason,
    };

    // Type assertion: newStatus is validated and matches schema union type
    // Update deal status with tracking fields
    await ctx.db.patch(args.dealId, {
      status: newStatus as DealStatusType,
      statusChangedAt: Date.now(),
      statusChangedBy: userId,
      statusHistory: [...(deal.statusHistory || []), historyEntry],
      updatedAt: Date.now(),
      // Track approvals
      ...(newStatus === DealStatus.APPROVED && {
        approvedBy: userId,
        approvedAt: Date.now(),
      }),
      // Track cancellations
      ...(newStatus === DealStatus.CANCELLED && {
        cancelledBy: userId,
        cancelledAt: Date.now(),
        cancellationReason: args.reason,
      }),
    });

    // =========================================================================
    // CASCADING UPDATES - Auto-update related records
    // =========================================================================

    // Use userId for all cascading updates (system user if no auth)
    const userIdForUpdates = userId;
    
    // When deal is COMPLETED → Update vehicle to SOLD
    if (newStatus === DealStatus.COMPLETED && deal.vehicleId) {
      const vehicle = await ctx.db.get(deal.vehicleId);
      if (vehicle) {
        const canTransition = canTransitionVehicleStatus(
          vehicle.status,
          VehicleStatus.SOLD
        );
        if (canTransition) {
          await ctx.db.patch(vehicle._id, {
            status: VehicleStatus.SOLD,
            statusChangedAt: Date.now(),
            statusChangedBy: userIdForUpdates,
            clientId: deal.clientId ? String(deal.clientId) : undefined,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // When deal is COMPLETED → Update client to CUSTOMER
    if (newStatus === DealStatus.COMPLETED && deal.clientId) {
      const client = await ctx.db.get(deal.clientId);
      if (client) {
        // Only update if currently a lead stage (not already a customer)
        const leadStatuses = [
          ClientStatus.PROSPECT,
          ClientStatus.CONTACTED,
          ClientStatus.QUALIFIED,
          ClientStatus.NEGOTIATING,
          "LEAD", // Legacy
        ];
        if (leadStatuses.includes(client.status)) {
          const canTransition = canTransitionClientStatus(
            client.status,
            ClientStatus.CUSTOMER
          );
          if (canTransition) {
            await ctx.db.patch(client._id, {
              status: ClientStatus.CUSTOMER,
              statusChangedAt: Date.now(),
              statusChangedBy: userIdForUpdates,
              updatedAt: Date.now(),
            });
          }
        }
      }
    }

    // When deal is CANCELLED → Update vehicle back to AVAILABLE (if was PENDING_SALE)
    if (newStatus === DealStatus.CANCELLED && deal.vehicleId) {
      const vehicle = await ctx.db.get(deal.vehicleId);
      if (vehicle && vehicle.status === VehicleStatus.PENDING_SALE) {
        const canTransition = canTransitionVehicleStatus(
          vehicle.status,
          VehicleStatus.AVAILABLE
        );
        if (canTransition) {
          await ctx.db.patch(vehicle._id, {
            status: VehicleStatus.AVAILABLE,
            statusChangedAt: Date.now(),
            statusChangedBy: userIdForUpdates,
            clientId: undefined, // Remove client link
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Log status change
    await ctx.db.insert("security_logs", {
      dealershipId: deal.dealershipId as Id<"dealerships">,
      action: "deal_status_updated",
      userId: userIdForUpdates.toString(),
      ipAddress: "server",
      success: true,
      details: `Deal status changed from ${previousStatus} to ${newStatus}${args.reason ? ` (${args.reason})` : ""}`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      previousStatus,
      newStatus,
      dealId: args.dealId,
      timestamp: Date.now(),
    };
  },
});

export const getDealForGeneration = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      return null;
    }

    // Get client with all fields
    const client = deal.clientId ? await ctx.db.get(deal.clientId) : null;
    
    // Get vehicle with all fields
    const vehicle = deal.vehicleId ? await ctx.db.get(deal.vehicleId) : null;
    
    // Get dealership
    const dealership = deal.dealershipId
      ? await ctx.db.get(deal.dealershipId as Id<"dealerships">)
      : null;

    return {
      ...deal,
      id: deal._id,
      client,
      vehicle,
      dealership,
      clientName: client
        ? `${client.firstName} ${client.lastName}`
        : "Unknown Client",
    };
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
    clientId: v.id("clients"),
    vehicleId: v.id("vehicles"),
    dealershipId: v.string(),
    type: v.union(
      v.literal("cash"),
      v.literal("finance"),
      v.literal("lease")
    ),
    saleAmount: v.number(),
    salesTax: v.number(),
    docFee: v.number(),
    tradeInValue: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    financedAmount: v.optional(v.number()),
    totalAmount: v.number(),
    saleDate: v.number(),
    dealData: v.optional(v.any()), // Additional custom data
  },
  handler: async (ctx, args) => {
    // Require authentication
    const user = await requireAuth(ctx);
    
    // Verify user has access to this dealership
    // Convert both to strings for comparison since dealershipId might be Id<"dealerships"> or string
    const userDealershipId = user.dealershipId ? String(user.dealershipId) : null;
    const requestedDealershipId = String(args.dealershipId);
    
    if (!userDealershipId || userDealershipId !== requestedDealershipId) {
      throw new Error("Unauthorized: Dealership ID does not match user's dealership");
    }
    
    // Check deals limit for current month
    const dealsLimitCheck = await checkDealsLimit(ctx, args.dealershipId);
    
    if (!dealsLimitCheck.allowed) {
      throw new Error(
        `Deals limit reached for this month. You have created ${dealsLimitCheck.current} deals this month. ` +
        `Your ${dealsLimitCheck.limit === "unlimited" ? "plan" : `${dealsLimitCheck.limit} deal`} monthly limit has been reached. ` +
        `Please upgrade your subscription to create more deals.`
      );
    }

    // Verify client exists
    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    // Verify vehicle exists
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Create deal with new DRAFT status
    const dealId = await ctx.db.insert("deals", {
      clientId: args.clientId,
      vehicleId: args.vehicleId,
      dealershipId: args.dealershipId,
      type: args.type,
      status: DealStatus.DRAFT, // Use new status constant
      saleAmount: args.saleAmount,
      salesTax: args.salesTax,
      docFee: args.docFee,
      tradeInValue: args.tradeInValue,
      downPayment: args.downPayment,
      financedAmount: args.financedAmount,
      totalAmount: args.totalAmount,
      saleDate: args.saleDate,
      vin: vehicle.vin,
      stockNumber: vehicle.stock,
      clientEmail: client.email,
      clientPhone: client.phone,
      dealData: args.dealData,
      generated: false,
      clientSigned: false,
      dealerSigned: false,
      notarized: false,
      documentStatus: "none",
      // Status tracking fields
      statusChangedAt: Date.now(),
      statusHistory: [], // Initialize empty history
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("security_logs", {
      dealershipId: args.dealershipId as Id<"dealerships">,
      action: "deal_created",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Deal created for client ${client.firstName} ${client.lastName}`,
      timestamp: Date.now(),
    });

    // Schedule document generation asynchronously
    // This allows the deal creation to complete quickly while documents generate in the background
    try {
      await ctx.scheduler.runAfter(0, api.documents.deal_generator.generateDealDocuments, {
        dealId,
      });
    } catch (schedulerError) {
      // Log error but don't fail deal creation if document generation scheduling fails
      console.error("Failed to schedule document generation:", schedulerError);
      // The deal is still created successfully, documents can be generated manually later
    }

    return { dealId };
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
      {}
    );
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for deal management");
    }

    // Check if plan has deals_management feature (based on centralized config)
    const subscription = subscriptionStatus.subscription;
    const hasDealsManagement =
      planHasFeature(subscription?.plan, FeatureFlags.DEALS_MANAGEMENT) ||
      subscription?.features?.includes(FeatureFlags.DEALS_MANAGEMENT);
    
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

/**
 * Update deal document status
 * Used to track document generation progress
 */
export const updateDocumentStatus = mutation({
  args: {
    dealId: v.id("deals"),
    documentStatus: v.union(
      v.literal("none"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("complete")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dealId, {
      documentStatus: args.documentStatus,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
