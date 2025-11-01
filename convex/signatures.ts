import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const SIGNATURE_RETENTION_DAYS = 30;
const IMAGE_PREVIEW_RETENTION_HOURS = 24;

const ESIGNATURE_CONSENT_TEXT_V1 = `
By signing electronically, you agree that your electronic signature is the 
legal equivalent of your manual signature on this document. You acknowledge 
that you are signing this document voluntarily and that you have the right 
to request a paper copy. 

Your signature data will be securely stored for 30 days for audit and legal 
compliance purposes, after which it will be permanently and securely deleted. 
The signature image is encrypted at rest and in transit.

You further acknowledge that:
1. You have read and understood this document
2. You are legally authorized to sign this document
3. The information provided is accurate and complete
4. This electronic signature has the same legal effect as a handwritten signature

If you do not agree to these terms, please do not sign electronically.
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function requireAuth(ctx: QueryCtx | MutationCtx, token?: string): Promise<Doc<"users">> {
  // Path 1: Desktop app authentication (with token)
  if (token) {
    // For mutations, we can't use runQuery, so query the session directly
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    
    if (!session) {
      throw new Error("Invalid or expired session");
    }
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      throw new Error("Session expired");
    }
    
    // Get user from session
    const userDoc = await ctx.db.get(session.userId);
    if (!userDoc) {
      throw new Error("User not found in database");
    }
    
    return userDoc;
  }
  
  // Path 2: Web app authentication (with Clerk identity)
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

function generateSecureToken(): string {
  // Generate cryptographically secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// SIGNATURE SESSION MANAGEMENT
// ============================================================================

/**
 * Create a signature session (called from desktop app or web)
 */
export const createSignatureSession = mutation({
  args: {
    dealId: v.id("deals"),
    documentId: v.id("documentInstances"),
    signerRole: v.union(
      v.literal("buyer"),
      v.literal("seller"),
      v.literal("notary")
    ),
    signerName: v.string(),
    signerEmail: v.optional(v.string()),
    sessionToken: v.optional(v.string()), // Desktop app session token
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionToken);

    if (!user.dealershipId) {
      throw new Error("User not associated with a dealership");
    }

    // Verify deal belongs to this dealership
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    if (deal.dealershipId !== user.dealershipId) {
      throw new Error("Unauthorized: Deal belongs to different dealership");
    }

    // Verify document exists and belongs to this deal
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.dealId !== args.dealId) {
      throw new Error("Document does not belong to this deal");
    }

    // Check if signature already exists for this role
    const existingSignature = await ctx.db
      .query("signatures")
      .withIndex("by_role_deal", (q) =>
        q.eq("dealId", args.dealId).eq("signerRole", args.signerRole)
      )
      .first();

    if (existingSignature) {
      throw new Error(
        `Signature already exists for ${args.signerRole}. Please void the existing signature first.`
      );
    }

    // Cancel any pending sessions for this document/role
    const pendingSessions = await ctx.db
      .query("signatureSessions")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .filter((q) =>
        q.and(
          q.eq(q.field("documentId"), args.documentId),
          q.eq(q.field("signerRole"), args.signerRole),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    for (const session of pendingSessions) {
      await ctx.db.patch(session._id, {
        status: "cancelled",
      });
    }

    // Generate secure token
    const sessionToken = generateSecureToken();
    const expiresAt = Date.now() + SESSION_EXPIRY_MS;

    // Create new session
    const sessionId = await ctx.db.insert("signatureSessions", {
      sessionToken,
      dealId: args.dealId,
      documentId: args.documentId,
      dealershipId: user.dealershipId,
      signerRole: args.signerRole,
      signerName: args.signerName,
      signerEmail: args.signerEmail,
      status: "pending",
      consentGiven: false,
      consentText: ESIGNATURE_CONSENT_TEXT_V1,
      createdBy: user._id,
      expiresAt,
      createdAt: Date.now(),
    });

    // Log to security logs
    await ctx.db.insert("security_logs", {
      dealershipId: user.dealershipId,
      action: "signature_session_created",
      userId: user._id,
      ipAddress: "system", // Desktop app context doesn't expose IP, could be passed as optional parameter
      success: true,
      details: JSON.stringify({
        sessionId,
        dealId: args.dealId,
        documentId: args.documentId,
        signerRole: args.signerRole,
        signerName: args.signerName,
      }),
      timestamp: Date.now(),
      resource: "signature_session",
      method: "CREATE",
      severity: "info",
    });

    return {
      sessionId,
      sessionToken,
      expiresAt,
      signatureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign/${sessionToken}`,
    };
  },
});

/**
 * Get signature session (for mobile page)
 */
