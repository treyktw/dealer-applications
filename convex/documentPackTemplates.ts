// convex/documentPackTemplates.ts
// Master Admin functions for managing document pack templates in the marketplace

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { stripe } from "./lib/stripe/client";
import { requireMasterAdmin } from "./lib/helpers/auth_helpers";

// ============================================================================
// MASTER ADMIN - CRUD Operations
// ============================================================================

/**
 * Create a new document pack template (Master Admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    jurisdiction: v.string(),
    packType: v.string(),
    price: v.number(), // in cents
    documents: v.array(
      v.object({
        type: v.string(),
        name: v.string(),
        templateContent: v.string(),
        fillableFields: v.array(v.string()),
        required: v.boolean(),
        order: v.number(),
      })
    ),
    createStripeProduct: v.optional(v.boolean()), // Auto-create Stripe product/price
  },
  handler: async (ctx, args) => {
    // Verify master admin access
    const user = await requireMasterAdmin(ctx);

    // Create Stripe product and price if requested
    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;

    if (args.createStripeProduct) {
      try {
        // Create Stripe product
        const product = await stripe.products.create({
          name: args.name,
          description: args.description,
          metadata: {
            jurisdiction: args.jurisdiction,
            packType: args.packType,
            type: "document_pack",
          },
        });

        // Create Stripe price
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: args.price,
          currency: "usd",
          metadata: {
            packType: args.packType,
          },
        });

        stripeProductId = product.id;
        stripePriceId = price.id;
      } catch (error) {
        console.error("Failed to create Stripe product:", error);
        throw new Error("Failed to create Stripe product");
      }
    }

    // Create pack template
    const packId = await ctx.db.insert("document_pack_templates", {
      name: args.name,
      description: args.description,
      jurisdiction: args.jurisdiction,
      packType: args.packType,
      price: args.price,
      stripeProductId,
      stripePriceId,
      documents: args.documents,
      isActive: true,
      version: 1,
      totalPurchases: 0,
      totalRevenue: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
    });

    return {
      success: true,
      packId,
      stripeProductId,
      stripePriceId,
    };
  },
});

/**
 * Update an existing document pack template (Master Admin only)
 */
export const update = mutation({
  args: {
    packId: v.id("document_pack_templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    documents: v.optional(
      v.array(
        v.object({
          type: v.string(),
          name: v.string(),
          templateContent: v.string(),
          fillableFields: v.array(v.string()),
          required: v.boolean(),
          order: v.number(),
        })
      )
    ),
    isActive: v.optional(v.boolean()),
    changeNote: v.optional(v.string()), // Changelog entry
  },
  handler: async (ctx, args) => {
    // Verify master admin access
    const user = await requireMasterAdmin(ctx);

    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Pack not found");

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // If documents changed, increment version
    if (args.documents !== undefined) {
      updates.documents = args.documents;
      updates.version = pack.version + 1;

      // Add changelog entry
      const changelogEntry = {
        version: pack.version + 1,
        changes: args.changeNote || "Documents updated",
        updatedAt: Date.now(),
        updatedBy: user._id,
      };

      updates.changelog = [...(pack.changelog || []), changelogEntry];
    }

    await ctx.db.patch(args.packId, updates);

    return { success: true, packId: args.packId, newVersion: updates.version };
  },
});

/**
 * Delete a document pack template (Master Admin only)
 */
