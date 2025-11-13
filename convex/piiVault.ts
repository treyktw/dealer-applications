/**
 * PII Vault - Convex Functions
 * Secure storage and retrieval of Personally Identifiable Information
 *
 * All PII data is encrypted using AES-256-GCM before storage
 * Every access is logged for audit compliance (HIPAA, GDPR, etc.)
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./lib/helpers/auth_helpers";
import {
  encryptPII,
  decryptPII,
  maskPII,
  validatePIIFormat,
  generatePIIVaultId,
  isPIIExpired,
  calculatePIIExpiration,
  type PIIType,
  type EncryptedPII,
} from "./lib/pii/encryption";
import { internal } from "./_generated/api";

/**
 * Store PII data in the vault
 * Encrypts data before storage and logs the action
 */
export const storePII = action({
  args: {
    type: v.union(
      v.literal("ssn"),
      v.literal("drivers_license"),
      v.literal("credit_card"),
      v.literal("bank_account"),
      v.literal("medical_record"),
      v.literal("passport"),
      v.literal("tax_id"),
      v.literal("custom")
    ),
    plaintext: v.string(),
    ownerId: v.string(),
    ownerType: v.union(v.literal("user"), v.literal("client"), v.literal("deal")),
    dealershipId: v.string(),
    description: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await ctx.runQuery(internal.piiVault.getCurrentUserForPII);
    if (!user) {
      throw new Error("Unauthorized: Must be logged in to store PII");
    }

    // Validate PII format
    if (!validatePIIFormat(args.plaintext, args.type)) {
      throw new Error(`Invalid ${args.type} format`);
    }

    // Encrypt the PII data
    const encrypted = await encryptPII(args.plaintext, args.type);

    // Generate unique vault ID
    const vaultId = generatePIIVaultId();

    // Calculate expiration if specified
    const expiresAt = args.expiresInDays ? calculatePIIExpiration(args.expiresInDays) : undefined;

    // Store in database
    await ctx.runMutation(internal.piiVault.createPIIRecord, {
      vaultId,
      type: args.type,
      encrypted,
      ownerId: args.ownerId,
      ownerType: args.ownerType,
      dealershipId: args.dealershipId,
      description: args.description,
      expiresAt,
      userId: user._id,
      userEmail: user.email,
      reason: args.reason,
    });

    console.log(`✅ Stored ${args.type} in PII vault: ${vaultId} for ${args.ownerType}:${args.ownerId}`);

    return {
      success: true,
      vaultId,
      masked: maskPII(args.plaintext, args.type),
    };
  },
});

/**
 * Retrieve PII data from the vault
 * Decrypts data and logs the access
 */
export const retrievePII = action({
  args: {
    vaultId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await ctx.runQuery(internal.piiVault.getCurrentUserForPII);
    if (!user) {
      throw new Error("Unauthorized: Must be logged in to retrieve PII");
    }

    // Get encrypted PII record
    const record = await ctx.runQuery(internal.piiVault.getPIIRecord, {
      vaultId: args.vaultId,
    });

    if (!record) {
      // Log failed access attempt
      await ctx.runMutation(internal.piiVault.logPIIAccess, {
        vaultId: args.vaultId,
        action: "read",
        userId: user._id,
        userEmail: user.email,
        dealershipId: user.dealershipId || "unknown",
        reason: args.reason,
        success: false,
        errorMessage: "PII record not found",
      });

      throw new Error("PII record not found");
    }

    // Check if user has access to this dealership's data
    if (user.dealershipId !== record.dealershipId) {
      await ctx.runMutation(internal.piiVault.logPIIAccess, {
        vaultId: args.vaultId,
        action: "read",
        userId: user._id,
        userEmail: user.email,
        dealershipId: user.dealershipId || "unknown",
        reason: args.reason,
        success: false,
        errorMessage: "Access denied: Different dealership",
      });

      throw new Error("Access denied: You don't have permission to access this data");
    }

    // Check if expired
    if (isPIIExpired(record.expiresAt)) {
      await ctx.runMutation(internal.piiVault.logPIIAccess, {
        vaultId: args.vaultId,
        action: "read",
        userId: user._id,
        userEmail: user.email,
        dealershipId: user.dealershipId || "unknown",
        reason: args.reason,
        success: false,
        errorMessage: "PII data has expired",
      });

      throw new Error("PII data has expired");
    }

    // Decrypt the PII data
    const encrypted: EncryptedPII = {
      encryptedData: record.encryptedData,
      iv: record.iv,
      authTag: record.authTag,
      algorithm: record.algorithm,
      version: record.version,
    };

    const plaintext = await decryptPII(encrypted, record.type as PIIType);

    // Update access tracking and log
    await ctx.runMutation(internal.piiVault.updatePIIAccess, {
      vaultId: args.vaultId,
      userId: user._id,
      userEmail: user.email,
      dealershipId: user.dealershipId || "unknown",
      reason: args.reason,
    });

    console.log(`✅ Retrieved ${record.type} from PII vault: ${args.vaultId} by user ${user.email}`);

    return {
      vaultId: record.vaultId,
      type: record.type,
      plaintext,
      masked: maskPII(plaintext, record.type as PIIType),
      ownerId: record.ownerId,
      ownerType: record.ownerType,
      description: record.description,
      expiresAt: record.expiresAt,
      accessCount: record.accessCount + 1,
    };
  },
});