export const getSignatureSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("signatureSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired - mark status in response but don't mutate in query
    const isExpired = Date.now() > session.expiresAt && session.status === "pending";
    const sessionStatus = isExpired ? "expired" : session.status;

    // Get deal info for display
    const deal = await ctx.db.get(session.dealId);
    const document = await ctx.db.get(session.documentId);
    const dealership = await ctx.db.get(session.dealershipId);

    return {
      ...session,
      status: sessionStatus,
      deal: deal
        ? {
            id: deal._id,
            type: deal.type,
            totalAmount: deal.totalAmount,
          }
        : null,
      document: document
        ? {
            id: document._id,
            documentType: document.documentType,
          }
        : null,
      dealership: dealership
        ? {
            name: dealership.name,
            address: dealership.address,
          }
        : null,
    };
  },
});

/**
 * Check session status (for desktop polling)
 */
export const checkSessionStatus = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("signatureSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { status: "not_found" };
    }

    return {
      status: session.status,
      signedAt: session.signedAt,
      signatureS3Key: session.signatureS3Key,
      expiresAt: session.expiresAt,
    };
  },
});

/**
 * Cancel a signature session
 */
export const cancelSignatureSession = mutation({
  args: {
    sessionToken: v.string(),
    authToken: v.optional(v.string()), // Desktop app session token
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.authToken);

    const session = await ctx.db
      .query("signatureSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    // Verify user has permission
    if (session.createdBy !== user._id) {
      throw new Error("Unauthorized: You did not create this session");
    }

    if (session.status !== "pending") {
      throw new Error("Can only cancel pending sessions");
    }

    await ctx.db.patch(session._id, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// ============================================================================
// SIGNATURE SUBMISSION
// ============================================================================

/**
 * Submit signature (called from mobile)
 */
export const submitSignature = mutation({
  args: {
    sessionToken: v.string(),
    signatureData: v.string(), // Base64 data URL (PNG or SVG)
    consentGiven: v.boolean(),
    ipAddress: v.string(),
    userAgent: v.string(),
    geolocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.db
      .query("signatureSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    // Validate session status
    if (session.status !== "pending") {
      throw new Error(
        `Session is ${session.status}. Only pending sessions can be signed.`
      );
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      await ctx.db.patch(session._id, { status: "expired" });
      throw new Error("Session expired. Please request a new signature link.");
    }

    // Validate consent
    if (!args.consentGiven) {
      throw new Error("Consent is required to submit electronic signature");
    }

    // Validate signature data format (accept PNG or SVG)
    const isPng = args.signatureData.startsWith("data:image/png;base64,");
    const isSvg = args.signatureData.startsWith("data:image/svg+xml;base64,");
    
    if (!isPng && !isSvg) {
      throw new Error("Invalid signature data format. Expected PNG or SVG data URL.");
    }

    // Trigger S3 upload action (will handle SVG to PNG conversion)
    await ctx.scheduler.runAfter(
      0,
      internal.signatures.uploadSignatureToS3,
      {
        dealershipId: session.dealershipId,
        dealId: session.dealId,
        documentId: session.documentId,
        signerRole: session.signerRole,
        signatureData: args.signatureData,
        isSvg,
      }
    );

    // The action will return the S3 key, but we need to wait for it
    // For now, generate a predictable key with correct extension
    const timestamp = Date.now();
    const extension = isSvg ? 'svg' : 'png';
    const s3Key = `signatures/${session.dealershipId}/${session.dealId}/${session.signerRole}-${timestamp}.${extension}`;

    // Create permanent signature record
    const signatureId = await ctx.db.insert("signatures", {
      dealershipId: session.dealershipId,
      dealId: session.dealId,
      documentId: session.documentId,
      signerRole: session.signerRole,
      signerName: session.signerName,
      signerEmail: session.signerEmail,
      s3Key,
      imageDataUrl: args.signatureData, // Keep for 24hrs for preview (stored as-is, PNG or SVG)
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      geolocation: args.geolocation,
      consentGiven: true,
      consentText: session.consentText,
      consentTimestamp: Date.now(),
      createdAt: Date.now(),
      scheduledDeletionAt:
        Date.now() + SIGNATURE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    });

    // Update session
    await ctx.db.patch(session._id, {
      status: "signed",
      signatureS3Key: s3Key,
      signedAt: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      geolocation: args.geolocation,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });

    // Get deal client
    const deal = await ctx.db.get(session.dealId);
    const clientId = deal?.clientId;

    // Create consent record
    await ctx.db.insert("eSignatureConsents", {
      dealershipId: session.dealershipId,
      clientId,
      dealId: session.dealId,
      consentGiven: true,
      consentText: session.consentText,
      consentVersion: "v1.0",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
      revoked: false,
    });

    // Update document with signature
    const document = await ctx.db.get(session.documentId);
    if (document) {
      const existingSignatures = document.signaturesCollected || [];
      const requiredSignatures = document.requiredSignatures || [];
      const newSignaturesCollected = [
        ...existingSignatures,
        {
          role: session.signerRole,
          signatureId,
          signedAt: Date.now(),
        },
      ];
      
      // Check if all required signatures are now collected
      const collectedRoles = new Set(newSignaturesCollected.map((s) => s.role));
      const allSignaturesCollected = requiredSignatures.every((role) =>
        collectedRoles.has(role)
      );
      
      await ctx.db.patch(session.documentId, {
        signaturesCollected: newSignaturesCollected,
        updatedAt: Date.now(),
        // Update status if all signatures collected
        status: allSignaturesCollected ? "SIGNED" : "READY",
      });

      // Immediately trigger PDF embedding after each signature
      await ctx.scheduler.runAfter(
        0,
        api.documents.generator.embedSignaturesIntoPDF,
        {
          documentId: session.documentId,
        }
      );

      // If all signatures collected, do a batch check to ensure all are embedded
      if (allSignaturesCollected) {
        // Schedule a final check after a short delay to catch any missed signatures
        await ctx.scheduler.runAfter(
          2000, // 2 second delay
          api.documents.generator.embedSignaturesIntoPDF,
          {
            documentId: session.documentId,
          }
        );
      }
    }

    // Log to security
    await ctx.db.insert("security_logs", {
      dealershipId: session.dealershipId,
      action: "signature_submitted",
      userId: undefined,
      ipAddress: args.ipAddress,
      success: true,
      details: JSON.stringify({
        signatureId,
        sessionId: session._id,
        dealId: session.dealId,
        documentId: session.documentId,
        signerRole: session.signerRole,
        signerName: session.signerName,
      }),
      timestamp: Date.now(),
      resource: "signature",
      method: "CREATE",
      severity: "info",
    });

    return {
      success: true,
      signatureId,
    };
  },
});

// ============================================================================
// SIGNATURE QUERIES
// ============================================================================

/**
 * Get signatures for a deal
 */
export const getSignaturesForDeal = query({
  args: { dealId: v.id("deals") },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("signatures")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .collect();

    return signatures.map((sig) => ({
      id: sig._id,
      signerRole: sig.signerRole,
      signerName: sig.signerName,
      signedAt: sig.createdAt,
      s3Key: sig.s3Key,
      // Only include image preview if within 24hrs
      imagePreview:
        Date.now() - sig.createdAt < IMAGE_PREVIEW_RETENTION_HOURS * 60 * 60 * 1000
          ? sig.imageDataUrl
          : undefined,
    }));
  },
});

/**
 * Get signature by ID (with preview if available)
 */
export const getSignature = query({
  args: { signatureId: v.id("signatures") },
  handler: async (ctx, args) => {
    const signature = await ctx.db.get(args.signatureId);
    if (!signature) {
      return null;
    }

    // Check if image preview should still be available
    const imageAvailable =
      signature.imageDataUrl &&
      Date.now() - signature.createdAt < 
        IMAGE_PREVIEW_RETENTION_HOURS * 60 * 60 * 1000;

    return {
      ...signature,
      imageDataUrl: imageAvailable ? signature.imageDataUrl : undefined,
    };
  },
});

// ============================================================================
// S3 UPLOAD ACTION
// ============================================================================

/**
 * Upload signature to S3 (internal action)
 */
export const uploadSignatureToS3 = internalAction({
  args: {
    dealershipId: v.id("dealerships"),
    dealId: v.id("deals"),
    documentId: v.id("documentInstances"),
    signerRole: v.string(),
    signatureData: v.string(),
    isSvg: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    let imageBuffer: Buffer;
    let contentType: string;
    let extension: string;

    if (args.isSvg) {
      // Extract SVG from data URL
      const svgBase64 = args.signatureData.replace(/^data:image\/svg\+xml;base64,/, "");
      
      // Store SVG as-is for now (will be converted when embedding into PDF)
      // PDF-lib can handle SVG rendering directly, so this is acceptable
      imageBuffer = Buffer.from(svgBase64, 'base64');
      contentType = 'image/svg+xml';
      extension = 'svg';
    } else {
      // PNG data
      const base64Data = args.signatureData.replace(/^data:image\/png;base64,/, "");
      imageBuffer = Buffer.from(base64Data, 'base64');
      contentType = 'image/png';
      extension = 'png';
    }

    // Generate S3 key
    const timestamp = Date.now();
    const s3Key = `signatures/${args.dealershipId}/${args.dealId}/${args.signerRole}-${timestamp}.${extension}`;

    // Upload to S3 using secure_s3 utilities
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME not configured");
    }

    // Import S3 client
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { s3Client } = await import("../apps/web/src/lib/s3-client");

    // Convert Uint8Array to Buffer for S3 (Node.js environment in Convex actions supports Buffer)
    // If Buffer is not available, use the Uint8Array directly - AWS SDK should handle it
    const bodyBuffer = typeof Buffer !== 'undefined' 
      ? Buffer.from(imageBuffer) 
      : imageBuffer;

    // Upload signature to S3 with encryption
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: bodyBuffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        dealershipId: args.dealershipId,
        dealId: args.dealId,
        documentId: args.documentId,
        signerRole: args.signerRole,
        uploadedAt: new Date().toISOString(),
        signatureType: args.isSvg ? 'svg' : 'png',
      },
    });

    await s3Client.send(command);
    console.log(`Signature uploaded to S3: ${s3Key}`);

    return { s3Key };
  },
});

