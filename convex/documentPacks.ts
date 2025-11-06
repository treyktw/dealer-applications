// convex/documentPacks.ts

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { DealStatus, type DealStatusType } from "./lib/statuses";

// Create a new document pack for a deal
export const createDocumentPack = mutation({
  args: {
    dealId: v.id("deals"),
    packType: v.string(), // "cash_sale", "finance", etc.
    jurisdiction: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) throw new Error("No dealership");

    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new Error("Deal not found");

    // Check if pack already exists
    const existing = await ctx.db
      .query("document_packs")
      .withIndex("by_deal", q => q.eq("dealId", args.dealId))
      .first();

    if (existing) {
      return { packId: existing._id, existing: true };
    }

    // Define which templates are needed based on pack type
    const requiredTemplates = getRequiredTemplates(args.packType, args.jurisdiction);

    // Get active templates
    const templates = await ctx.db
      .query("pdf_templates")
      .withIndex("by_dealership_type", q => 
        q.eq("dealershipId", user.dealershipId as Id<"dealerships">)
      )
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    // Create document entries
    const documents = requiredTemplates.map(reqTemplate => {
      const template = templates.find(t => 
        t.templateType === reqTemplate.type && 
        t.jurisdiction === args.jurisdiction
      );

      if (!template) {
        throw new Error(`Missing template: ${reqTemplate.type} for ${args.jurisdiction}`);
      }

      return {
        templateId: template.templateId,
        templateType: template.templateType,
        documentName: reqTemplate.name,
        status: "pending",
        fieldData: null,
      };
    });

    // Create the pack
    const packId = await ctx.db.insert("document_packs", {
      dealId: args.dealId,
      dealershipId: user.dealershipId as Id<"dealerships">,
      status: "draft",
      packType: args.packType,
      jurisdiction: args.jurisdiction,
      documents,
      buyers: [],
      dealershipInfo: {
        salespersonName: "",
        salespersonId: "",
        financeManagerName: undefined,
        financeManagerId: undefined,
        notaryName: undefined,
        notaryId: undefined,
      },
      validationStatus: {
        buyerDataComplete: false,
        vehicleDataComplete: false,
        dealershipDataComplete: false,
        allRequiredFields: false,
        lastValidated: undefined,
        errors: undefined,
      },
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { packId, existing: false };
  },
});

// Update buyer data
export const updateBuyerData = mutation({
  args: {
    packId: v.id("document_packs"),
    buyerIndex: v.number(),
    buyerData: v.object({
      buyerType: v.string(),
      firstName: v.string(),
      middleName: v.optional(v.string()),
      lastName: v.string(),
      suffix: v.optional(v.string()),
      dateOfBirth: v.string(),
      ssn: v.optional(v.string()),
      dlNumber: v.string(),
      dlState: v.string(),
      dlExpirationDate: v.string(),
      email: v.string(),
      phone: v.string(),
      address: v.object({
        street: v.string(),
        apt: v.optional(v.string()),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
      }),
      consents: v.object({
        eSignature: v.boolean(),
        eDelivery: v.boolean(),
        privacyPolicy: v.boolean(),
        marketing: v.optional(v.boolean()),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Document pack not found");

    // Update or add buyer
    const buyers = [...pack.buyers];
    buyers[args.buyerIndex] = {
      ...args.buyerData,
      dataSource: "manual",
      validatedAt: Date.now(),
    };

    await ctx.db.patch(args.packId, {
      buyers,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Validate pack data
export const validatePackData = query({
  args: {
    packId: v.id("document_packs"),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Document pack not found");

    const deal = await ctx.db.get(pack.dealId);
    if (!deal) throw new Error("Deal not found");

    const errors: Array<{field: string; message: string; severity: string}> = [];

    // Validate buyers
    if (pack.buyers.length === 0) {
      errors.push({
        field: "buyers",
        message: "At least one buyer is required",
        severity: "error",
      });
    } else {
      pack.buyers.forEach((buyer, index) => {
        // Validate required fields
        if (!buyer.firstName || !buyer.lastName) {
          errors.push({
            field: `buyer[${index}].name`,
            message: "Buyer name is required",
            severity: "error",
          });
        }
        
        // Validate age
        const dob = new Date(buyer.dateOfBirth);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18) {
          errors.push({
            field: `buyer[${index}].dateOfBirth`,
            message: "Buyer must be 18 or older",
            severity: "error",
          });
        }

        // Validate DL expiration
        const dlExp = new Date(buyer.dlExpirationDate);
        if (dlExp < new Date()) {
          errors.push({
            field: `buyer[${index}].dlExpirationDate`,
            message: "Driver's license is expired",
            severity: "warning",
          });
        }

        // Validate consents
        if (!buyer.consents.eSignature || !buyer.consents.eDelivery) {
          errors.push({
            field: `buyer[${index}].consents`,
            message: "E-signature and e-delivery consent required",
            severity: "error",
          });
        }
      });
    }

    // Validate dealership info
    if (!pack.dealershipInfo.salespersonName) {
      errors.push({
        field: "dealershipInfo.salesperson",
        message: "Salesperson information required",
        severity: "error",
      });
    }

    // Update validation status
    const validationStatus = {
      buyerDataComplete: pack.buyers.length > 0 && !errors.some(e => e.field.includes("buyer")),
      vehicleDataComplete: !!deal.vehicleId,
      dealershipDataComplete: !!pack.dealershipInfo.salespersonName,
      allRequiredFields: errors.filter(e => e.severity === "error").length === 0,
      lastValidated: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
    };

    return {
      valid: validationStatus.allRequiredFields,
      validationStatus,
      errors,
    };
  },
});
// convex/documentPacks.ts - Add these functions

export const getPackById = query({
  args: {
    packId: v.id("document_packs"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Document pack not found");

    // Verify user has access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== pack.dealershipId) {
      throw new Error("Access denied");
    }

    return pack;
  },
});

export const updateDealershipInfo = mutation({
  args: {
    packId: v.id("document_packs"),
    dealershipInfo: v.object({
      salespersonName: v.string(),
      salespersonId: v.string(),
      financeManagerName: v.optional(v.string()),
      financeManagerId: v.optional(v.string()),
      notaryName: v.optional(v.string()),
      notaryId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Document pack not found");

    await ctx.db.patch(args.packId, {
      dealershipInfo: args.dealershipInfo,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// convex/documentPacks.ts - Add this function
export const getPackByDealId = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pack = await ctx.db
      .query("document_packs")
      .withIndex("by_deal", q => q.eq("dealId", args.dealId))
      .first();

    if (!pack) return null;

    // Verify user has access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== pack.dealershipId) {
      throw new Error("Access denied");
    }

    return pack;
  },
});

// Helper function to define required templates per pack type
function getRequiredTemplates(packType: string, _jurisdiction: string) {
  const testingMode = true; // Or use an environment variable
  
  if (testingMode) {
    return [
      { type: "bill_of_sale", name: "Bill of Sale" },
    ];
  }
  
  const templates: Record<string, Array<{type: string; name: string}>> = {
    cash_sale: [
      { type: "bill_of_sale", name: "Bill of Sale" },
      { type: "odometer_disclosure", name: "Odometer Disclosure" },
      { type: "buyers_guide", name: "Buyer's Guide" },
    ],
    finance: [
      { type: "bill_of_sale", name: "Bill of Sale" },
      { type: "retail_installment", name: "Retail Installment Contract" },
      { type: "odometer_disclosure", name: "Odometer Disclosure" },
      { type: "buyers_guide", name: "Buyer's Guide" },
      { type: "privacy_notice", name: "Privacy Notice" },
    ],
  };

  return templates[packType] || templates.cash_sale;
}

/**
 * Mark document pack as signed and automatically update deal status
 * This enables desktop → web real-time sync when documents are signed
 */
export const markDocumentPackSigned = mutation({
  args: {
    documentPackId: v.id("document_packs"),
    signatureNotes: v.optional(v.string()),
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args) => {
    const docPack = await ctx.db.get(args.documentPackId);
    if (!docPack) {
      throw new Error("Document pack not found");
    }

    // Mark document pack as finalized
    await ctx.db.patch(args.documentPackId, {
      status: "finalized",
      updatedAt: Date.now(),
    });

    // =========================================================================
    // AUTO-UPDATE DEAL STATUS - Enables real-time sync to web app
    // =========================================================================
    if (docPack.dealId) {
      const deal = await ctx.db.get(docPack.dealId);
      if (deal) {
        // Only auto-update if deal is in a signing-related status
        const signingStatuses: DealStatusType[] = [
          DealStatus.AWAITING_SIGNATURES,
          DealStatus.PARTIALLY_SIGNED,
          DealStatus.DOCS_READY,
        ];

        if (signingStatuses.includes(deal.status as DealStatusType)) {
          // Call updateDealStatus to trigger cascading updates
          // This will also update vehicle → SOLD and client → CUSTOMER
          await ctx.runMutation(api.deals.updateDealStatus, {
            dealId: deal._id,
            newStatus: DealStatus.COMPLETED,
            reason: "All documents signed",
            token: args.token,
          });
        }
      }
    }

    return {
      success: true,
      documentPackId: args.documentPackId,
      dealAutoUpdated: !!docPack.dealId,
      timestamp: Date.now(),
    };
  },
});