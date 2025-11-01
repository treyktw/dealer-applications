import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Doc, Id } from "./_generated/dataModel";
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
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Handle authentication with token support
    let user: any;
    if (args.token) {
      // Desktop app authentication
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token: args.token });
      if (!sessionData?.user) {
        throw new Error("Invalid or expired session");
      }
      
      const { id, email } = sessionData.user as { id?: string; email?: string };
      
      // Try to find user by Clerk ID
      user = id
        ? await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", id)).first()
        : null;
      
      // Fallback to email if Clerk ID not found
      if (!user && email) {
        user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
      }
    } else {
      // Web app authentication
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Check subscription for custom document access
    try {
      const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {});
      if (!subscriptionStatus?.hasActiveSubscription) {
        // Return empty array instead of throwing for better UX
        console.log("User does not have active subscription for custom documents");
        return [];
      }

      const hasCustomUpload = subscriptionStatus.subscription?.features?.includes("custom_document_upload");
      if (!hasCustomUpload) {
        // Return empty array instead of throwing for better UX
        console.log("User subscription does not include custom_document_upload feature");
        return [];
      }

      return await ctx.db
        .query("dealer_uploaded_documents")
        .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    } catch (subscriptionError) {
      // If subscription check itself fails, log and return empty array
      console.error("Error checking subscription status:", subscriptionError);
      return [];
    }
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

export const generateCustomDocumentViewUrl = action({
  args: {
    documentId: v.id("dealer_uploaded_documents"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ viewUrl: string; fileName: string; fileType: string }> => {
    // Support both web and desktop auth
    let user: any;
    if (args.token) {
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token: args.token });
      if (!sessionData?.user) throw new Error("Invalid or expired session");
      
      const { id, email } = sessionData.user as { id?: string; email?: string };
      
      // Try to find user by Clerk ID
      user = id
        ? await ctx.runQuery(api.users.getUserByClerkId, { clerkId: id })
        : null;
      
      // Fallback to email if Clerk ID not found
      
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }
      user = await ctx.runQuery(api.users.getUserByClerkId, {
        clerkId: identity.subject,
      });
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Check subscription for custom document access
    const subscriptionStatus = await ctx.runQuery(api.subscriptions.checkSubscriptionStatus, {
      token: args.token,
    });
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
    if (user.dealershipId !== document.dealershipId) {
      throw new Error("Access denied: Document not authorized");
    }

    // Generate presigned view URL with inline content-disposition for iframe display
    const viewUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: document.s3Bucket,
        Key: document.s3Key,
        ResponseContentDisposition: 'inline', // Display in browser, not download
      }),
      { expiresIn: 3600 } // 1 hour
    );

    return { 
      viewUrl,
      fileName: document.documentName,
      fileType: document.mimeType,
    };
  },
});

// Get document with full metadata for viewer
export const getDocumentWithMetadata = query({
  args: {
    documentId: v.id("dealer_uploaded_documents"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Support both web and desktop auth
    let user: any;
    if (args.token) {
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token: args.token });
      if (!sessionData?.user) throw new Error("Invalid or expired session");
      
      const { id } = sessionData.user as { id?: string };
      user = id
        ? await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", id)).first()
        : null;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify access
    if (user.dealershipId !== document.dealershipId) {
      throw new Error("Access denied: Document not authorized");
    }

    // Get deal info
    const deal = await ctx.db.get(document.dealId);
    
    // Get uploader info
    const uploader = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), document.uploadedBy))
      .first();

    return {
      ...document,
      deal: deal ? {
        id: deal._id,
        type: deal.type,
        status: deal.status,
      } : null,
      uploadedByName: uploader ? `${uploader.name || ''}`.trim() : 'Unknown',
    };
  },
});

/**
 * Generate presigned URL for document preview in iframe
 * Used in the EditStep component
 */
