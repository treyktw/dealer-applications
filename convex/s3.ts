import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  generateS3Key,
  type S3Category,
  generateUniqueFileName,
} from "./lib/s3/paths";
import {
  validateUpload,
  ALLOWED_CONTENT_TYPES,
  getMaxFileSize,
} from "./lib/s3/validation";
import { generateUploadUrl, generateViewUrl } from "./lib/s3/presign";

/**
 * Get a presigned VIEW URL for any object key
 */
export const getViewUrl = action({
  args: {
    s3Key: v.string(),
    expiresIn: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const url = await generateViewUrl(args.s3Key, args.expiresIn || 3600);
    return { url, expiresIn: args.expiresIn || 3600 };
  },
});

/**
 * Vehicle image upload URL (org-based path)
 */
export const getVehicleImageUploadUrl = action({
  args: {
    vehicleId: v.id("vehicles"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    // Auth: current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user?.dealershipId) throw new Error("User missing dealership");

    // Validate vehicle and dealership access
    const vehicle = await ctx.runQuery(api.inventory.getVehicle, {
      id: args.vehicleId,
    });
    if (!vehicle) throw new Error("Vehicle not found");

    const dealership = await ctx.runQuery(api.dealerships.getDealershipById, {
      dealershipId: user.dealershipId,
    });
    if (!dealership) throw new Error("Dealership not found");

    // Validate upload
    const category: S3Category = "vehicles";
    validateUpload(category, args.fileType, args.fileSize);

    // Build key: org/{orgId}/vehicles/{resourceId}/{uniqueFileName}
    const uniqueName = generateUniqueFileName(args.fileName);
    const s3Key = generateS3Key({
      orgId: (dealership.orgId || dealership._id) as string,
      category,
      resourceId: args.vehicleId,
      fileName: uniqueName,
    });

    const uploadUrl = await generateUploadUrl(s3Key, args.fileType, 900);

    return {
      uploadUrl,
      s3Key,
      fileName: uniqueName,
      expiresIn: 900,
      maxFileSize: getMaxFileSize(category),
      allowedTypes: ALLOWED_CONTENT_TYPES[category],
    };
  },
});


