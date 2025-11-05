// convex/emailTemplates.ts
// Email template management

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser, requireMasterAdmin } from "./lib/helpers/auth_helpers";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// CREATE & UPDATE TEMPLATES
// ============================================================================

/**
 * Create email template
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("b2b_transactional"),
      v.literal("b2b_marketing"),
      v.literal("b2c_transactional"),
      v.literal("b2c_marketing"),
      v.literal("system")
    ),
    subject: v.string(),
    previewText: v.optional(v.string()),
    htmlContent: v.string(),
    textContent: v.optional(v.string()),
    variables: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
      })
    ),
    dealershipId: v.optional(v.id("dealerships")), // If dealership-specific
    isSystemTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // System templates require master admin
    if (args.isSystemTemplate || args.category.startsWith("b2b")) {
      await requireMasterAdmin(ctx);
    }

    // If dealership template, verify user belongs to dealership
    if (args.dealershipId && user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to create templates for this dealership");
    }

    const templateId = await ctx.db.insert("email_templates", {
      name: args.name,
      description: args.description,
      category: args.category,
      subject: args.subject,
      previewText: args.previewText,
      htmlContent: args.htmlContent,
      textContent: args.textContent,
      variables: args.variables,
      isActive: true,
      isSystemTemplate: args.isSystemTemplate || false,
      dealershipId: args.dealershipId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
    });

    return { templateId };
  },
});

/**
 * Update email template
 */
export const update = mutation({
  args: {
    templateId: v.id("email_templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    previewText: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    variables: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          defaultValue: v.optional(v.string()),
          required: v.boolean(),
        })
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // System templates require master admin
    if (template.isSystemTemplate) {
      await requireMasterAdmin(ctx);
    }

    // If dealership template, verify user belongs to dealership
    if (
      template.dealershipId &&
      user.dealershipId !== template.dealershipId
    ) {
      throw new Error("Not authorized to update this template");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.previewText !== undefined) updates.previewText = args.previewText;
    if (args.htmlContent !== undefined) updates.htmlContent = args.htmlContent;
    if (args.textContent !== undefined) updates.textContent = args.textContent;
    if (args.variables !== undefined) updates.variables = args.variables;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.templateId, updates);

    return { success: true };
  },
});

/**
 * Delete email template
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("email_templates"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    // Cannot delete system templates
    if (template.isSystemTemplate) {
      throw new Error("Cannot delete system templates");
    }

    // If dealership template, verify user belongs to dealership
    if (
      template.dealershipId &&
      user.dealershipId !== template.dealershipId
    ) {
      throw new Error("Not authorized to delete this template");
    }

    await ctx.db.delete(args.templateId);

    return { success: true };
  },
});

// ============================================================================
// READ TEMPLATES
// ============================================================================

/**
 * List templates
 */
export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("b2b_transactional"),
        v.literal("b2b_marketing"),
        v.literal("b2c_transactional"),
        v.literal("b2c_marketing"),
        v.literal("system")
      )
    ),
    dealershipId: v.optional(v.id("dealerships")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    let templates = await ctx.db.query("email_templates").collect();

    // Filter by category
    if (args.category) {
      templates = templates.filter((t) => t.category === args.category);
    }

    // Filter by dealership (or platform templates)
    if (args.dealershipId) {
      templates = templates.filter(
        (t) => !t.dealershipId || t.dealershipId === args.dealershipId
      );
    }

    // Filter by active status
    if (!args.includeInactive) {
      templates = templates.filter((t) => t.isActive);
    }

    // If not master admin, hide B2B templates
    if (user && user.role !== "ADMIN") {
      templates = templates.filter((t) => !t.category.startsWith("b2b"));
    }

    return templates;
  },
});

/**
 * Get template by ID
 */
