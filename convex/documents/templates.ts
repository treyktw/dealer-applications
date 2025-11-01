// convex/documents/templates.ts - Template CRUD Operations
import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  requireAuth,
  requireDealership,
  assertDealershipAccess,
} from "../guards";

/**
 * Create a new document template
 * This generates a presigned S3 URL for upload and creates the template record
 */
export const createTemplate = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    name: v.string(),
    category: v.union(
      v.literal("bill_of_sale"),
      v.literal("odometer_disclosure"),
      v.literal("buyers_guide"),
      v.literal("power_of_attorney"),
      v.literal("trade_in"),
      v.literal("finance_contract"),
      v.literal("warranty"),
      v.literal("custom")
    ),
    description: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireDealership(ctx, args.dealershipId);

    // Get dealership and org info
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    // Check if active template exists for this category
    const existingActive = await ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership_and_category", (q) =>
        q.eq("dealershipId", args.dealershipId).eq("category", args.category)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    // Determine version number
    const allVersions = await ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership_and_category", (q) =>
        q.eq("dealershipId", args.dealershipId).eq("category", args.category)
      )
      .collect();

    const version = allVersions.length + 1;

    // Generate S3 key using new org-based path structure
    const orgId = dealership.orgId || args.dealershipId; // Fallback to dealership if no org
    const timestamp = Date.now();
    const sanitizedFileName = args.fileName
      .replace(/[^a-zA-Z0-9.-]/g, "-")
      .toLowerCase();

    const s3Key = `org/${orgId}/docs/templates/${args.category}/v${version}-${timestamp}-${sanitizedFileName}`;

    // Create template record (initially inactive until PDF is uploaded)
    const templateId = await ctx.db.insert("documentTemplates", {
      dealershipId: args.dealershipId,
      orgId: dealership.orgId,
      name: args.name,
      category: args.category,
      description: args.description,
      version,
      isActive: false, // Will be activated after successful upload
      s3Key,
      fileSize: args.fileSize,
      pdfFields: [], // Will be populated by field extraction
      fieldMappings: [], // Will be populated by field extraction
      uploadedBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: args.dealershipId,
      action: "template_created",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Template created: ${args.name} (${args.category}) v${version}; prevActive: ${existingActive ? existingActive._id : "none"}`,
      timestamp: Date.now(),
    });

    return {
      templateId,
      version,
      s3Key,
    };
  },
});

/**
 * Get presigned upload URL for template PDF
 * Call this after createTemplate to get the upload URL
 */
export const getTemplateUploadUrl = action({
  args: {
    templateId: v.id("documentTemplates"),
    contentType: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number }> => {
    // Fetch via query API (actions do not have direct DB access)
    const template = await ctx.runQuery(
      api.documents.templates.getTemplateById,
      {
        templateId: args.templateId,
      }
    );

    if (!template) {
      throw new Error("Template not found");
    }

    // Validate content type
    if (args.contentType !== "application/pdf") {
      throw new Error("Only PDF files are allowed for templates");
    }

    // Validate file size (25MB limit)
    if (template.fileSize > 25 * 1024 * 1024) {
      throw new Error("File size exceeds 25MB limit");
    }

    // Generate presigned URL using secure_s3
    const { uploadUrl } = await ctx.runAction(
      internal.secure_s3.generateUploadUrl,
      {
        s3Key: template.s3Key,
        contentType: args.contentType,
        expiresIn: 900,
      }
    );

    return {
      uploadUrl,
      s3Key: template.s3Key,
      expiresIn: 900,
    };
  },
});

/**
 * Mark template upload as complete and trigger field extraction
 */
export const completeTemplateUpload = mutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    // Update template status
    await ctx.db.patch(args.templateId, {
      updatedAt: Date.now(),
    });

    // Trigger field extraction (async)
    await ctx.scheduler.runAfter(
      0,
      internal.documents.fields.extractFieldsFromTemplate,
      {
        templateId: args.templateId,
      }
    );

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_upload_completed",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Template upload completed: ${template.name} v${template.version}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update template field mappings
 */
export const updateFieldMappings = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    fieldMappings: v.array(
      v.object({
        pdfFieldName: v.string(),
        dataPath: v.string(),
        transform: v.optional(v.union(
          v.literal("date"),
          v.literal("uppercase"),
          v.literal("lowercase"),
          v.literal("titlecase"),
          v.literal("currency")
        )),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
        autoMapped: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    await ctx.db.patch(args.templateId, {
      fieldMappings: args.fieldMappings,
      updatedAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_field_mappings_updated",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Field mappings updated for template: ${template.name} v${template.version}; mappings count: ${args.fieldMappings.length}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get document setup progress
 */
export const getSetupProgress = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireDealership(ctx, args.dealershipId);

    const templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership", (q) =>
        q.eq("dealershipId", args.dealershipId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const categories = templates.map((t) => t.category);
    const hasBillOfSale = categories.includes("bill_of_sale");

    const RECOMMENDED_CATEGORIES = [
      "bill_of_sale",
      "buyers_guide",
      "odometer_disclosure",
      "power_of_attorney",
      "trade_in",
      "finance_contract",
      "warranty",
    ];

    const missingRecommended = RECOMMENDED_CATEGORIES.filter(
      (cat) => !(categories as string[]).includes(cat)
    );

    return {
      hasRequired: hasBillOfSale,
      uploadedCount: templates.length,
      totalRecommended: RECOMMENDED_CATEGORIES.length,
      progress: Math.round(
        (templates.length / RECOMMENDED_CATEGORIES.length) * 100
      ),
      missingRequired: hasBillOfSale ? [] : ["Bill of Sale"],
      missingRecommended,
      uploadedCategories: categories,
    };
  },
});

/**
 * Get all templates for a dealership
 */
export const getTemplates = query({
  args: {
    dealershipId: v.id("dealerships"),
    category: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireDealership(ctx, args.dealershipId);

    var query = ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership", (q) =>
        q.eq("dealershipId", args.dealershipId)
      );

    let templates = await query.collect();

    // Filter by category if provided
    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    // Filter by active status if requested
    if (args.activeOnly) {
      templates = templates.filter((t) => t.isActive);
    }

    // Sort by category, then version (desc)
    templates.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return b.version - a.version;
    });

    // Get uploader info for each template
    const templatesWithUsers = await Promise.all(
      templates.map(async (template) => {
        const uploader = await ctx.db.get(template.uploadedBy);
        return {
          ...template,
          uploadedByUser: uploader
            ? {
                name: uploader.name,
                email: uploader.email,
              }
            : null,
        };
      })
    );

    return templatesWithUsers;
  },
});

/**
 * Get single template by ID
 */
export const getTemplateById = query({
  args: {
    templateId: v.id("documentTemplates"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId, args.token);

    // Get the user who uploaded the template
    const uploadedByUser = await ctx.db.get(template.uploadedBy);

    return {
      ...template,
      uploadedByUser: uploadedByUser ? {
        name: uploadedByUser.name,
        email: uploadedByUser.email,
      } : null,
    };
  },
});

/**
 * Get template by ID without authentication (for internal use)
 */
export const getTemplateByIdInternal = internalMutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    return template;
  },
});

/**
 * Get active template for a category
 */
export const getActiveTemplate = query({
  args: {
    dealershipId: v.id("dealerships"),
    category: v.union(
      v.literal("bill_of_sale"),
      v.literal("odometer_disclosure"),
      v.literal("buyers_guide"),
      v.literal("power_of_attorney"),
      v.literal("trade_in"),
      v.literal("finance_contract"),
      v.literal("warranty"),
      v.literal("custom")
    ),
  },
  handler: async (ctx, args) => {
    await requireDealership(ctx, args.dealershipId);

    const template = await ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership_and_category", (q) =>
        q.eq("dealershipId", args.dealershipId).eq("category", args.category)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return template;
  },
});


/**
 * Get only active templates for a dealership
 * Wrapper around getTemplates for cleaner API
 */
export const getActiveTemplates = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    // Get all templates for dealership
    const templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership", (q) =>
        q.eq("dealershipId", args.dealershipId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Sort by category
    templates.sort((a, b) => a.category.localeCompare(b.category));

    return templates;
  },
});

/**
 * Activate a template version (deactivates others in same category)
 */
export const activateTemplate = mutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    // Deactivate all other templates in this category
    const otherTemplates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_dealership_and_category", (q) =>
        q
          .eq("dealershipId", template.dealershipId)
          .eq("category", template.category)
      )
      .collect();

    for (const other of otherTemplates) {
      if (other._id !== args.templateId && other.isActive) {
        await ctx.db.patch(other._id, {
          isActive: false,
          updatedAt: Date.now(),
        });
      }
    }

    // Activate this template
    await ctx.db.patch(args.templateId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_activated",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Template activated: ${template.name} v${template.version}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Deactivate a template
 */
export const deactivateTemplate = mutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_deactivated",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Template deactivated: ${template.name} v${template.version}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update template metadata (name, description)
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    const updates: Partial<Doc<"documentTemplates">> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.templateId, updates);

    // Log security event
    const changedFields: string[] = [];
    if (args.name !== undefined) changedFields.push("name");
    if (args.description !== undefined) changedFields.push("description");

    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_updated",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Template updated: ${template.name} v${template.version}; fields: ${changedFields.join(", ") || "none"}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete template completely (removes from Convex and S3)
 * This is a hard delete - use with caution
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    // Check if any document instances use this template
    const instances = await ctx.db
      .query("documentInstances")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .first();

    if (instances) {
      throw new Error(
        "Cannot delete template that has been used to generate documents. Deactivate instead."
      );
    }

    // Store template info for logging before deletion
    const templateInfo = {
      name: template.name,
      version: template.version,
      s3Key: template.s3Key,
    };

    // Delete the template record from Convex
    await ctx.db.delete(args.templateId);

    // Schedule S3 file deletion
    await ctx.scheduler.runAfter(
      0,
      internal.secure_s3.deleteFile,
      {
        s3Key: template.s3Key,
        reason: "template_deleted",
      }
    );

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_deleted",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Template permanently deleted: ${templateInfo.name} v${templateInfo.version} (S3: ${templateInfo.s3Key})`,
      timestamp: Date.now(),
      severity: "high",
    });

    return { success: true };
  },
});

/**
 * Get presigned download URL for template PDF (for preview)
 */
export const getTemplateDownloadUrl = action({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ downloadUrl: string; expiresIn: number }> => {
    const template = await ctx.runQuery(
      api.documents.templates.getTemplateById,
      {
        templateId: args.templateId,
      }
    );

    if (!template) {
      throw new Error("Template not found");
    }
    const { downloadUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        expiresIn: 300,
        s3Key: template.s3Key,
      }
    );

    return {
      downloadUrl,
      expiresIn: 300,
    };
  },
});
