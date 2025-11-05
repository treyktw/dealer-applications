// convex/emailService.ts
// Email service for B2B (platform to dealers) and B2C (dealers to clients)

import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, requireUser } from "./lib/helpers/auth_helpers";
import {
  resend,
  sendEmail,
  sendBatchEmails,
  replaceTemplateVariables,
  EMAIL_CONFIG,
} from "./lib/resend/client";

// ============================================================================
// SEND SINGLE EMAIL (B2B or B2C)
// ============================================================================

/**
 * Send a single email (transactional or one-off)
 */
export const sendSingleEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    templateId: v.optional(v.string()),
    templateVariables: v.optional(v.any()),
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    // Optional: Link to user/client/dealership
    recipientUserId: v.optional(v.id("users")),
    recipientClientId: v.optional(v.id("clients")),
    recipientDealershipId: v.optional(v.id("dealerships")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (!resend) {
      throw new Error("Resend not configured");
    }

    // Get template if templateId provided
    let html = args.htmlContent;
    let text = args.textContent;

    if (args.templateId) {
      const template = await ctx.runQuery(internal.emailService.getTemplateById, {
        templateId: args.templateId as Id<"email_templates">,
      });

      if (template) {
        html = replaceTemplateVariables(
          template.htmlContent,
          args.templateVariables || {}
        );
        text = template.textContent
          ? replaceTemplateVariables(template.textContent, args.templateVariables || {})
          : undefined;
      }
    }

    if (!html && !text) {
      throw new Error("Email must have html or text content");
    }

    // Send email via Resend
    try {
      const result = await sendEmail({
        from: `${args.fromName || EMAIL_CONFIG.b2b.fromName} <${
          args.fromEmail || EMAIL_CONFIG.b2b.fromEmail
        }>`,
        to: args.to,
        subject: args.subject,
        html,
        text,
        replyTo: args.replyTo || EMAIL_CONFIG.b2b.replyTo,
        tags: [
          { name: "environment", value: process.env.NODE_ENV || "development" },
        ],
      });

      // Record the send
      await ctx.runMutation(internal.emailService.recordEmailSend, {
        recipientEmail: args.to,
        recipientUserId: args.recipientUserId,
        recipientClientId: args.recipientClientId,
        recipientDealershipId: args.recipientDealershipId,
        subject: args.subject,
        fromEmail: args.fromEmail || EMAIL_CONFIG.b2b.fromEmail,
        fromName: args.fromName || EMAIL_CONFIG.b2b.fromName,
        resendEmailId: result.data?.id,
        status: "sent",
        metadata: args.metadata,
      });

      return {
        success: true,
        emailId: result.data?.id,
      };
    } catch (error) {
      console.error("Failed to send email:", error);

      // Record the failed send
      await ctx.runMutation(internal.emailService.recordEmailSend, {
        recipientEmail: args.to,
        recipientUserId: args.recipientUserId,
        recipientClientId: args.recipientClientId,
        recipientDealershipId: args.recipientDealershipId,
        subject: args.subject,
        fromEmail: args.fromEmail || EMAIL_CONFIG.b2b.fromEmail,
        fromName: args.fromName || EMAIL_CONFIG.b2b.fromName,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        metadata: args.metadata,
      });

      throw error;
    }
  },
});

// ============================================================================
// B2B: SEND TO DEALERSHIP OWNERS
// ============================================================================

/**
 * Send email to specific dealership owners (B2B)
 */
