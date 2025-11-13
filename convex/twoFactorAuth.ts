/**
 * Two-Factor Authentication (2FA) Functions
 * TOTP-based 2FA compatible with Google Authenticator, Authy, etc.
 */

import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  generateTOTPSecret,
  generateTOTPCode,
  validateTOTPCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  generateOTPAuthURI,
  generateQRCodeDataURL,
  isValidTOTPSecret,
  isValidTOTPCode,
  isValidBackupCode,
  getTOTPRemainingTime,
} from "./lib/2fa/totp";

/**
 * Initiate 2FA setup for a user
 * Generates a secret and QR code for the user to scan
 */
export const setupTwoFactor = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const user = await ctx.runQuery(internal.twoFactorAuth.getUser, {
      userId: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if 2FA is already set up
    const existing2FA = await ctx.runQuery(internal.twoFactorAuth.get2FAConfig, {
      userId: args.userId,
    });

    if (existing2FA && existing2FA.enabled) {
      throw new Error("2FA is already enabled. Please disable it first to set up a new device.");
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();

    // Generate OTPAuth URI for QR code
    const otpAuthURI = generateOTPAuthURI(
      secret,
      user.email,
      "Dealer Applications"
    );

    // Generate QR code data URL
    const qrCodeDataURL = generateQRCodeDataURL(otpAuthURI);

    // Store the secret (but not enabled yet)
    await ctx.runMutation(internal.twoFactorAuth.store2FASecret, {
      userId: args.userId,
      secret,
      enabled: false,
      verified: false,
    });

    // Log setup initiation
    await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
      userId: args.userId,
      action: "setup_initiated",
      success: true,
    });

    return {
      secret,
      qrCodeDataURL,
      otpAuthURI,
      remainingTime: getTOTPRemainingTime(),
    };
  },
});

/**
 * Enable 2FA by verifying the first TOTP code
 * Also generates backup codes
 */
export const enableTwoFactor = action({
  args: {
    userId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate code format
    if (!isValidTOTPCode(args.code)) {
      throw new Error("Invalid code format. Please enter a 6-digit code.");
    }

    // Get 2FA config
    const config = await ctx.runQuery(internal.twoFactorAuth.get2FAConfig, {
      userId: args.userId,
    });

    if (!config) {
      throw new Error("2FA setup not initiated. Please start setup first.");
    }

    if (config.enabled) {
      throw new Error("2FA is already enabled.");
    }

    // Validate the code
    const isValid = await validateTOTPCode(args.code, config.secret);

    if (!isValid) {
      // Log failed verification
      await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
        userId: args.userId,
        action: "verify_failed",
        method: "totp",
        success: false,
        details: "Invalid code during 2FA setup",
      });

      throw new Error("Invalid verification code. Please try again.");
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );

    // Store backup codes
    await ctx.runMutation(internal.twoFactorAuth.storeBackupCodes, {
      userId: args.userId,
      codeHashes: hashedCodes,
    });

    // Enable 2FA
    await ctx.runMutation(internal.twoFactorAuth.enable2FA, {
      userId: args.userId,
    });

    // Log successful setup and enablement
    await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
      userId: args.userId,
      action: "setup_completed",
      method: "totp",
      success: true,
    });

    await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
      userId: args.userId,
      action: "enabled",
      success: true,
    });

    return {
      success: true,
      backupCodes, // Return plaintext codes only this once
      message: "2FA has been enabled successfully. Please save your backup codes in a secure location.",
    };
  },
});

/**
 * Disable 2FA for a user
 * Requires verification code or backup code
 */
export const disableTwoFactor = action({
  args: {
    userId: v.id("users"),
    code: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get 2FA config
    const config = await ctx.runQuery(internal.twoFactorAuth.get2FAConfig, {
      userId: args.userId,
    });

    if (!config || !config.enabled) {
      throw new Error("2FA is not enabled for this user.");
    }

    let verified = false;
    let method: "totp" | "backup_code" = "totp";

    // Try TOTP code first
    if (isValidTOTPCode(args.code)) {
      verified = await validateTOTPCode(args.code, config.secret);
      method = "totp";
    }
    // Try backup code
    else if (isValidBackupCode(args.code)) {
      const backupCodeResult = await ctx.runAction(
        internal.twoFactorAuth.verifyAndUseBackupCode,
        {
          userId: args.userId,
          code: args.code,
        }
      );
      verified = backupCodeResult.valid;
      method = "backup_code";
    }

    if (!verified) {
      // Log failed verification
      await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
        userId: args.userId,
        action: "verify_failed",
        method,
        success: false,
        details: "Invalid code when attempting to disable 2FA",
      });

      throw new Error("Invalid verification code. Please try again.");
    }

    // Disable 2FA
    await ctx.runMutation(internal.twoFactorAuth.disable2FA, {
      userId: args.userId,
    });

    // Log 2FA disabled
    await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
      userId: args.userId,
      action: "disabled",
      success: true,
      details: args.reason,
    });

    return {
      success: true,
      message: "2FA has been disabled successfully.",
    };
  },
});

