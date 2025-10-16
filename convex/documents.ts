import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
// Helper function for custom document path (inline since we can't import from web app)
function generateCustomDocumentPath(dealershipId: string, dealId: string, fileName: string): string {
  return `${dealershipId}/custom-documents/${dealId}/${fileName}`;
}

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Get client by ID (for document generation)
export const getClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.get(args.clientId);
  },
});

// Get vehicle by ID (for document generation)
export const getVehicle = query({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.get(args.vehicleId);
  },
});

// Generate documents for a deal
export const generateDocuments = mutation({
  args: {
    clientId: v.id("clients"),
    vehicleId: v.id("vehicles"),
    saleDate: v.string(),
    saleAmount: v.number(),
    salesTax: v.optional(v.number()),
    docFee: v.optional(v.number()),
    tradeInValue: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    totalAmount: v.number(),
    financedAmount: v.optional(v.number()),
    documents: v.array(v.string()),
    dealershipId: v.id("dealerships"),
    vin: v.string(),
    status: v.string(),
    jurisdiction: v.string(),
    packType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check subscription for document generation
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for document generation");
    }

    // Create a new deal
    const dealId = await ctx.db.insert("deals", {
      type: "PURCHASE",
      clientId: args.clientId,
      vehicleId: args.vehicleId,
      dealershipId: args.dealershipId,
      status: "PENDING_SIGNATURE",
      saleAmount: args.saleAmount,
      totalAmount: args.totalAmount,
      generated: false,
      clientSigned: false,
      dealerSigned: false,
      notarized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create document pack for the deal
    const documentPackId = await ctx.db.insert("document_packs", {
      dealId,
      dealershipId: args.dealershipId,
      status: "PENDING",
      documents: args.documents.map(doc => ({
        status: "PENDING",
        templateId: "",
        templateType: "STANDARD",
        documentName: doc,
      })),
      jurisdiction: args.jurisdiction,
      packType: args.packType as "cash_sale" | "finance" | "lease",
      createdBy: identity.subject,
      buyers: [],
      dealershipInfo: {
        salespersonName: "",
        salespersonId: "",
      },
      validationStatus: {
        buyerDataComplete: false,
        vehicleDataComplete: false,
        dealershipDataComplete: false,
        allRequiredFields: false,
        lastValidated: undefined,
        errors: undefined,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      dealId,
      documentPackId,
      success: true,
      message: "Documents generated successfully"
    };
  },
});

// Get custom documents for a deal
export const getCustomDocumentsForDeal = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check subscription for custom document access
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for custom document access");
    }

    const hasCustomUpload = subscriptionStatus.subscription?.features?.includes("custom_document_upload");
    if (!hasCustomUpload) {
      throw new Error("Premium subscription with custom document upload required");
    }

    return await ctx.db
      .query("dealer_uploaded_documents")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Generate upload URL for custom document
export const generateCustomDocumentUploadUrl = action({
  args: {
    dealId: v.id("deals"),
    fileName: v.string(),
    fileType: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args): Promise<{ uploadUrl: string; documentId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check subscription for custom document access
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for custom document access");
    }

    const hasCustomUpload = subscriptionStatus.subscription?.features?.includes("custom_document_upload");
    if (!hasCustomUpload) {
      throw new Error("Premium subscription with custom document upload required");
    }

    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || !user.dealershipId) {
      throw new Error("User not found or not associated with dealership");
    }

    // Get deal to verify access
    const deal = await ctx.runQuery(api.deals.getDeal, {
      dealId: args.dealId,
    });

    if (!deal || deal.dealershipId !== user.dealershipId) {
      throw new Error("Access denied: Deal not found or unauthorized");
    }

    // Get dealership info for S3 bucket
    const dealership = await ctx.runQuery(api.dealerships.getDealershipById, {
      dealershipId: user.dealershipId,
    });

    if (!dealership?.s3BucketName) {
      throw new Error("Dealership S3 bucket not configured");
    }

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    
    // Generate S3 key for custom document
    const s3Key = generateCustomDocumentPath(
      user.dealershipId,
      args.dealId,
      uniqueFileName
    );

    // Create file upload record directly
    const fileUploadId = await ctx.runMutation(api.documents.createFileUploadRecord, {
      dealershipId: user.dealershipId,
      fileName: uniqueFileName,
      originalFileName: args.fileName,
      fileSize: 0, // Will be updated after upload
      fileType: args.mimeType,
      category: "custom_documents",
      s3Key,
      s3Bucket: dealership.s3BucketName,
      uploadedBy: user.id,
    });

    // Create custom document record
    const documentId = await ctx.runMutation(api.documents.createCustomDocumentRecord, {
      dealId: args.dealId,
      dealershipId: user.dealershipId,
      documentName: args.fileName,
      documentType: args.fileType,
      fileId: fileUploadId,
      s3Key,
      s3Bucket: dealership.s3BucketName,
      uploadedBy: user.id,
      fileSize: 0, // Will be updated after upload
      mimeType: args.mimeType,
    });

    // Generate presigned upload URL
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: dealership.s3BucketName,
        Key: s3Key,
        ContentType: args.mimeType,
      }),
      { expiresIn: 3600 } // 1 hour
    );

    return { uploadUrl, documentId };
  },
});