export const sendToDealershipOwners = action({
  args: {
    dealershipIds: v.array(v.id("dealerships")),
    subject: v.string(),
    htmlContent: v.optional(v.string()),
    templateId: v.optional(v.string()),
    templateVariables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const emails: any[] = [];

    // Get all dealerships and their owners
    for (const dealershipId of args.dealershipIds) {
      const dealership = await ctx.runQuery(
        internal.emailService.getDealership,
        { dealershipId }
      );

      if (!dealership) continue;

      // Get dealership owner(s)
      const owners = await ctx.runQuery(internal.emailService.getDealershipOwners, {
        dealershipId,
      });

      for (const owner of owners) {
        if (!owner.email) continue;

        // Apply template variables
        const variables = {
          ...args.templateVariables,
          dealershipName: dealership.name,
          ownerName: owner.name,
          ownerEmail: owner.email,
        };

        let html = args.htmlContent;
        if (args.templateId) {
          const template = await ctx.runQuery(
            internal.emailService.getTemplateById,
            { templateId: args.templateId as Id<"email_templates"> }
          );
          if (template) {
            html = replaceTemplateVariables(template.htmlContent, variables);
          }
        } else if (html) {
          html = replaceTemplateVariables(html, variables);
        }

        emails.push({
          from: `${EMAIL_CONFIG.b2b.fromName} <${EMAIL_CONFIG.b2b.fromEmail}>`,
          to: owner.email,
          subject: replaceTemplateVariables(args.subject, variables),
          html,
          replyTo: EMAIL_CONFIG.b2b.replyTo,
          tags: [
            { name: "type", value: "b2b" },
            { name: "dealership_id", value: dealershipId },
          ],
        });
      }
    }

    if (emails.length === 0) {
      return { success: true, sent: 0 };
    }

    // Send batch emails
    const result = await sendBatchEmails(emails);

    // Record sends
    for (let i = 0; i < emails.length; i++) {
      await ctx.runMutation(internal.emailService.recordEmailSend, {
        recipientEmail: emails[i].to,
        recipientDealershipId: args.dealershipIds[Math.floor(i / 10)], // Approximate
        subject: emails[i].subject,
        fromEmail: EMAIL_CONFIG.b2b.fromEmail,
        fromName: EMAIL_CONFIG.b2b.fromName,
        resendEmailId: result.data?.[i]?.id,
        status: "sent",
      });
    }

    return {
      success: true,
      sent: emails.length,
    };
  },
});

/**
 * Send email to ALL dealership owners (B2B broadcast)
 */
export const sendToAllDealerships = action({
  args: {
    subject: v.string(),
    htmlContent: v.optional(v.string()),
    templateId: v.optional(v.string()),
    templateVariables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get all active dealerships
    const dealerships = await ctx.runQuery(
      internal.emailService.getAllDealerships,
      {}
    );

    return await ctx.runAction(internal.emailService.sendToDealershipOwners, {
      dealershipIds: dealerships.map((d) => d._id),
      subject: args.subject,
      htmlContent: args.htmlContent,
      templateId: args.templateId,
      templateVariables: args.templateVariables,
    });
  },
});

// ============================================================================
// B2C: SEND TO CLIENTS
// ============================================================================

/**
 * Send email to specific clients (B2C)
 */
export const sendToClients = action({
  args: {
    dealershipId: v.id("dealerships"),
    clientIds: v.array(v.id("clients")),
    subject: v.string(),
    htmlContent: v.optional(v.string()),
    templateId: v.optional(v.string()),
    templateVariables: v.optional(v.any()),
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    replyTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Verify user belongs to dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized");
    }

    const dealership = await ctx.runQuery(internal.emailService.getDealership, {
      dealershipId: args.dealershipId,
    });

    if (!dealership) throw new Error("Dealership not found");

    const emails: any[] = [];

    for (const clientId of args.clientIds) {
      const client = await ctx.runQuery(internal.emailService.getClient, {
        clientId,
      });

      if (!client || !client.email) continue;

      // Check email preferences
      const canSend = await ctx.runQuery(
        internal.emailService.checkEmailPreference,
        {
          email: client.email,
          emailType: "marketing",
        }
      );

      if (!canSend) continue;

      // Apply template variables
      const variables = {
        ...args.templateVariables,
        clientName: client.name,
        clientEmail: client.email,
        dealershipName: dealership.name,
      };

      let html = args.htmlContent;
      if (args.templateId) {
        const template = await ctx.runQuery(internal.emailService.getTemplateById, {
          templateId: args.templateId as Id<"email_templates">,
        });
        if (template) {
          html = replaceTemplateVariables(template.htmlContent, variables);
        }
      } else if (html) {
        html = replaceTemplateVariables(html, variables);
      }

      emails.push({
        from: `${args.fromName || dealership.name} <${
          args.fromEmail || `noreply@${dealership.name.toLowerCase().replace(/\s/g, "")}.com`
        }>`,
        to: client.email,
        subject: replaceTemplateVariables(args.subject, variables),
        html,
        replyTo: args.replyTo || dealership.contactEmail,
        tags: [
          { name: "type", value: "b2c" },
          { name: "dealership_id", value: args.dealershipId },
          { name: "client_id", value: clientId },
        ],
      });
    }

    if (emails.length === 0) {
      return { success: true, sent: 0 };
    }

    // Send batch emails
    const result = await sendBatchEmails(emails);

    // Record sends
    for (let i = 0; i < emails.length; i++) {
      await ctx.runMutation(internal.emailService.recordEmailSend, {
        recipientEmail: emails[i].to,
        recipientClientId: args.clientIds[i],
        recipientDealershipId: args.dealershipId,
        subject: emails[i].subject,
        fromEmail: args.fromEmail || EMAIL_CONFIG.b2b.fromEmail,
        fromName: args.fromName || dealership.name,
        resendEmailId: result.data?.[i]?.id,
        status: "sent",
      });
    }

    return {
      success: true,
      sent: emails.length,
    };
  },
});