export const getDocumentPreviewUrl = action({
  args: {
    documentId: v.id("documentInstances"),
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args): Promise<{ previewUrl: string; expiresAt: number }> => {
    // Support both web and desktop auth
    let user: any;
    if (args.token) {
      // Desktop app authentication
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token: args.token });
      if (!sessionData?.user) {
        throw new Error("Invalid or expired session");
      }
      
      const { id, email, dealershipId } = sessionData.user as { 
        id?: string; 
        email?: string; 
        dealershipId?: string; 
      };
      
      // Use session data directly since it's already validated
      user = {
        _id: id as Id<"users">,
        clerkId: id || "",
        email: email || "",
        dealershipId: dealershipId as Id<"dealerships">,
      } as Doc<"users">;
    } else {
      // Web app authentication
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }
      user = await ctx.runQuery(api.users.getUserByClerkId, {
        clerkId: identity.subject,
      });
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Get document metadata for generated documents
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
      token: args.token,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Verify user has access to this document
    if (user.dealershipId !== document.dealershipId) {
      throw new Error("Access denied: Document not authorized");
    }

    // Check if document has been generated and stored in S3
    if (!document.s3Key) {
      throw new Error("Document PDF not yet generated");
    }

    // Log retrieved S3 key for debugging
    console.log("Retrieved S3 key:", document.s3Key);
    console.log("Retrieved S3 key length:", document.s3Key.length);
    console.log("Retrieved S3 key ends with .pdf:", document.s3Key.endsWith('.pdf'));

    // Validate and clean S3 key format
    if (!document.s3Key.endsWith('.pdf')) {
      console.error("Invalid S3 key format detected:", document.s3Key);
      // Try to clean the S3 key by removing extra data after .pdf
      const cleanS3Key = document.s3Key.includes('.pdf') 
        ? document.s3Key.split('.pdf')[0] + '.pdf'
        : document.s3Key;
      console.log("Cleaned S3 key:", cleanS3Key);
      
      if (!cleanS3Key.endsWith('.pdf')) {
        throw new Error("Invalid document S3 key format - does not end with .pdf");
      }
      
      // Use the cleaned key
      document.s3Key = cleanS3Key;
    }

    // Use the same S3 bucket as document generation
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME not configured");
    }

    // Generate presigned URL with inline content disposition for iframe display
    const expirationSeconds = 3600; // 1 hour
    const previewUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: document.s3Key,
        ResponseContentDisposition: 'inline', // Display in browser, not download
        ResponseContentType: 'application/pdf',
      }),
      { expiresIn: expirationSeconds }
    );

    return {
      previewUrl,
      expiresAt: Date.now() + (expirationSeconds * 1000),
    };
  },
});

/**
 * Send email to client with deal documents attached
 */