// Create file upload record
export const createFileUploadRecord = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    fileName: v.string(),
    originalFileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    category: v.string(),
    s3Key: v.string(),
    s3Bucket: v.string(),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("file_uploads", {
      dealershipId: args.dealershipId,
      fileName: args.fileName,
      originalFileName: args.originalFileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      category: args.category,
      s3Key: args.s3Key,
      s3Bucket: args.s3Bucket,
      uploadedBy: args.uploadedBy,
      isPublic: false,
      encrypted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Create custom document record
export const createCustomDocumentRecord = mutation({
  args: {
    dealId: v.id("deals"),
    dealershipId: v.id("dealerships"),
    documentName: v.string(),
    documentType: v.string(),
    fileId: v.id("file_uploads"),
    s3Key: v.string(),
    s3Bucket: v.string(),
    uploadedBy: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dealer_uploaded_documents", {
      dealId: args.dealId,
      dealershipId: args.dealershipId,
      documentName: args.documentName,
      documentType: args.documentType,
      fileId: args.fileId,
      s3Key: args.s3Key,
      s3Bucket: args.s3Bucket,
      uploadedBy: args.uploadedBy,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update custom document after successful upload
export const updateCustomDocumentAfterUpload = mutation({
  args: {
    documentId: v.id("dealer_uploaded_documents"),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.documentId, {
      fileSize: args.fileSize,
      updatedAt: Date.now(),
    });

    // Update file upload record
    await ctx.db.patch(document.fileId, {
      fileSize: args.fileSize,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get document by ID (internal query)
export const getDocumentById = query({
  args: {
    documentId: v.id("dealer_uploaded_documents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

// Generate download URL for custom document
export const generateCustomDocumentDownloadUrl = action({
  args: {
    documentId: v.id("dealer_uploaded_documents"),
  },
  handler: async (ctx, args): Promise<{ downloadUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check subscription for custom document access
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for custom document access");
    }

    const hasCustomUpload = subscriptionStatus.subscription?.features?.includes("custom_document_upload");
    if (!hasCustomUpload) {
      throw new Error("Premium subscription with custom document upload required");
    }

    const document = await ctx.runQuery(api.documents.getDocumentById, {
      documentId: args.documentId,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify user has access to this document
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.dealershipId !== document.dealershipId) {
      throw new Error("Access denied: Document not authorized");
    }

    // Generate presigned download URL
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: document.s3Bucket,
        Key: document.s3Key,
      }),
      { expiresIn: 3600 } // 1 hour
    );

    return { downloadUrl };
  },
});

// Delete custom document
export const deleteCustomDocument = mutation({
  args: {
    documentId: v.id("dealer_uploaded_documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check subscription for custom document access
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
    if (!subscriptionStatus?.hasActiveSubscription) {
      throw new Error("Premium subscription required for custom document access");
    }

    const hasCustomUpload = subscriptionStatus.subscription?.features?.includes("custom_document_upload");
    if (!hasCustomUpload) {
      throw new Error("Premium subscription with custom document upload required");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify user has access to this document
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.dealershipId !== document.dealershipId) {
      throw new Error("Access denied: Document not authorized");
    }

    // Mark as inactive instead of deleting
    await ctx.db.patch(args.documentId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});