// convex/dealerDocumentPackPurchases.ts
// Dealer functions for browsing and purchasing document packs

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";
import { stripe } from "./lib/stripe/client";
import type { Doc } from "./_generated/dataModel";

// ============================================================================
// DEALER - Browse & Purchase
// ============================================================================

/**
 * List available document packs for purchase (Dealer view)
 */
export const listAvailablePacks = query({
  args: {
    dealershipId: v.id("dealerships"),
    jurisdiction: v.optional(v.string()),
    packType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get active packs
    let packs = await ctx.db
      .query("document_pack_templates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Apply filters
    if (args.jurisdiction) {
      packs = packs.filter(
        (p) =>
          p.jurisdiction === args.jurisdiction || p.jurisdiction === "federal"
      );
    }

    if (args.packType) {
      packs = packs.filter((p) => p.packType === args.packType);
    }

    // For each pack, check if dealer already owns it
    const packsWithOwnership = await Promise.all(
      packs.map(async (pack) => {
        const purchase = await ctx.db
          .query("dealer_document_pack_purchases")
          .withIndex("by_dealership_pack", (q) =>
            q.eq("dealershipId", args.dealershipId).eq("packTemplateId", pack._id)
          )
          .first();

        return {
          ...pack,
          isOwned: !!purchase && purchase.status === "active",
          purchaseId: purchase?._id,
        };
      })
    );

    return packsWithOwnership;
  },
});

/**
 * Get dealer's owned packs
 */
export const getOwnedPacks = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("dealer_document_pack_purchases")
      .withIndex("by_dealership_status", (q) =>
        q.eq("dealershipId", args.dealershipId).eq("status", "active")
      )
      .collect();

    // Get full pack details for each purchase
    const ownedPacks = await Promise.all(
      purchases.map(async (purchase) => {
        const pack = await ctx.db.get(purchase.packTemplateId);
        return {
          purchase,
          pack,
        };
      })
    );

    return ownedPacks;
  },
});

/**
 * Check if dealer owns a specific pack
 */
export const checkOwnership = query({
  args: {
    dealershipId: v.id("dealerships"),
    packId: v.id("document_pack_templates"),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("dealer_document_pack_purchases")
      .withIndex("by_dealership_pack", (q) =>
        q.eq("dealershipId", args.dealershipId).eq("packTemplateId", args.packId)
      )
      .first();

    return {
      isOwned: !!purchase && purchase.status === "active",
      purchase,
    };
  },
});

/**
 * Check if dealer owns any pack for a jurisdiction/type combination
 */
export const checkOwnershipByType = query({
  args: {
    dealershipId: v.id("dealerships"),
    jurisdiction: v.string(),
    packType: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all dealer's active purchases
    const purchases = await ctx.db
      .query("dealer_document_pack_purchases")
      .withIndex("by_dealership_status", (q) =>
        q.eq("dealershipId", args.dealershipId).eq("status", "active")
      )
      .collect();

    // Check each purchase's pack details
    for (const purchase of purchases) {
      const pack = await ctx.db.get(purchase.packTemplateId);
      if (
        pack &&
        (pack.jurisdiction === args.jurisdiction ||
          pack.jurisdiction === "federal") &&
        pack.packType === args.packType
      ) {
        return {
          isOwned: true,
          purchase,
          pack,
        };
      }
    }

    return {
      isOwned: false,
      purchase: null,
      pack: null,
    };
  },
});

/**
 * Create Stripe Checkout Session for pack purchase
 */
export const createCheckoutSession = action({
  args: {
    packId: v.id("document_pack_templates"),
    dealershipId: v.id("dealerships"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sessionId: string; sessionUrl: string | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get pack details
    const pack: Doc<"document_pack_templates"> | null = await ctx.runQuery(api.documentPackTemplates.getById, {
      packId: args.packId,
    });

    if (!pack) throw new Error("Pack not found");
    if (!pack.isActive) throw new Error("Pack is not available for purchase");

    // Check if dealer already owns this pack
    const ownership = await ctx.runQuery(
      api.dealerDocumentPackPurchases.checkOwnership,
      {
        dealershipId: args.dealershipId,
        packId: args.packId,
      }
    );

    if (ownership.isOwned) {
      throw new Error("You already own this pack");
    }

    // Get dealership for customer info
    const dealership: Doc<"dealerships"> | null = await ctx.runQuery(
      api.dealerships.getDealershipById,
      { dealershipId: args.dealershipId }
    );

    if (!dealership) throw new Error("Dealership not found");

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: pack.name,
              description: pack.description,
              metadata: {
                packId: pack._id,
                dealershipId: args.dealershipId,
              },
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "document_pack_purchase",
        packId: pack._id,
        dealershipId: args.dealershipId,
        userId: identity.subject,
      },
      customer_email: dealership.email,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    });

    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
    };
  },
});

/**
 * Record a pack purchase (called by Stripe webhook)
 */
export const recordPurchase = internalMutation({
  args: {
    dealershipId: v.id("dealerships"),
    packTemplateId: v.id("document_pack_templates"),
    userId: v.id("users"),
    amountPaid: v.number(),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get pack details for version tracking
    const pack = await ctx.db.get(args.packTemplateId);
    if (!pack) throw new Error("Pack not found");

    // Create purchase record
    const purchaseId = await ctx.db.insert("dealer_document_pack_purchases", {
      dealershipId: args.dealershipId,
      packTemplateId: args.packTemplateId,
      packVersion: pack.version,
      purchaseDate: Date.now(),
      purchasedBy: args.userId,
      amountPaid: args.amountPaid,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeCustomerId: args.stripeCustomerId,
      status: "active",
      timesUsed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update pack analytics
    await ctx.db.patch(args.packTemplateId, {
      totalPurchases: pack.totalPurchases + 1,
      totalRevenue: pack.totalRevenue + args.amountPaid,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      purchaseId,
    };
  },
});

/**
 * Increment usage count when pack is used in a deal
 */
export const incrementUsage = mutation({
  args: {
    purchaseId: v.id("dealer_document_pack_purchases"),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) throw new Error("Purchase not found");

    await ctx.db.patch(args.purchaseId, {
      timesUsed: purchase.timesUsed + 1,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get pack purchase details
 */
export const getPurchaseById = query({
  args: {
    purchaseId: v.id("dealer_document_pack_purchases"),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) return null;

    const pack = await ctx.db.get(purchase.packTemplateId);

    return {
      purchase,
      pack,
    };
  },
});

/**
 * Preview pack documents before purchase (limited preview)
 */
export const previewPack = query({
  args: {
    packId: v.id("document_pack_templates"),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.db.get(args.packId);
    if (!pack) return null;

    // Return pack info with document list but NOT full template content
    return {
      name: pack.name,
      description: pack.description,
      jurisdiction: pack.jurisdiction,
      packType: pack.packType,
      price: pack.price,
      documentCount: pack.documents.length,
      documentList: pack.documents.map((doc) => ({
        type: doc.type,
        name: doc.name,
        required: doc.required,
        // Don't expose templateContent in preview
      })),
    };
  },
});