/**
 * Verify a 2FA code during login
 */
export const verifyTwoFactorCode = action({
  args: {
    userId: v.id("users"),
    code: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get 2FA config
    const config = await ctx.runQuery(internal.twoFactorAuth.get2FAConfig, {
      userId: args.userId,
    });

    if (!config || !config.enabled) {
      throw new Error("2FA is not enabled for this user.");
    }

    let verified = false;
    let method: "totp" | "backup_code" = "totp";
    let backupCodeUsed = false;

    // Try TOTP code first
    if (isValidTOTPCode(args.code)) {
      verified = await validateTOTPCode(args.code, config.secret);
      method = "totp";
    }
    // Try backup code
    else if (isValidBackupCode(args.code)) {
      const backupCodeResult = await ctx.runAction(
        internal.twoFactorAuth.verifyAndUseBackupCode,
        {
          userId: args.userId,
          code: args.code,
          ipAddress: args.ipAddress,
        }
      );
      verified = backupCodeResult.valid;
      method = "backup_code";
      backupCodeUsed = backupCodeResult.used;

      if (backupCodeUsed) {
        // Log backup code usage
        await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
          userId: args.userId,
          action: "backup_code_used",
          method: "backup_code",
          success: true,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
        });
      }
    }

    // Log verification attempt
    await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
      userId: args.userId,
      action: verified ? "verify_success" : "verify_failed",
      method,
      success: verified,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    if (verified) {
      // Update last used timestamp
      await ctx.runMutation(internal.twoFactorAuth.update2FALastUsed, {
        userId: args.userId,
      });
    }

    return {
      verified,
      method,
      backupCodeUsed,
      backupCodesRemaining: backupCodeUsed
        ? await ctx.runQuery(internal.twoFactorAuth.getBackupCodesRemaining, {
            userId: args.userId,
          })
        : undefined,
    };
  },
});

/**
 * Get 2FA status for a user
 */
export const getTwoFactorStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!config) {
      return {
        enabled: false,
        verified: false,
        setupInitiated: false,
      };
    }

    const backupCodesRemaining = await ctx.db
      .query("user_2fa_backup_codes")
      .withIndex("by_user_unused", (q) =>
        q.eq("userId", args.userId).eq("used", false)
      )
      .collect();

    return {
      enabled: config.enabled,
      verified: config.verified,
      setupInitiated: true,
      backupCodesRemaining: backupCodesRemaining.length,
      lastUsedAt: config.lastUsedAt,
      enabledAt: config.enabledAt,
    };
  },
});

/**
 * Regenerate backup codes
 * Requires verification of current 2FA
 */
export const regenerateBackupCodes = action({
  args: {
    userId: v.id("users"),
    currentCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify current code first
    const verificationResult = await ctx.runAction(
      internal.twoFactorAuth.verifyTwoFactorCode,
      {
        userId: args.userId,
        code: args.currentCode,
      }
    );

    if (!verificationResult.verified) {
      throw new Error("Invalid verification code. Please try again.");
    }

    // Delete old backup codes
    await ctx.runMutation(internal.twoFactorAuth.deleteBackupCodes, {
      userId: args.userId,
    });

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );

    // Store new backup codes
    await ctx.runMutation(internal.twoFactorAuth.storeBackupCodes, {
      userId: args.userId,
      codeHashes: hashedCodes,
    });

    // Update remaining count
    await ctx.runMutation(internal.twoFactorAuth.updateBackupCodesCount, {
      userId: args.userId,
      count: backupCodes.length,
    });

    // Log regeneration
    await ctx.runMutation(internal.twoFactorAuth.log2FAAction, {
      userId: args.userId,
      action: "backup_codes_regenerated",
      success: true,
    });

    return {
      success: true,
      backupCodes,
      message: "New backup codes have been generated. Please save them in a secure location.",
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS AND QUERIES
// ============================================================================

export const getUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const get2FAConfig = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const store2FASecret = internalMutation({
  args: {
    userId: v.id("users"),
    secret: v.string(),
    enabled: v.boolean(),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        secret: args.secret,
        enabled: args.enabled,
        verified: args.verified,
        setupInitiatedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("user_2fa", {
        userId: args.userId,
        secret: args.secret,
        enabled: args.enabled,
        verified: args.verified,
        backupCodesRemaining: 0,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        setupInitiatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const enable2FA = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!config) {
      throw new Error("2FA configuration not found");
    }

    const now = Date.now();

    await ctx.db.patch(config._id, {
      enabled: true,
      verified: true,
      enabledAt: now,
      updatedAt: now,
    });
  },
});

export const disable2FA = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!config) {
      throw new Error("2FA configuration not found");
    }

    // Delete the 2FA config
    await ctx.db.delete(config._id);

    // Delete all backup codes
    const backupCodes = await ctx.db
      .query("user_2fa_backup_codes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const code of backupCodes) {
      await ctx.db.delete(code._id);
    }
  },
});

