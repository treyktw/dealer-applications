// convex/pdfTemplates.ts - Simplified and Fixed

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Storage mapping for known templates
const TEMPLATE_STORAGE_MAP = {
  "bill_of_sale-ga-v1": "kg20v1zvcervng2zq7tmqkhvs57q7abj", // Your GA Bill of Sale
  // Add more templates here as needed
};

// Register template using storage ID
export const registerTemplateFromStorage = mutation({
  args: {
    storageId: v.string(),
    templateType: v.string(),
    jurisdiction: v.string(),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) throw new Error("No dealership");

    // Get URL from storage
    const storageUrl = await ctx.storage.getUrl(args.storageId as any);
    if (!storageUrl) throw new Error("Storage file not found");

    const templateId = `${args.templateType}-${args.jurisdiction.toLowerCase()}-v${args.version || "1"}`;

    // Check if already exists
    const existing = await ctx.db
      .query("pdf_templates")
      .withIndex("by_dealership_type", q => 
        q.eq("dealershipId", user.dealershipId as Id<"dealerships">)
         .eq("templateType", args.templateType)
      )
      .filter(q => q.eq(q.field("jurisdiction"), args.jurisdiction))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        blankPdfUrl: storageUrl,
        version: args.version || "1",
        updatedAt: Date.now(),
      });
      return { templateId, updated: true };
    }

    // Create new
    const id = await ctx.db.insert("pdf_templates", {
      templateId,
      templateType: args.templateType,
      jurisdiction: args.jurisdiction,
      version: args.version || "1",
      storageId: args.storageId,
      blankPdfUrl: storageUrl,
      pdfSha256: "",
      fields: [], // Will be populated by inspection
      fieldMappings: [],
      dealershipId: user.dealershipId as Id<"dealerships">,
      isActive: true,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { templateId, _id: id, created: true };
  },
});

// Get template with fallback to storage
export const getTemplateById = query({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) throw new Error("No dealership");

    // Try to find existing template
    let template = await ctx.db
      .query("pdf_templates")
      .withIndex("by_dealership_type", q => 
        q.eq("dealershipId", user.dealershipId as Id<"dealerships">)
      )
      .filter(q => q.eq(q.field("templateId"), args.templateId))
      .first();

    // If not found, check if we have it in storage map
    if (!template && args.templateId in TEMPLATE_STORAGE_MAP) {
      const storageId = TEMPLATE_STORAGE_MAP[args.templateId as keyof typeof TEMPLATE_STORAGE_MAP];
      const storageUrl = await ctx.storage.getUrl(storageId as any);
      
      if (storageUrl) {
        // Return a virtual template object
        return {
          _id: "virtual" as Id<"pdf_templates">,
          templateId: args.templateId,
          templateType: args.templateId.split("-")[0].replace("_", " "),
          jurisdiction: args.templateId.split("-")[1].toUpperCase(),
          version: args.templateId.split("-v")[1] || "1",
          storageId,
          blankPdfUrl: storageUrl,
          pdfSha256: "",
          fields: [],
          fieldMappings: [],
          dealershipId: user.dealershipId as Id<"dealerships">,
          isActive: true,
          createdBy: "system",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
    }

    if (!template) throw new Error("Template not found");
    return template;
  },
});

// Ensure dealership has templates
export const ensureDealershipTemplates = mutation({
  args: {
    dealershipId: v.optional(v.id("dealerships")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    const dealershipId = args.dealershipId || user?.dealershipId;
    if (!dealershipId) throw new Error("No dealership");

    const results: { templateId: string; created: boolean, exists: boolean }[] = [];

    // Register all known templates
    for (const [templateId, storageId] of Object.entries(TEMPLATE_STORAGE_MAP)) {
      const [type, jurisdiction] = templateId.split("-");
      
      const existing = await ctx.db
        .query("pdf_templates")
        .withIndex("by_dealership_type", q => 
          q.eq("dealershipId", dealershipId as Id<"dealerships">)
           .eq("templateType", type.replace("_", " "))
        )
        .filter(q => q.eq(q.field("jurisdiction"), jurisdiction.toUpperCase()))
        .first();

      if (!existing) {
        const storageUrl = await ctx.storage.getUrl(storageId as any);
        if (storageUrl) {
          const id = await ctx.db.insert("pdf_templates", {
            templateId,
            templateType: type.replace("_", " "),
            jurisdiction: jurisdiction.toUpperCase(),
            version: "1",
            storageId,
            blankPdfUrl: storageUrl,
            pdfSha256: "",
            fields: [],
            fieldMappings: [],
            dealershipId: dealershipId as Id<"dealerships">,
            isActive: true,
            createdBy: identity.subject,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          results.push({ templateId: id, created: true, exists: false });
        }
      } else {
        results.push({ templateId, created: false, exists: true });
      }
    }

    return results;
  },
});

// Get all templates for dealership
export const getDealershipTemplates = query({
  args: {
    dealershipId: v.optional(v.id("dealerships")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    const dealershipId = args.dealershipId || user?.dealershipId;
    if (!dealershipId) throw new Error("No dealership");

    const templates = await ctx.db
      .query("pdf_templates")
      .withIndex("by_dealership_type", q => 
        q.eq("dealershipId", dealershipId as Id<"dealerships">)
      )
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    // Add virtual templates that aren't registered yet
    const registeredIds = new Set(templates.map(t => t.templateId));
    const virtualTemplates = [];

    for (const [templateId, storageId] of Object.entries(TEMPLATE_STORAGE_MAP)) {
      if (!registeredIds.has(templateId)) {
        const storageUrl = await ctx.storage.getUrl(storageId as any);
        if (storageUrl) {
          const [type, jurisdiction] = templateId.split("-");
          virtualTemplates.push({
            _id: `virtual_${templateId}` as Id<"pdf_templates">,
            templateId,
            templateType: type.replace("_", " "),
            jurisdiction: jurisdiction.toUpperCase(),
            version: "1",
            storageId,
            blankPdfUrl: storageUrl,
            pdfSha256: "",
            fields: [],
            fieldMappings: [],
            dealershipId: dealershipId as Id<"dealerships">,
            isActive: true,
            createdBy: "system",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isVirtual: true,
          });
        }
      }
    }

    return [...templates, ...virtualTemplates];
  },
});