/**
 * Get masked PII data (for display purposes)
 * Faster than full retrieval, doesn't decrypt
 */
export const getMaskedPII = query({
  args: {
    vaultId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const record = await ctx.db
      .query("pii_vault")
      .withIndex("by_vault_id", (q) => q.eq("vaultId", args.vaultId))
      .first();

    if (!record) {
      return null;
    }

    // Check dealership access
    if (user.dealershipId !== record.dealershipId) {
      return null;
    }

    // Check if expired
    if (isPIIExpired(record.expiresAt)) {
      return null;
    }

    return {
      vaultId: record.vaultId,
      type: record.type,
      masked: "****", // We can't mask without decrypting
      ownerId: record.ownerId,
      ownerType: record.ownerType,
      description: record.description,
      expiresAt: record.expiresAt,
      accessCount: record.accessCount,
      createdAt: record.createdAt,
    };
  },
});

/**
 * Delete PII data from the vault
 * Permanently removes encrypted data and logs the deletion
 */
export const deletePII = mutation({
  args: {
    vaultId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const record = await ctx.db
      .query("pii_vault")
      .withIndex("by_vault_id", (q) => q.eq("vaultId", args.vaultId))
      .first();

    if (!record) {
      // Log failed deletion attempt
      await ctx.db.insert("pii_access_log", {
        vaultId: args.vaultId,
        action: "delete",
        userId: user._id,
        userEmail: user.email,
        dealershipId: user.dealershipId || "unknown",
        reason: args.reason,
        success: false,
        errorMessage: "PII record not found",
        timestamp: Date.now(),
      });

      throw new Error("PII record not found");
    }

    // Check dealership access
    if (user.dealershipId !== record.dealershipId) {
      await ctx.db.insert("pii_access_log", {
        vaultId: args.vaultId,
        action: "delete",
        userId: user._id,
        userEmail: user.email,
        dealershipId: user.dealershipId || "unknown",
        reason: args.reason,
        success: false,
        errorMessage: "Access denied: Different dealership",
        timestamp: Date.now(),
      });

      throw new Error("Access denied");
    }

    // Delete the record
    await ctx.db.delete(record._id);

    // Log successful deletion
    await ctx.db.insert("pii_access_log", {
      vaultId: args.vaultId,
      action: "delete",
      userId: user._id,
      userEmail: user.email,
      dealershipId: user.dealershipId || "unknown",
      reason: args.reason,
      success: true,
      timestamp: Date.now(),
    });

    console.log(`🗑️ Deleted PII from vault: ${args.vaultId} by user ${user.email}`);

    return { success: true };
  },
});

/**
 * List PII records for an owner
 */
export const listPIIForOwner = query({
  args: {
    ownerId: v.string(),
    ownerType: v.union(v.literal("user"), v.literal("client"), v.literal("deal")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const records = await ctx.db
      .query("pii_vault")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId).eq("ownerType", args.ownerType))
      .filter((q) => q.eq(q.field("dealershipId"), user.dealershipId || ""))
      .collect();

    // Filter out expired records
    const now = Date.now();
    const activeRecords = records.filter((r) => !r.expiresAt || r.expiresAt > now);

    return activeRecords.map((r) => ({
      vaultId: r.vaultId,
      type: r.type,
      description: r.description,
      expiresAt: r.expiresAt,
      accessCount: r.accessCount,
      createdAt: r.createdAt,
      lastAccessedAt: r.lastAccessedAt,
    }));
  },
});