export const update2FALastUsed = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!config) {
      return;
    }

    await ctx.db.patch(config._id, {
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const storeBackupCodes = internalMutation({
  args: {
    userId: v.id("users"),
    codeHashes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const codeHash of args.codeHashes) {
      await ctx.db.insert("user_2fa_backup_codes", {
        userId: args.userId,
        codeHash,
        used: false,
        createdAt: now,
      });
    }

    // Update backup codes count in config
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        backupCodesRemaining: args.codeHashes.length,
        updatedAt: now,
      });
    }
  },
});

export const deleteBackupCodes = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const codes = await ctx.db
      .query("user_2fa_backup_codes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const code of codes) {
      await ctx.db.delete(code._id);
    }
  },
});

export const updateBackupCodesCount = internalMutation({
  args: {
    userId: v.id("users"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        backupCodesRemaining: args.count,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getBackupCodesRemaining = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const codes = await ctx.db
      .query("user_2fa_backup_codes")
      .withIndex("by_user_unused", (q) =>
        q.eq("userId", args.userId).eq("used", false)
      )
      .collect();

    return codes.length;
  },
});

export const verifyAndUseBackupCode = action({
  args: {
    userId: v.id("users"),
    code: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all unused backup codes
    const backupCodes = await ctx.runQuery(
      internal.twoFactorAuth.getUnusedBackupCodes,
      {
        userId: args.userId,
      }
    );

    // Check each backup code
    for (const storedCode of backupCodes) {
      const isValid = await verifyBackupCode(args.code, storedCode.codeHash);

      if (isValid) {
        // Mark code as used
        await ctx.runMutation(internal.twoFactorAuth.markBackupCodeUsed, {
          codeId: storedCode._id,
          ipAddress: args.ipAddress,
        });

        // Update remaining count in config
        const remaining = await ctx.runQuery(
          internal.twoFactorAuth.getBackupCodesRemaining,
          {
            userId: args.userId,
          }
        );

        await ctx.runMutation(internal.twoFactorAuth.updateBackupCodesCount, {
          userId: args.userId,
          count: remaining,
        });

        // Update last backup code used timestamp
        await ctx.runMutation(internal.twoFactorAuth.updateLastBackupCodeUsed, {
          userId: args.userId,
        });

        return {
          valid: true,
          used: true,
        };
      }
    }

    return {
      valid: false,
      used: false,
    };
  },
});

export const getUnusedBackupCodes = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_2fa_backup_codes")
      .withIndex("by_user_unused", (q) =>
        q.eq("userId", args.userId).eq("used", false)
      )
      .collect();
  },
});

export const markBackupCodeUsed = internalMutation({
  args: {
    codeId: v.id("user_2fa_backup_codes"),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.codeId, {
      used: true,
      usedAt: Date.now(),
      usedFrom: args.ipAddress,
    });
  },
});

export const updateLastBackupCodeUsed = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        lastBackupCodeUsedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const log2FAAction = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.union(
      v.literal("setup_initiated"),
      v.literal("setup_completed"),
      v.literal("enabled"),
      v.literal("disabled"),
      v.literal("verify_success"),
      v.literal("verify_failed"),
      v.literal("backup_code_used"),
      v.literal("backup_codes_regenerated")
    ),
    method: v.optional(v.union(v.literal("totp"), v.literal("backup_code"))),
    success: v.boolean(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("user_2fa_log", {
      userId: args.userId,
      action: args.action,
      method: args.method,
      success: args.success,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get 2FA usage logs for a user
 * Useful for security auditing
 */
export const getTwoFactorLogs = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100);

    const logs = await ctx.db
      .query("user_2fa_log")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Check if 2FA is required for a user (for login flow)
 */
export const isTwoFactorRequired = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("user_2fa")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return {
      required: config ? config.enabled && config.verified : false,
    };
  },
});
