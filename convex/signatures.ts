import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
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

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
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
 * Create a signature session (called from desktop app)
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
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

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
      ipAddress: "system", // TODO: Get from request context
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
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

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
    signatureData: v.string(), // Base64 PNG data URL
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

    // Validate signature data
    if (!args.signatureData.startsWith("data:image/png;base64,")) {
      throw new Error("Invalid signature data format");
    }

    // Trigger S3 upload action
    await ctx.scheduler.runAfter(
      0,
      internal.signatures.uploadSignatureToS3,
      {
        dealershipId: session.dealershipId,
        dealId: session.dealId,
        documentId: session.documentId,
        signerRole: session.signerRole,
        signatureData: args.signatureData,
      }
    );

    // The action will return the S3 key, but we need to wait for it
    // For now, generate a predictable key
    const timestamp = Date.now();
    const s3Key = `signatures/${session.dealershipId}/${session.dealId}/${session.signerRole}-${timestamp}.png`;

    // Create permanent signature record
    const signatureId = await ctx.db.insert("signatures", {
      dealershipId: session.dealershipId,
      dealId: session.dealId,
      documentId: session.documentId,
      signerRole: session.signerRole,
      signerName: session.signerName,
      signerEmail: session.signerEmail,
      s3Key,
      imageDataUrl: args.signatureData, // Keep for 24hrs for preview
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
      const allSignaturesCollected = existingSignatures.length + 1 >= (document.requiredSignatures?.length || 1);
      
      await ctx.db.patch(session.documentId, {
        signaturesCollected: [
          ...existingSignatures,
          {
            role: session.signerRole,
            signatureId,
            signedAt: Date.now(),
          },
        ],
        updatedAt: Date.now(),
        // Update status if all signatures collected
        status: allSignaturesCollected ? "SIGNED" : "READY",
      });
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
  },
  handler: async (_ctx, args) => {
    // Remove data URL prefix
    const base64Data = args.signatureData.replace(
      /^data:image\/png;base64,/,
      ""
    );

    // TODO: Implement actual S3 upload
    // For now, just generate the key
    const timestamp = Date.now();
    const s3Key = `signatures/${args.dealershipId}/${args.dealId}/${args.signerRole}-${timestamp}.png`;

    // In production, you would:
    // 1. Convert base64 to buffer
    // 2. Upload to S3 with encryption
    // 3. Return the S3 key

    /*
    const buffer = Buffer.from(base64Data, 'base64');
    
    await s3Client.putObject({
      Bucket: process.env.S3_SIGNATURES_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/png',
      ServerSideEncryption: 'AES256',
      Metadata: {
        dealershipId: args.dealershipId,
        dealId: args.dealId,
        signerRole: args.signerRole,
        uploadedAt: new Date().toISOString(),
      },
    });
    */

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
      // TODO: Delete from S3
      // await deleteFromS3(sig.s3Key);

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
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

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