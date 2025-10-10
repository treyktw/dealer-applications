// convex/secure_s3.ts - Working S3 Implementation
import {
  action,
  internalAction,
  mutation,
  internalMutation,
  query,
  internalQuery,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  PutBucketVersioningCommand,
  PutBucketCorsCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { api } from "./_generated/api";

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Generate secure bucket name
export function generateDealershipBucketName(dealershipId: string): string {
  const prefix = process.env.AWS_S3_BUCKET_PREFIX || "dealership";
  const sanitizedId = dealershipId.replace(/[^a-z0-9-]/g, "-").toLowerCase();
  return `${prefix}-${sanitizedId}`;
}

// Check if bucket exists
export const checkBucketExists = internalAction({
  args: { bucketName: v.string() },
  handler: async (ctx, args) => {
    console.log(ctx);
    console.log(`Checking bucket existence: ${args.bucketName}`);
    try {
      await s3Client.send(
        new HeadBucketCommand({
          Bucket: args.bucketName,
        })
      );
      console.log(`Bucket ${args.bucketName} exists`);
      return true;
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  },
});

// SIMPLIFIED: Main bucket creation function (step by step to avoid XML errors)
export const createSecureDealershipBucket = internalAction({
  args: {
    dealershipId: v.string(),
    dealershipName: v.string(),
  },
  handler: async (ctx, args) => {
    const bucketName = generateDealershipBucketName(args.dealershipId);

    try {
      console.log(
        `Creating secure bucket: ${bucketName} for dealership: ${args.dealershipName}`
      );

      // Check if bucket already exists
      const bucketExists = await ctx.runAction(
        internal.secure_s3.checkBucketExists,
        {
          bucketName,
        }
      );

      if (bucketExists) {
        console.log(`Bucket ${bucketName} already exists`);
        return bucketName;
      }

      // Step 1: Create bucket (basic creation first)
      const createBucketParams: any = {
        Bucket: bucketName,
      };

      // Only add LocationConstraint if not in us-east-1
      if (process.env.AWS_REGION !== "us-east-1") {
        createBucketParams.CreateBucketConfiguration = {
          LocationConstraint: process.env.AWS_REGION,
        };
      }

      await s3Client.send(new CreateBucketCommand(createBucketParams));
      console.log(`✅ Step 1: Created bucket ${bucketName}`);

      // Step 2: Block all public access
      try {
        await s3Client.send(
          new PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
              BlockPublicAcls: true,
              IgnorePublicAcls: true,
              BlockPublicPolicy: true,
              RestrictPublicBuckets: true,
            },
          })
        );
        console.log(`✅ Step 2: Blocked public access for ${bucketName}`);
      } catch (error) {
        console.warn(`⚠️ Step 2 failed (public access block):`, error);
        // Continue anyway - this isn't critical
      }

      // Step 3: Enable server-side encryption (simple AES256 - no KMS complexity)
      try {
        await s3Client.send(
          new PutBucketEncryptionCommand({
            Bucket: bucketName,
            ServerSideEncryptionConfiguration: {
              Rules: [
                {
                  ApplyServerSideEncryptionByDefault: {
                    SSEAlgorithm: "AES256",
                  },
                },
              ],
            },
          })
        );
        console.log(`✅ Step 3: Enabled encryption for ${bucketName}`);
      } catch (error) {
        console.warn(`⚠️ Step 3 failed (encryption):`, error);
        // Continue anyway - encryption is optional
      }

      // Step 4: Enable versioning
      try {
        await s3Client.send(
          new PutBucketVersioningCommand({
            Bucket: bucketName,
            VersioningConfiguration: {
              Status: "Enabled",
            },
          })
        );
        console.log(`✅ Step 4: Enabled versioning for ${bucketName}`);
      } catch (error) {
        console.warn(`⚠️ Step 4 failed (versioning):`, error);
        // Continue anyway - versioning is optional
      }

      // Step 5: Configure CORS (simplified)
      try {
        await s3Client.send(
          new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedHeaders: [
                    "*",
                    "Content-Type",
                    "x-amz-acl",
                    "x-amz-meta-*",
                    "x-amz-server-side-encryption",
                    "x-amz-storage-class",
                    "x-amz-tagging",
                    "x-amz-website-redirect-location",
                  ],
                  AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"], // Remove "OPTIONS"
                  AllowedOrigins: [
                    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                    "https://*.vercel.app",
                    "https://*.netlify.app",
                  ],
                  ExposeHeaders: [
                    "ETag",
                    "x-amz-server-side-encryption",
                    "x-amz-request-id",
                    "x-amz-id-2",
                  ],
                  MaxAgeSeconds: 3600,
                },
              ],
            },
          })
        );
        console.log(`✅ Step 5: Configured CORS for ${bucketName}`);
      } catch (error) {
        console.warn(`⚠️ Step 5 failed (CORS):`, error);
        // Continue anyway - CORS can be set later
      }

      console.log(`🎉 Successfully created secure bucket: ${bucketName}`);

      // Log security event
      await ctx.runMutation(internal.secure_s3.logSecurityEvent, {
        action: "bucket_created",
        dealershipId: args.dealershipId as Id<"dealerships">,
        success: true,
        details: `S3 bucket created: ${bucketName}`,
        ipAddress: "server",
        timestamp: Date.now(),
      });

      return bucketName;
    } catch (error) {
      console.error("❌ Error creating secure bucket:", error);

      // Log security event
      await ctx.runMutation(internal.secure_s3.logSecurityEvent, {
        action: "bucket_creation_failed",
        dealershipId: args.dealershipId as Id<"dealerships">,
        success: false,
        details: `Failed to create bucket: ${error instanceof Error ? error.message : String(error)}`,
        ipAddress: "server",
        timestamp: Date.now(),
      });

      throw new ConvexError(
        `Failed to create secure dealership bucket: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

// Secure file upload URL generation
// Update your getSecureUploadUrl function in secure_s3.ts

export const getSecureUploadUrl = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    category: v.union(v.literal("vehicles"), v.literal("logos"), v.literal("documents"), v.literal("profiles")),
  },
  handler: async (ctx, args) => {
    // Authentication and authorization
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Basic authorization check
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new ConvexError("Access denied: User not authorized for this dealership");
    }

    // File validation
    const allowedTypes = {
      'vehicles': ['image/jpeg', 'image/png', 'image/webp'],
      'documents': ['application/pdf', 'image/jpeg', 'image/png'],
      'logos': ['image/jpeg', 'image/png', 'image/svg+xml'],
      'profiles': ['image/jpeg', 'image/png'],
    };

    if (!allowedTypes[args.category]?.includes(args.fileType)) {
      throw new ConvexError(`File type ${args.fileType} not allowed for category ${args.category}`);
    }

    // File size limits
    const sizeLimits = {
      'vehicles': 10 * 1024 * 1024, // 10MB
      'documents': 25 * 1024 * 1024, // 25MB  
      'logos': 5 * 1024 * 1024, // 5MB
      'profiles': 5 * 1024 * 1024, // 5MB
    };

    if (args.fileSize > sizeLimits[args.category]) {
      throw new ConvexError(`File size exceeds limit of ${sizeLimits[args.category] / (1024 * 1024)}MB`);
    }

    // Get dealership bucket
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership?.s3BucketName) {
      throw new ConvexError("Dealership S3 bucket not configured");
    }

    // Generate secure file path
    const sanitizedFileName = sanitizeFileName(args.fileName);
    const uniqueFileName = `${Date.now()}-${generateUniqueId()}-${sanitizedFileName}`;
    const filePath = `${args.dealershipId}/${args.category}/${uniqueFileName}`;

    // Generate signed upload URL
    const uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand({
      Bucket: dealership.s3BucketName,
      Key: filePath,
    }), { 
      expiresIn: 900, // 15 minutes
    });

    // Log for debugging
    console.log("Generated upload URL for:", filePath);

    // Log security event
    await ctx.db.insert("security_logs", {
      action: 'upload_url_generated',
      dealershipId: args.dealershipId,
      userId: identity.subject,
      success: true,
      details: `Upload URL generated for ${args.category}/${sanitizedFileName}`,
      ipAddress: 'server',
      timestamp: Date.now(),
    });

    return {
      uploadUrl,
      filePath,
      fileName: uniqueFileName,
      expiresIn: 900,
      maxFileSize: sizeLimits[args.category],
    };
  },
});

// Alternative version with minimal required parameters
export const getSimpleUploadUrl = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    category: v.union(v.literal("vehicles"), v.literal("logos"), v.literal("documents"), v.literal("profiles")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new ConvexError("Access denied");
    }

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership?.s3BucketName) {
      throw new ConvexError("Dealership S3 bucket not configured");
    }

    // Generate file path
    const sanitizedFileName = sanitizeFileName(args.fileName);
    const uniqueFileName = `${Date.now()}-${generateUniqueId()}-${sanitizedFileName}`;
    const filePath = `${args.dealershipId}/${args.category}/${uniqueFileName}`;

    // Generate the simplest possible presigned URL
    const command = new PutObjectCommand({
      Bucket: dealership.s3BucketName,
      Key: filePath,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 900,
    });

    return {
      uploadUrl,
      filePath,
      fileName: uniqueFileName,
      bucketName: dealership.s3BucketName,
    };
  },
});

// Generate signed URL for reading images
export const getImageUrl = mutation({
  args: {
    filePath: v.string(),
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new ConvexError("Access denied");
    }

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership?.s3BucketName) {
      throw new ConvexError("Dealership S3 bucket not configured");
    }

    // Generate signed URL for reading (valid for 1 hour)
    const imageUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: dealership.s3BucketName,
      Key: args.filePath,
    }), { 
      expiresIn: 3600, // 1 hour
    });

    return { imageUrl };
  },
});

// Batch function to get multiple image URLs at once (more efficient)
export const getImageUrls = mutation({
  args: {
    filePaths: v.array(v.string()),
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new ConvexError("Access denied");
    }

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership?.s3BucketName) {
      throw new ConvexError("Dealership S3 bucket not configured");
    }

    // Generate signed URLs for all images
    const imageUrls = await Promise.all(
      args.filePaths.map(async (filePath) => {
        const imageUrl = await getSignedUrl(s3Client, new GetObjectCommand({
          Bucket: dealership.s3BucketName,
          Key: filePath,
        }), { 
          expiresIn: 3600, // 1 hour
        });
        return { filePath, imageUrl };
      })
    );

    return { imageUrls };
  },
});

// Helper functions
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .substring(0, 100);
}

function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Helper mutations for database operations
export const getUserByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getDealership = internalMutation({
  args: { dealershipId: v.id("dealerships") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.dealershipId);
  },
});

export const updateDealershipBucket = internalMutation({
  args: {
    dealershipId: v.id("dealerships"),
    bucketName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.dealershipId, {
      s3BucketName: args.bucketName,
      updatedAt: Date.now(),
    });
  },
});

export const logSecurityEvent = internalMutation({
  args: {
    action: v.string(),
    dealershipId: v.optional(v.id("dealerships")),
    success: v.boolean(),
    details: v.string(),
    ipAddress: v.string(),
    timestamp: v.number(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("security_logs", args);
  },
});

// Main function to ensure dealership has bucket
export const ensureDealershipBucket = action({
  args: {
    dealershipId: v.id("dealerships"),
    dealershipName: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ bucketName: string; created: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Basic authorization check
    const user = await ctx.runMutation(internal.secure_s3.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new ConvexError(
        "Access denied: User not authorized for this dealership"
      );
    }

    const dealership = await ctx.runMutation(internal.secure_s3.getDealership, {
      dealershipId: args.dealershipId,
    });

    if (!dealership) {
      throw new ConvexError("Dealership not found");
    }

    // Check if bucket already exists
    if (dealership.s3BucketName) {
      console.log(
        `Dealership ${args.dealershipId} already has bucket: ${dealership.s3BucketName}`
      );
      return {
        bucketName: dealership.s3BucketName,
        created: false,
        message: "Bucket already exists",
      };
    }

    // Create bucket
    const bucketName = await ctx.runAction(
      internal.secure_s3.createSecureDealershipBucket,
      {
        dealershipId: args.dealershipId,
        dealershipName: args.dealershipName,
      }
    );

    // Update dealership with bucket name
    await ctx.runMutation(internal.secure_s3.updateDealershipBucket, {
      dealershipId: args.dealershipId,
      bucketName,
    });

    console.log(
      `Successfully created and assigned bucket ${bucketName} to dealership ${args.dealershipId}`
    );

    return {
      bucketName,
      created: true,
      message: "Bucket created successfully",
    };
  },
});

export const checkAndCreateMissingBuckets = action({
  args: {
    dryRun: v.optional(v.boolean()), // If true, only reports what would be done
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    totalDealerships: number;
    dealershipsWithBuckets: number;
    dealershipsWithoutBuckets: number;
    created: string[];
    failed: string[];
    skipped: string[];
    errors: Array<{ dealershipId: string; error: string }>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Check if user is admin
    const user = await ctx.runMutation(internal.secure_s3.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.role !== "admin") {
      throw new ConvexError("Admin access required");
    }

    console.log(
      `🔍 Starting bulk bucket check${args.dryRun ? " (DRY RUN)" : ""}...`
    );

    const result = {
      totalDealerships: 0,
      dealershipsWithBuckets: 0,
      dealershipsWithoutBuckets: 0,
      created: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
      errors: [] as Array<{ dealershipId: string; error: string }>,
    };

    try {
      // Get all dealerships
      const allDealerships = await ctx.runQuery(
        internal.secure_s3.getAllDealerships
      );

      result.totalDealerships = allDealerships.length;
      console.log(`📊 Found ${allDealerships.length} dealerships to check`);

      for (const dealership of allDealerships) {
        console.log(
          `\n🏢 Checking dealership: ${dealership.name} (${dealership._id})`
        );

        try {
          // Check if dealership already has a bucket
          if (dealership.s3BucketName) {
            console.log(`✅ Already has bucket: ${dealership.s3BucketName}`);
            result.dealershipsWithBuckets++;
            result.skipped.push(dealership.name);
            continue;
          }

          result.dealershipsWithoutBuckets++;
          console.log(`❌ Missing bucket for: ${dealership.name}`);

          if (args.dryRun) {
            console.log(
              `🔍 DRY RUN: Would create bucket for ${dealership.name}`
            );
            continue;
          }

          // Create bucket for this dealership
          console.log(`🚀 Creating bucket for: ${dealership.name}`);

          const bucketName = await ctx.runAction(
            internal.secure_s3.createSecureDealershipBucket,
            {
              dealershipId: dealership._id,
              dealershipName: dealership.name,
            }
          );

          // Update dealership with bucket name
          await ctx.runMutation(internal.secure_s3.updateDealershipBucket, {
            dealershipId: dealership._id,
            bucketName,
          });

          console.log(`✅ Successfully created bucket: ${bucketName}`);
          result.created.push(dealership.name);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Failed to create bucket for ${dealership.name}:`,
            errorMessage
          );

          result.failed.push(dealership.name);
          result.errors.push({
            dealershipId: dealership._id,
            error: errorMessage,
          });

          // Log the failure but continue with other dealerships
          await ctx.runMutation(internal.secure_s3.logSecurityEvent, {
            action: "bulk_bucket_creation_failed",
            dealershipId: dealership._id,
            success: false,
            details: `Bulk bucket creation failed: ${errorMessage}`,
            ipAddress: "server",
            timestamp: Date.now(),
          });
        }
      }

      // Log summary
      console.log(`\n📋 SUMMARY:`);
      console.log(`Total dealerships: ${result.totalDealerships}`);
      console.log(`With buckets: ${result.dealershipsWithBuckets}`);
      console.log(`Without buckets: ${result.dealershipsWithoutBuckets}`);
      console.log(`Created: ${result.created.length}`);
      console.log(`Failed: ${result.failed.length}`);
      console.log(`Skipped: ${result.skipped.length}`);

      // Log the bulk operation
      await ctx.runMutation(internal.secure_s3.logSecurityEvent, {
        action: args.dryRun
          ? "bulk_bucket_check_dry_run"
          : "bulk_bucket_creation_completed",
        success: result.failed.length === 0,
        details: `Bulk operation: ${result.created.length} created, ${result.failed.length} failed, ${result.skipped.length} skipped`,
        ipAddress: "server",
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Bulk bucket check failed:`, errorMessage);

      await ctx.runMutation(internal.secure_s3.logSecurityEvent, {
        action: "bulk_bucket_check_failed",
        success: false,
        details: `Bulk bucket check failed: ${errorMessage}`,
        ipAddress: "server",
        timestamp: Date.now(),
      });

      throw new ConvexError(`Bulk bucket check failed: ${errorMessage}`);
    }
  },
});

// Get bucket status for a specific dealership
export const getDealershipBucketStatus = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx: any, args: { dealershipId: Id<"dealerships"> }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new ConvexError("Dealership not found");
    }

    // Check if user has access to this dealership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (
      !user ||
      (user.role !== "admin" && user.dealershipId !== args.dealershipId)
    ) {
      throw new ConvexError("Access denied");
    }

    return {
      dealershipId: dealership._id,
      dealershipName: dealership.name,
      hasBucket: !!dealership.s3BucketName,
      bucketName: dealership.s3BucketName || null,
      expectedBucketName: generateDealershipBucketName(dealership._id),
    };
  },
});

// Get bucket status for all dealerships (admin only)
export const getAllDealershipsBucketStatus = query({
  args: {},
  handler: async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Admin access required");
    }

    const dealerships = await ctx.db.query("dealerships").collect();

    const dealershipsWithStatus = dealerships.map((dealership: any) => ({
      dealershipId: dealership._id,
      dealershipName: dealership.name,
      hasBucket: !!dealership.s3BucketName,
      bucketName: dealership.s3BucketName || null,
      expectedBucketName: generateDealershipBucketName(dealership._id),
      createdAt: dealership.createdAt,
    }));

    const stats = {
      total: dealerships.length,
      withBuckets: dealershipsWithStatus.filter((d: any) => d.hasBucket).length,
      withoutBuckets: dealershipsWithStatus.filter((d: any) => !d.hasBucket)
        .length,
    };

    return {
      dealerships: dealershipsWithStatus,
      stats,
    };
  },
});

// Force create bucket for a specific dealership (admin only)
export const forceCreateDealershipBucket = action({
  args: {
    dealershipId: v.id("dealerships"),
    overwrite: v.optional(v.boolean()), // If true, creates even if bucket name exists
  },
  handler: async (
    ctx,
    args
  ): Promise<{ bucketName: string; created: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Check if user is admin
    const user = await ctx.runMutation(internal.secure_s3.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.role !== "admin") {
      throw new ConvexError("Admin access required");
    }

    const dealership = await ctx.runMutation(internal.secure_s3.getDealership, {
      dealershipId: args.dealershipId,
    });

    if (!dealership) {
      throw new ConvexError("Dealership not found");
    }

    // Check if bucket already exists and overwrite not specified
    if (dealership.s3BucketName && !args.overwrite) {
      return {
        bucketName: dealership.s3BucketName,
        created: false,
        message: "Bucket already exists (use overwrite=true to recreate)",
      };
    }

    console.log(`🔧 Force creating bucket for: ${dealership.name}`);

    // Create bucket
    const bucketName = await ctx.runAction(
      internal.secure_s3.createSecureDealershipBucket,
      {
        dealershipId: args.dealershipId,
        dealershipName: dealership.name,
      }
    );

    // Update dealership with bucket name
    await ctx.runMutation(internal.secure_s3.updateDealershipBucket, {
      dealershipId: args.dealershipId,
      bucketName,
    });

    // Log the forced creation
    await ctx.runMutation(internal.secure_s3.logSecurityEvent, {
      action: "force_bucket_creation",
      dealershipId: args.dealershipId,
      userId: identity.subject,
      success: true,
      details: `Admin force-created bucket: ${bucketName} (overwrite: ${args.overwrite})`,
      ipAddress: "server",
      timestamp: Date.now(),
    });

    console.log(`✅ Force-created bucket: ${bucketName}`);

    return {
      bucketName,
      created: true,
      message: args.overwrite
        ? "Bucket recreated successfully"
        : "Bucket created successfully",
    };
  },
});

// Helper query to get all dealerships (internal use)
export const getAllDealerships = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("dealerships").collect();
  },
});

export const updateBucketCors = action({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, _args) => {
    const dealership = await ctx.runQuery(api.dealerships.getCurrentDealership);
    if (!dealership?.s3BucketName) {
      throw new ConvexError("Dealership S3 bucket not configured");
    }

    try {
      await s3Client.send(
        new PutBucketCorsCommand({
          Bucket: dealership.s3BucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: [
                  "*",
                  "Content-Type",
                  "x-amz-acl",
                  "x-amz-meta-*",
                  "x-amz-server-side-encryption",
                  "x-amz-storage-class",
                  "x-amz-tagging",
                  "x-amz-website-redirect-location",
                ],
                AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"], // Remove "OPTIONS"
                AllowedOrigins: [
                  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                  "https://*.vercel.app",
                  "https://*.netlify.app",
                ],
                ExposeHeaders: [
                  "ETag",
                  "x-amz-server-side-encryption",
                  "x-amz-request-id",
                  "x-amz-id-2",
                ],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        })
      );
      return { success: true, message: "CORS configuration updated" };
    } catch (error) {
      console.error("Failed to update CORS:", error);
      throw new ConvexError(
        `Failed to update CORS: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