export const deletePack = mutation({
  args: {
    packId: v.id("document_pack_templates"),
  },
  handler: async (ctx, args) => {
    // Verify master admin access
    await requireMasterAdmin(ctx);

    // Check if any dealers have purchased this pack
    const purchases = await ctx.db
      .query("dealer_document_pack_purchases")
      .withIndex("by_pack_template", (q) => q.eq("packTemplateId", args.packId))
      .collect();

    if (purchases.length > 0) {
      // Don't delete, just deactivate
      await ctx.db.patch(args.packId, {
        isActive: false,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        message: "Pack deactivated (cannot delete - dealers own it)",
      };
    }

    // Safe to delete
    await ctx.db.delete(args.packId);

    return { success: true, message: "Pack deleted" };
  },
});

/**
 * List all document pack templates (Master Admin view)
 */
export const listAll = query({
  args: {
    jurisdiction: v.optional(v.string()),
    packType: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify master admin access
    await requireMasterAdmin(ctx);

    let packs = await ctx.db.query("document_pack_templates").collect();

    // Apply filters
    if (args.jurisdiction) {
      packs = packs.filter((p) => p.jurisdiction === args.jurisdiction);
    }

    if (args.packType) {
      packs = packs.filter((p) => p.packType === args.packType);
    }

    if (!args.includeInactive) {
      packs = packs.filter((p) => p.isActive);
    }

    // Sort by name
    packs.sort((a, b) => a.name.localeCompare(b.name));

    return packs;
  },
});

/**
 * Get a single pack template by ID
 */
export const getById = query({
  args: {
    packId: v.id("document_pack_templates"),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.db.get(args.packId);
    return pack;
  },
});

/**
 * Get pack sales analytics (Master Admin)
 */
export const getAnalytics = query({
  args: {
    packId: v.optional(v.id("document_pack_templates")),
  },
  handler: async (ctx, args) => {
    // Verify master admin access
    await requireMasterAdmin(ctx);

    if (args.packId) {
      // Single pack analytics
      const pack = await ctx.db.get(args.packId);
      if (!pack) throw new Error("Pack not found");

      const purchases = await ctx.db
        .query("dealer_document_pack_purchases")
        .withIndex("by_pack_template", (q) =>
          q.eq("packTemplateId", args.packId!)
        )
        .collect();

      const activePurchases = purchases.filter((p) => p.status === "active");

      return {
        packName: pack.name,
        totalPurchases: pack.totalPurchases,
        totalRevenue: pack.totalRevenue,
        activePurchases: activePurchases.length,
        refundedPurchases: purchases.filter((p) => p.status === "refunded")
          .length,
        totalUsage: purchases.reduce((sum, p) => sum + p.timesUsed, 0),
        averageUsagePerDealer:
          activePurchases.length > 0
            ? purchases.reduce((sum, p) => sum + p.timesUsed, 0) /
              activePurchases.length
            : 0,
      };
    } else {
      // All packs analytics
      const allPacks = await ctx.db.query("document_pack_templates").collect();

      const allPurchases = await ctx.db
        .query("dealer_document_pack_purchases")
        .collect();

      return {
        totalPacks: allPacks.length,
        activePacks: allPacks.filter((p) => p.isActive).length,
        totalRevenue: allPacks.reduce((sum, p) => sum + p.totalRevenue, 0),
        totalPurchases: allPacks.reduce((sum, p) => sum + p.totalPurchases, 0),
        totalUsage: allPurchases.reduce((sum, p) => sum + p.timesUsed, 0),
      };
    }
  },
});

// ============================================================================
// SEEDING - Initial Pack Creation
// ============================================================================

/**
 * Seed initial document packs (Master Admin only - run once)
 */
export const seedInitialPacks = mutation({
  args: {
    createStripeProducts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify master admin access
    const user = await requireMasterAdmin(ctx);

    const packs = [];

    // Pack 1: California Cash Sale Pack
    const californiaCashPack = await ctx.db.insert("document_pack_templates", {
      name: "California Cash Sale Pack",
      description:
        "Complete set of documents for cash vehicle sales in California. Includes all DMV-required forms and dealer documentation. Fully compliant with CA regulations.",
      jurisdiction: "california",
      packType: "cash_sale",
      price: 9900, // $99.00
      documents: [
        {
          type: "bill_of_sale",
          name: "Bill of Sale (REG 135)",
          templateContent: `<!-- This will be replaced with actual document template -->
<div class="document">
  <h1>Bill of Sale - State of California</h1>
  <p>This document certifies the sale of vehicle:</p>
  <p><strong>VIN:</strong> {{vin}}</p>
  <p><strong>Year:</strong> {{year}} <strong>Make:</strong> {{make}} <strong>Model:</strong> {{model}}</p>
  <p><strong>Seller:</strong> {{sellerName}}</p>
  <p><strong>Buyer:</strong> {{buyerName}}</p>
  <p><strong>Sale Price:</strong> ${{salePrice}}</p>
  <p><strong>Date:</strong> {{saleDate}}</p>
</div>`,
          fillableFields: [
            "vin",
            "year",
            "make",
            "model",
            "sellerName",
            "buyerName",
            "salePrice",
            "saleDate",
          ],
          required: true,
          order: 1,
        },
        {
          type: "odometer_disclosure",
          name: "Odometer Disclosure Statement (REG 262)",
          templateContent: `<!-- Placeholder for odometer disclosure template -->
<div class="document">
  <h1>Federal Odometer Disclosure Statement</h1>
  <p><strong>Vehicle:</strong> {{year}} {{make}} {{model}}</p>
  <p><strong>VIN:</strong> {{vin}}</p>
  <p><strong>Odometer Reading:</strong> {{odometer}} miles</p>
  <p><strong>Seller:</strong> {{sellerName}}</p>
  <p><strong>Buyer:</strong> {{buyerName}}</p>
</div>`,
          fillableFields: ["vin", "year", "make", "model", "odometer", "sellerName", "buyerName"],
          required: true,
          order: 2,
        },
        {
          type: "smog_certification",
          name: "Smog Certification Transfer",
          templateContent: `<!-- Placeholder -->`,
          fillableFields: ["vin", "certificationNumber", "date"],
          required: true,
          order: 3,
        },
      ],
      isActive: true,
      version: 1,
      totalPurchases: 0,
      totalRevenue: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
    });

    packs.push(californiaCashPack);

    // Pack 2: Federal Cash Sale Pack (any state)
    const federalCashPack = await ctx.db.insert("document_pack_templates", {
      name: "Federal Cash Sale Pack",
      description:
        "Basic document pack for cash sales in any state. Includes federal-required documents. Perfect for dealers operating in multiple states.",
      jurisdiction: "federal",
      packType: "cash_sale",
      price: 4900, // $49.00
      documents: [
        {
          type: "bill_of_sale",
          name: "Bill of Sale",
          templateContent: `<!-- Placeholder -->`,
          fillableFields: [
            "vin",
            "year",
            "make",
            "model",
            "sellerName",
            "buyerName",
            "salePrice",
            "saleDate",
          ],
          required: true,
          order: 1,
        },
        {
          type: "odometer_disclosure",
          name: "Federal Odometer Disclosure",
          templateContent: `<!-- Placeholder -->`,
          fillableFields: [
            "vin",
            "odometer",
            "sellerName",
            "buyerName",
          ],
          required: true,
          order: 2,
        },
      ],
      isActive: true,
      version: 1,
      totalPurchases: 0,
      totalRevenue: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
    });

    packs.push(federalCashPack);

    return {
      success: true,
      message: `Seeded ${packs.length} document packs`,
      packIds: packs,
    };
  },
});