export const getById = query({
  args: {
    templateId: v.id("email_templates"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// ============================================================================
// SEED SYSTEM TEMPLATES
// ============================================================================

/**
 * Seed default email templates (run once)
 */
export const seedDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireMasterAdmin(ctx);

    const templates = [
      // B2B: Welcome Email
      {
        name: "Welcome Email (B2B)",
        description: "Welcome new dealership owners to the platform",
        category: "b2b_transactional" as const,
        subject: "Welcome to DealerApps!",
        previewText: "Get started with your dealership management system",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Welcome to DealerApps, {{dealershipName}}!</h1>
            <p>Hi {{ownerName}},</p>
            <p>We're excited to have you on board! Your dealership management system is ready to use.</p>
            <h2>Getting Started</h2>
            <ul>
              <li>Complete your dealership profile</li>
              <li>Add your team members</li>
              <li>Import your inventory</li>
              <li>Start managing deals</li>
            </ul>
            <p>If you need any help, our support team is here for you at support@dealerapps.com</p>
            <p>Best regards,<br>The DealerApps Team</p>
          </div>
        `,
        variables: [
          { name: "dealershipName", description: "Dealership name", required: true },
          { name: "ownerName", description: "Owner's name", required: true },
        ],
        isSystemTemplate: true,
      },

      // B2B: Subscription Expiring
      {
        name: "Subscription Expiring (B2B)",
        description: "Notify dealership of upcoming subscription expiration",
        category: "b2b_transactional" as const,
        subject: "Your subscription expires soon",
        previewText: "Renew now to avoid service interruption",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F59E0B;">Subscription Expiring Soon</h1>
            <p>Hi {{ownerName}},</p>
            <p>Your DealerApps subscription for {{dealershipName}} will expire in {{daysRemaining}} days.</p>
            <p>To continue using our services without interruption, please renew your subscription.</p>
            <a href="{{renewUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Renew Now
            </a>
            <p>Questions? Contact us at billing@dealerapps.com</p>
            <p>Best regards,<br>The DealerApps Team</p>
          </div>
        `,
        variables: [
          { name: "dealershipName", description: "Dealership name", required: true },
          { name: "ownerName", description: "Owner's name", required: true },
          { name: "daysRemaining", description: "Days until expiration", required: true },
          { name: "renewUrl", description: "Renewal URL", required: true },
        ],
        isSystemTemplate: true,
      },

      // B2C: Deal Status Update
      {
        name: "Deal Status Update (B2C)",
        description: "Notify client about deal status change",
        category: "b2c_transactional" as const,
        subject: "Update on your vehicle purchase",
        previewText: "Your deal status has been updated",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10B981;">Deal Update</h1>
            <p>Hi {{clientName}},</p>
            <p>We have an update on your vehicle purchase:</p>
            <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Vehicle:</strong> {{vehicleName}}</p>
              <p><strong>Status:</strong> {{dealStatus}}</p>
              <p><strong>Message:</strong> {{statusMessage}}</p>
            </div>
            <p>If you have any questions, please don't hesitate to reach out.</p>
            <p>Best regards,<br>{{dealershipName}}</p>
          </div>
        `,
        variables: [
          { name: "clientName", description: "Client's name", required: true },
          { name: "vehicleName", description: "Vehicle description", required: true },
          { name: "dealStatus", description: "Current deal status", required: true },
          { name: "statusMessage", description: "Status update message", required: true },
          { name: "dealershipName", description: "Dealership name", required: true },
        ],
        isSystemTemplate: true,
      },

      // B2C: Thank You
      {
        name: "Thank You for Purchase (B2C)",
        description: "Thank client for their purchase",
        category: "b2c_marketing" as const,
        subject: "Thank you for your purchase!",
        previewText: "We appreciate your business",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10B981;">Thank You!</h1>
            <p>Hi {{clientName}},</p>
            <p>Thank you for choosing {{dealershipName}} for your vehicle purchase!</p>
            <p>We're thrilled to have you as part of our family and hope you enjoy your new {{vehicleName}}.</p>
            <h2>What's Next?</h2>
            <ul>
              <li>Schedule your first service appointment</li>
              <li>Join our customer loyalty program</li>
              <li>Follow us on social media for tips and updates</li>
            </ul>
            <p>If you need anything, we're always here to help!</p>
            <p>Best regards,<br>{{dealershipName}}<br>{{dealershipPhone}}</p>
          </div>
        `,
        variables: [
          { name: "clientName", description: "Client's name", required: true },
          { name: "dealershipName", description: "Dealership name", required: true },
          { name: "vehicleName", description: "Vehicle description", required: true },
          { name: "dealershipPhone", description: "Dealership phone", required: false },
        ],
        isSystemTemplate: true,
      },
    ];

    const templateIds = [];

    for (const template of templates) {
      const templateId = await ctx.db.insert("email_templates", {
        ...template,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
      });
      templateIds.push(templateId);
    }

    return {
      success: true,
      message: `Created ${templateIds.length} templates`,
      templateIds,
    };
  },
});
