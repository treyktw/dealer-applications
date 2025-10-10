// convex/templates.ts
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getPackForDeal = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    // For now, return empty array
    // Implement your template logic here
    return [];
  },
});

export const getTemplateManifest = query({
  args: {
    templateId: v.string(),
  },
  handler: async (_ctx, args) => {
    // Placeholder implementation
    return {
      id: args.templateId,
      name: "Template",
      version: "1.0.0",
      fields: [],
      requiredFields: [],
      pdfUrl: "",
      pdfSha256: "",
    };
  },
});