export const sendDealDocumentsEmail = action({
  args: {
    dealId: v.id("deals"),
    clientEmail: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // Authenticate
    let user: any;
    if (args.token) {
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token: args.token });
      if (!sessionData?.user) throw new Error("Invalid or expired session");
      const { id, email } = sessionData.user as { id?: string; email?: string };
      user = id
        ? await ctx.runQuery(api.users.getUserByClerkId, { clerkId: id })
        : null;
      if (!user && email) {
        user = await ctx.runQuery(api.desktopAuth.getUserByEmail, { email });
      }
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      user = await ctx.runQuery(api.users.getUserByClerkId, {
        clerkId: identity.subject,
      });
    }

    if (!user) throw new Error("User not found");

    // Get deal and verify access
    const deal = await ctx.runQuery(api.deals.getDeal, {
      dealId: args.dealId,
      token: args.token,
    });

    if (!deal) throw new Error("Deal not found");
    if (deal.dealershipId !== user.dealershipId) {
      throw new Error("Access denied: Deal belongs to different dealership");
    }

    // Get client info
    const client = deal.clientId ? await ctx.runQuery(api.clients.getClientById, {
      clientId: deal.clientId,
    }) : null;

    // Get all documents for the deal
    const documents = await ctx.runQuery(api.documents.generator.getDocumentsByDeal, {
      dealId: args.dealId,
      token: args.token,
    });

    // Get custom documents
    let customDocuments: any[] = [];
    try {
      customDocuments = await ctx.runQuery(api.documents.getCustomDocumentsForDeal, {
        dealId: args.dealId,
        token: args.token,
      });
    } catch (error) {
      // Ignore subscription errors for custom documents
      console.log("Custom documents not available:", error instanceof Error ? error.message : String(error));
    }

    // Get dealership info
    const dealership = deal.dealershipId
      ? await ctx.runQuery(api.dealerships.getDealershipById, {
          dealershipId: deal.dealershipId as Id<"dealerships">,
          token: args.token,
        })
      : null;

    // Download all PDFs from S3 and prepare attachments
    const attachments: Array<{
      filename: string;
      content: string; // base64
    }> = [];

    // Process generated documents
    console.log(`Processing ${documents?.length || 0} generated documents`);
    for (const doc of documents || []) {
      if (!doc.s3Key) {
        console.log(`Skipping document ${doc._id}: no s3Key`);
        continue;
      }
      
      try {
        // Get download URL
        const { downloadUrl } = await ctx.runAction(
          internal.secure_s3.generateDownloadUrl,
          {
            s3Key: doc.s3Key,
            expiresIn: 300,
          }
        );

        // Download PDF
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          console.error(`Failed to download document ${doc._id}: HTTP ${response.status}`);
          continue;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert ArrayBuffer to base64 (Convex doesn't have Buffer)
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        // Process in chunks to avoid stack overflow for large files
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binaryString += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binaryString);

        const docName = doc.template?.name || `Document-${doc._id}`;
        attachments.push({
          filename: `${docName}.pdf`,
          content: base64,
        });
        console.log(`Successfully processed document ${doc._id}: ${docName}`);
      } catch (error) {
        console.error(`Failed to process document ${doc._id}:`, error);
      }
    }

    // Process custom documents
    console.log(`Processing ${customDocuments?.length || 0} custom documents`);
    for (const doc of customDocuments || []) {
      if (!doc.s3Key) {
        console.log(`Skipping custom document ${doc._id}: no s3Key`);
        continue;
      }
      
      try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) continue;

        const downloadUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: doc.s3Bucket || bucketName,
            Key: doc.s3Key,
          }),
          { expiresIn: 300 }
        );

        const response = await fetch(downloadUrl);
        if (!response.ok) continue;
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert ArrayBuffer to base64 (Convex doesn't have Buffer)
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        // Process in chunks to avoid stack overflow for large files
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize);
          binaryString += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binaryString);

        attachments.push({
          filename: doc.documentName || `Custom-${doc._id}.pdf`,
          content: base64,
        });
        console.log(`Successfully processed custom document ${doc._id}: ${doc.documentName}`);
      } catch (error) {
        console.error(`Failed to process custom document ${doc._id}:`, error);
      }
    }

    console.log(`Total attachments prepared: ${attachments.length}`);
    if (attachments.length === 0) {
      throw new Error("No documents available to send. Make sure documents have been generated and uploaded to S3.");
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const clientName = client 
      ? `${client.firstName} ${client.lastName}`.trim()
      : "Valued Customer";
    const dealershipName = dealership?.name || "Dealership";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin-top: 0;">Deal Documents</h1>
          </div>
          
          <p>Dear ${clientName},</p>
          
          <p>Please find attached all documents related to your deal with ${dealershipName}.</p>
          
          <p>The package includes ${attachments.length} document(s) for your records.</p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          ${dealershipName}</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </body>
      </html>
    `;

    const emailText = `
      Deal Documents

      Dear ${clientName},

      Please find attached all documents related to your deal with ${dealershipName}.

      The package includes ${attachments.length} document(s) for your records.

      If you have any questions, please don't hesitate to contact us.

      Best regards,
      ${dealershipName}

      ---
      This is an automated message. Please do not reply directly to this email.
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${dealershipName} <noreply@universalautobrokers.net>`,
        to: args.clientEmail,
        subject: `Your Deal Documents - ${dealershipName}`,
        html: emailHtml,
        text: emailText,
        attachments: attachments,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Email service error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log("✅ Email sent successfully:", result);

    return {
      success: true,
      message: `Email sent successfully to ${args.clientEmail}`,
    };
  },
});