/**
 * Get PII access logs for audit
 */
export const getPIIAccessLogs = query({
  args: {
    vaultId: v.optional(v.string()),
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const limit = Math.min(args.limit || 50, 100);

    let logs;
    if (args.vaultId) {
      logs = await ctx.db
        .query("pii_access_log")
        .withIndex("by_vault_id", (q) => q.eq("vaultId", args.vaultId))
        .filter((q) => q.eq(q.field("dealershipId"), user.dealershipId || ""))
        .order("desc")
        .take(limit);
    } else if (args.userId) {
      logs = await ctx.db
        .query("pii_access_log")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("dealershipId"), user.dealershipId || ""))
        .order("desc")
        .take(limit);
    } else {
      logs = await ctx.db
        .query("pii_access_log")
        .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId || ""))
        .order("desc")
        .take(limit);
    }

    return logs;
  },
});

/**
 * Clean up expired PII records
 * Should be called periodically (e.g., daily cron job)
 */
export const cleanupExpiredPII = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("pii_vault")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deletedCount = 0;
    for (const record of expired) {
      await ctx.db.delete(record._id);
      deletedCount++;

      // Log automatic deletion
      await ctx.db.insert("pii_access_log", {
        vaultId: record.vaultId,
        action: "delete",
        userId: "system",
        dealershipId: record.dealershipId,
        reason: "Automatic cleanup - data expired",
        success: true,
        timestamp: now,
      });
    }

    console.log(`🗑️ Cleaned up ${deletedCount} expired PII records`);
    return { deletedCount };
  },
});

// ============================================================================
// INTERNAL FUNCTIONS
// ============================================================================

export const getCurrentUserForPII = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const createPIIRecord = internalMutation({
  args: {
    vaultId: v.string(),
    type: v.string(),
    encrypted: v.object({
      encryptedData: v.string(),
      iv: v.string(),
      authTag: v.string(),
      algorithm: v.string(),
      version: v.number(),
    }),
    ownerId: v.string(),
    ownerType: v.string(),
    dealershipId: v.string(),
    description: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    userId: v.string(),
    userEmail: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert PII record
    await ctx.db.insert("pii_vault", {
      vaultId: args.vaultId,
      type: args.type,
      encryptedData: args.encrypted.encryptedData,
      iv: args.encrypted.iv,
      authTag: args.encrypted.authTag,
      algorithm: args.encrypted.algorithm,
      version: args.encrypted.version,
      ownerId: args.ownerId,
      ownerType: args.ownerType,
      dealershipId: args.dealershipId,
      description: args.description,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    });

    // Log creation
    await ctx.db.insert("pii_access_log", {
      vaultId: args.vaultId,
      action: "create",
      userId: args.userId,
      userEmail: args.userEmail,
      dealershipId: args.dealershipId,
      reason: args.reason,
      success: true,
      timestamp: now,
    });
  },
});

export const getPIIRecord = query({
  args: {
    vaultId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pii_vault")
      .withIndex("by_vault_id", (q) => q.eq("vaultId", args.vaultId))
      .first();
  },
});

export const updatePIIAccess = internalMutation({
  args: {
    vaultId: v.string(),
    userId: v.string(),
    userEmail: v.string(),
    dealershipId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("pii_vault")
      .withIndex("by_vault_id", (q) => q.eq("vaultId", args.vaultId))
      .first();

    if (record) {
      const now = Date.now();

      // Update access tracking
      await ctx.db.patch(record._id, {
        lastAccessedAt: now,
        lastAccessedBy: args.userId,
        accessCount: record.accessCount + 1,
        updatedAt: now,
      });

      // Log access
      await ctx.db.insert("pii_access_log", {
        vaultId: args.vaultId,
        action: "read",
        userId: args.userId,
        userEmail: args.userEmail,
        dealershipId: args.dealershipId,
        reason: args.reason,
        success: true,
        timestamp: now,
      });
    }
  },
});

export const logPIIAccess = internalMutation({
  args: {
    vaultId: v.string(),
    action: v.string(),
    userId: v.string(),
    userEmail: v.string(),
    dealershipId: v.string(),
    reason: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pii_access_log", {
      vaultId: args.vaultId,
      action: args.action,
      userId: args.userId,
      userEmail: args.userEmail,
      dealershipId: args.dealershipId,
      reason: args.reason,
      success: args.success,
      errorMessage: args.errorMessage,
      timestamp: Date.now(),
    });
  },
});