// ============================================================================
// INTERNAL QUERIES (for actions to use)
// ============================================================================

export const getDealership = query({
  args: { dealershipId: v.id("dealerships") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.dealershipId);
  },
});

export const getAllDealerships = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("dealerships").collect();
  },
});

export const getDealershipOwners = query({
  args: { dealershipId: v.id("dealerships") },
  handler: async (ctx, args) => {
    // Get users with ADMIN role in the dealership
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("dealershipId"), args.dealershipId),
          q.eq(q.field("role"), "ADMIN")
        )
      )
      .collect();

    return users;
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clientId);
  },
});

export const getTemplateById = query({
  args: { templateId: v.id("email_templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

export const checkEmailPreference = query({
  args: {
    email: v.string(),
    emailType: v.union(
      v.literal("marketing"),
      v.literal("transactional"),
      v.literal("notifications"),
      v.literal("newsletters"),
      v.literal("promotions")
    ),
  },
  handler: async (ctx, args) => {
    const preference = await ctx.db
      .query("email_preferences")
      .withIndex("by_email_type", (q) =>
        q.eq("emailType", args.emailType).eq("isSubscribed", true)
      )
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    // If no preference found, default to subscribed for transactional, unsubscribed for marketing
    if (!preference) {
      return args.emailType === "transactional" || args.emailType === "notifications";
    }

    return preference.isSubscribed;
  },
});

// ============================================================================
// EMAIL TRACKING
// ============================================================================

export const recordEmailSend = internalMutation({
  args: {
    recipientEmail: v.string(),
    recipientUserId: v.optional(v.id("users")),
    recipientClientId: v.optional(v.id("clients")),
    recipientDealershipId: v.optional(v.id("dealerships")),
    subject: v.string(),
    fromEmail: v.string(),
    fromName: v.string(),
    resendEmailId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
    campaignId: v.optional(v.id("email_campaigns")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("email_sends", {
      campaignId: args.campaignId,
      recipientEmail: args.recipientEmail,
      recipientUserId: args.recipientUserId,
      recipientClientId: args.recipientClientId,
      recipientDealershipId: args.recipientDealershipId,
      subject: args.subject,
      fromEmail: args.fromEmail,
      fromName: args.fromName,
      resendEmailId: args.resendEmailId,
      status: args.status,
      sentAt: args.status === "sent" ? Date.now() : undefined,
      errorMessage: args.errorMessage,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get email send history
 */
export const getEmailHistory = query({
  args: {
    dealershipId: v.optional(v.id("dealerships")),
    clientId: v.optional(v.id("clients")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const limit = args.limit || 50;

    if (args.clientId) {
      return await ctx.db
        .query("email_sends")
        .withIndex("by_recipient_user")
        .filter((q) => q.eq(q.field("recipientClientId"), args.clientId))
        .order("desc")
        .take(limit);
    }

    if (args.dealershipId) {
      return await ctx.db
        .query("email_sends")
        .filter((q) => q.eq(q.field("recipientDealershipId"), args.dealershipId))
        .order("desc")
        .take(limit);
    }

    return [];
  },
});