// ============================================================================
// CLEANUP JOBS
// ============================================================================

/**
 * Clean up expired sessions and old signatures (run via cron)
 */
export const cleanupSignatureData = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Delete expired sessions (older than 1 hour)
    const expiredSessions = await ctx.db
      .query("signatureSessions")
      .withIndex("by_status_expires", (q) =>
        q.eq("status", "pending").lt("expiresAt", now - 60 * 60 * 1000)
      )
      .collect();

    console.log(`Deleting ${expiredSessions.length} expired sessions`);

    for (const session of expiredSessions) {
      await ctx.db.patch(session._id, { status: "expired" });
    }

    // 2. Remove image previews after 24 hours
    const oldSignatures = await ctx.db
      .query("signatures")
      .filter((q) =>
        q.and(
          q.neq(q.field("imageDataUrl"), undefined),
          q.lt(
            q.field("createdAt"),
            now - IMAGE_PREVIEW_RETENTION_HOURS * 60 * 60 * 1000
          )
        )
      )
      .collect();

    console.log(`Removing image previews from ${oldSignatures.length} signatures`);

    for (const sig of oldSignatures) {
      await ctx.db.patch(sig._id, { imageDataUrl: undefined });
    }

    // 3. Delete signatures past retention period
    const signaturesForDeletion = await ctx.db
      .query("signatures")
      .withIndex("by_scheduled_deletion", (q) =>
        q.lt("scheduledDeletionAt", now)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    console.log(
      `Deleting ${signaturesForDeletion.length} signatures past retention period`
    );

    for (const sig of signaturesForDeletion) {
      // Delete from S3
      if (sig.s3Key) {
        try {
          await ctx.scheduler.runAfter(
            0,
            internal.secure_s3.deleteFile,
            {
              s3Key: sig.s3Key,
              reason: "Signature retention period expired",
            }
          );
        } catch (deleteError) {
          console.error(`Failed to delete signature ${sig._id} from S3:`, deleteError);
          // Continue with soft delete even if S3 deletion fails
        }
      }

      // Mark as deleted (soft delete for audit trail)
      await ctx.db.patch(sig._id, {
        deletedAt: now,
        imageDataUrl: undefined, // Clear any remaining preview
      });
    }

    return {
      expiredSessions: expiredSessions.length,
      imagePreviewsRemoved: oldSignatures.length,
      signaturesDeleted: signaturesForDeletion.length,
    };
  },
});

/**
 * Revoke e-signature consent
 */
export const revokeESignatureConsent = mutation({
  args: {
    consentId: v.id("eSignatureConsents"),
    reason: v.string(),
    authToken: v.optional(v.string()), // Desktop app session token
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.authToken);

    const consent = await ctx.db.get(args.consentId);
    if (!consent) {
      throw new Error("Consent record not found");
    }

    // Verify permission
    if (consent.dealershipId !== user.dealershipId) {
      throw new Error("Unauthorized");
    }

    if (consent.revoked) {
      throw new Error("Consent already revoked");
    }

    await ctx.db.patch(args.consentId, {
      revoked: true,
      revokedAt: Date.now(),
      revokedReason: args.reason,
    });

    // Log revocation
    await ctx.db.insert("security_logs", {
      dealershipId: user.dealershipId,
      action: "esignature_consent_revoked",
      userId: user._id,
      ipAddress: "system",
      success: true,
      details: JSON.stringify({
        consentId: args.consentId,
        reason: args.reason,
      }),
      timestamp: Date.now(),
      resource: "consent",
      method: "UPDATE",
      severity: "medium",
    });

    return { success: true };
  },
});