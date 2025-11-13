/**
 * Standalone Authentication System
 * Email/password authentication for standalone desktop app users
 * Replaces Clerk for offline-first operation
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import bcrypt from "bcryptjs";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "./lib/auth/emailHelpers";

/**
 * Hash password using bcrypt with 12 rounds (industry standard for security)
 * Protects against rainbow table and brute force attacks
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against bcrypt hash
 * Returns true if password matches the hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Legacy SHA-256 password hashing for migration
 * Used to detect and upgrade old password hashes
 */
async function hashPasswordSHA256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if a hash is using the old SHA-256 format
 * SHA-256 hashes are 64 characters hex, bcrypt hashes start with $2a$ or $2b$
 */
function isLegacySHA256Hash(hash: string): boolean {
  return hash.length === 64 && !/^\$2[ab]\$/.test(hash);
}

/**
 * Register a new standalone user
 */
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("Email already registered");
    }

    // Validate password strength
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Hash password
    const passwordHash = await hashPassword(args.password);

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Create user (subscription required to use the app)
    const now = Date.now();

    const userId = await ctx.db.insert("standalone_users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      businessName: args.businessName,
      emailVerified: false,
      verificationToken,
      subscriptionStatus: "none",
      createdAt: now,
      updatedAt: now,
    });

    // Send verification email
    try {
      await sendVerificationEmail({
        email: args.email.toLowerCase(),
        name: args.name,
        verificationToken,
      });
      console.log(`✅ Verification email sent to ${args.email}`);
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${args.email}:`, error);
      // Don't fail registration if email fails - user can request another verification email
    }

    return {
      success: true,
      userId,
      message: "Account created successfully. Check your email to verify your account.",
    };
  },
});

/**
 * Check if email exists as a standalone user
 */
export const checkIsStandaloneUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return {
      isStandaloneUser: !!user,
      exists: !!user,
    };
  },
});

/**
 * Check if email exists as a dealership user
 */
export const checkIsDealershipUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return {
      isDealershipUser: !!user,
      exists: !!user,
      hasDealership: !!user?.dealershipId,
    };
  },
});

/**
 * Login with email and password
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find user
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Incorrect email");
    }

    // Verify password (support both bcrypt and legacy SHA-256 for migration)
    let isValid = false;
    let needsMigration = false;

    if (isLegacySHA256Hash(user.passwordHash)) {
      // Legacy SHA-256 hash - verify using old method
      const sha256Hash = await hashPasswordSHA256(args.password);
      isValid = sha256Hash === user.passwordHash;
      needsMigration = isValid; // If valid, we need to upgrade to bcrypt
    } else {
      // Modern bcrypt hash
      isValid = await verifyPassword(args.password, user.passwordHash);
    }

    if (!isValid) {
      throw new Error("Incorrect password");
    }

    // Migrate password to bcrypt if using legacy SHA-256
    if (needsMigration) {
      const newHash = await hashPassword(args.password);
      await ctx.db.patch(user._id, {
        passwordHash: newHash,
        updatedAt: now,
      });
      console.log(`✅ Migrated password hash for user ${user.email} from SHA-256 to bcrypt`);
    }

    // Check subscription status
    let subscriptionValid = false;

    if (user.subscriptionStatus === "active") {
      subscriptionValid = true;
    }

    if (!subscriptionValid) {
      throw new Error("Active subscription required. Please subscribe to continue.");
    }

    // Update last login
    await ctx.db.patch(user._id, {
      lastLoginAt: now,
      updatedAt: now,
    });

    // Generate session token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let sessionToken = '';
    for (let i = 0; i < 64; i++) {
      sessionToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create session record
    const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiresAt = now + SESSION_EXPIRY_MS;

    await ctx.db.insert("standalone_sessions", {
      userId: user._id,
      token: sessionToken,
      licenseKey: user.licenseKey || "",
      machineId: args.machineId,
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
      userAgent: undefined,
      ipAddress: undefined,
    });

    return {
      success: true,
      sessionToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        subscriptionStatus: user.subscriptionStatus,
        licenseKey: user.licenseKey,
      },
    };
  },
});

/**
 * Verify email with token
 */
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_verification_token", (q) => q.eq("verificationToken", args.token))
      .first();

    if (!user) {
      throw new Error("Invalid verification token");
    }

    await ctx.db.patch(user._id, {
      emailVerified: true,
      verificationToken: undefined,
      updatedAt: Date.now(),
    });

    // Send welcome email after successful verification
    try {
      await sendWelcomeEmail({
        email: user.email,
        name: user.name,
        businessName: user.businessName,
      });
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${user.email}:`, error);
      // Don't fail verification if welcome email fails
    }

    return { success: true, message: "Email verified successfully" };
  },
});

/**
 * Request password reset
 */
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: "If the email exists, a reset link has been sent." };
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetTokenExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    await ctx.db.patch(user._id, {
      resetToken,
      resetTokenExpiresAt,
      updatedAt: Date.now(),
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetToken,
      });
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${user.email}:`, error);
      // Don't fail the request if email fails - user can try again
    }

    return { success: true, message: "If the email exists, a reset link has been sent." };
  },
});

/**
 * Reset password with token
 */
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_reset_token", (q) => q.eq("resetToken", args.token))
      .first();

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Check if token expired
    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < Date.now()) {
      throw new Error("Reset token has expired");
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Hash new password
    const passwordHash = await hashPassword(args.newPassword);

    // Update password and clear reset token
    await ctx.db.patch(user._id, {
      passwordHash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Password reset successfully" };
  },
});

/**
 * Get current user info
 */
export const getCurrentUser = query({
  args: {
    userId: v.id("standalone_users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    // Get subscription details if exists
    let subscription = null;
    if (user.subscriptionId) {
      subscription = await ctx.db.get(user.subscriptionId);
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      businessName: user.businessName,
      emailVerified: user.emailVerified,
      subscriptionStatus: user.subscriptionStatus,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("standalone_users"),
    name: v.optional(v.string()),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: {
      updatedAt: number;
      name?: string;
      businessName?: string | undefined;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name) updates.name = args.name;
    if (args.businessName !== undefined) updates.businessName = args.businessName;

    await ctx.db.patch(args.userId, updates);

    return { success: true, message: "Profile updated successfully" };
  },
});

/**
 * Complete account setup after checkout
 * Sets password and name for users created from checkout
 */
export const completeAccountSetup = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found. Please contact support.");
    }

    // Check if password is already set
    if (user.passwordHash && user.passwordHash.length > 0) {
      throw new Error("Account setup already completed. Please log in.");
    }

    // Validate password
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Hash password
    const passwordHash = await hashPassword(args.password);

    // Update user
    await ctx.db.patch(user._id, {
      passwordHash,
      name: args.name,
      businessName: args.businessName,
      emailVerified: true, // Auto-verify since they paid
      updatedAt: Date.now(),
    });

    // Generate session token for immediate login
    const sessionToken = crypto.randomUUID();

    return {
      success: true,
      sessionToken,
      user: {
        id: user._id,
        email: user.email,
        name: args.name,
        businessName: args.businessName,
        subscriptionStatus: user.subscriptionStatus,
        licenseKey: user.licenseKey, // Include license key for auto-activation
      },
      message: "Account setup completed successfully",
    };
  },
});

/**
 * Change password
 */
export const changePassword = mutation({
  args: {
    userId: v.id("standalone_users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = await verifyPassword(args.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    // Hash new password
    const passwordHash = await hashPassword(args.newPassword);

    await ctx.db.patch(user._id, {
      passwordHash,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Password changed successfully" };
  },
});

/**
 * Validate standalone session token
 * Similar to desktop auth session validation
 */
export const validateStandaloneSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("standalone_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      console.log("❌ No standalone session found for token");
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now > session.expiresAt) {
      console.log("❌ Standalone session expired");
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      console.log("❌ Standalone user not found");
      return null;
    }

    // Note: We can't update lastAccessedAt in a query (read-only)
    // This would need to be done in a separate mutation if needed

    console.log(`✅ Standalone session validated for user ${user._id}`);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        subscriptionStatus: user.subscriptionStatus,
        licenseKey: user.licenseKey,
      },
      session: {
        token: session.token,
        licenseKey: session.licenseKey,
        machineId: session.machineId,
        expiresAt: session.expiresAt,
      },
    };
  },
});

/**
 * Check if user has a license key
 * Returns true if user has a license key assigned
 */
export const checkUserHasLicense = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.email) {
      return { hasLicense: false, licenseKey: null };
    }

    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email?.toLowerCase() ?? ""))
      .first();

    if (!user) {
      return { hasLicense: false, licenseKey: null };
    }

    const hasLicense = !!user.licenseKey && user.licenseKey.length > 0;
    return {
      hasLicense,
      licenseKey: user.licenseKey || null,
    };
  },
});

/**
 * Check if user needs account setup
 * Returns user info if they have a subscription but no password set
 */
export const checkAccountSetupNeeded = query({
  args: {
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user: Awaited<ReturnType<typeof ctx.db.get<"standalone_users">>> | null = null;
    
    console.log("🔍 Checking account setup needed for email:", args.email);
    
    if (args.email) {
      // Query by email if provided
      user = await ctx.db
        .query("standalone_users")
        .withIndex("by_email", (q) => q.eq("email", args.email?.toLowerCase() ?? ""))
        .first();
      
      console.log("🔍 Found user by email:", user ? {
        id: user._id,
        email: user.email,
        hasSubscriptionId: !!user.subscriptionId,
        subscriptionStatus: user.subscriptionStatus,
        hasPassword: !!user.passwordHash && user.passwordHash.length > 0,
      } : "No user found");
    } else {
      // Find most recent user that needs setup (created in last 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const allUsers = await ctx.db
        .query("standalone_users")
        .collect();
      
      // Filter for users that need setup and were created recently
      user = allUsers
        .filter(u => {
          const hasSubscription = u.subscriptionId && 
            (u.subscriptionStatus === "active" || u.subscriptionStatus === "none");
          const hasNoPassword = !u.passwordHash || u.passwordHash.length === 0;
          const isRecent = u.createdAt > tenMinutesAgo;
          return hasSubscription && hasNoPassword && isRecent;
        })
        .sort((a, b) => b.createdAt - a.createdAt)[0]; // Most recent first
    }

    if (!user) {
      console.log("🔍 No user found needing setup");
      return { needsSetup: false, user: null };
    }

    // Check if user has subscription but no password (needs setup)
    const hasSubscription = user.subscriptionId && 
      (user.subscriptionStatus === "active" || user.subscriptionStatus === "none");
    const hasNoPassword = !user.passwordHash || user.passwordHash.length === 0;
    
    console.log("🔍 Account setup check:", {
      userId: user._id,
      hasSubscription,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      hasNoPassword,
      passwordHashLength: user.passwordHash?.length || 0,
    });

    if (hasSubscription && hasNoPassword) {
      // Get subscription details
      let subscription = null;
      if (user.subscriptionId) {
        subscription = await ctx.db.get(user.subscriptionId);
      }

      return {
        needsSetup: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          subscriptionStatus: user.subscriptionStatus,
          subscription: subscription
            ? {
                status: subscription.status,
                planName: subscription.planName,
              }
            : null,
        },
      };
    }

    return { needsSetup: false, user: null };
  },
});

/**
 * Check if subscription is valid
 */
export const checkSubscription = query({
  args: {
    userId: v.id("standalone_users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return { valid: false, reason: "user_not_found" };
    }

    // Check active subscription
    if (user.subscriptionStatus === "active") {
      if (user.subscriptionId) {
        const subscription = await ctx.db.get(user.subscriptionId);
        if (subscription && subscription.status === "active") {
          return {
            valid: true,
            status: "active",
            currentPeriodEnd: subscription.currentPeriodEnd,
          };
        }
      }
    }

    return { valid: false, reason: "subscription_inactive" };
  },
});

/**
 * Watch subscription status by email (websocket-based, reactive)
 * Automatically updates when subscription status changes
 */
export const watchSubscriptionStatusByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return {
        found: false,
        hasSubscription: false,
        subscriptionStatus: null,
        hasPassword: false,
        userId: null,
        licenseKey: null,
      };
    }

    // Get subscription details if exists
    let subscription = null;
    if (user.subscriptionId) {
      subscription = await ctx.db.get(user.subscriptionId);
    }

    return {
      found: true,
      hasSubscription: !!user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionActive: user.subscriptionStatus === "active" && subscription?.status === "active",
      hasPassword: !!(user.passwordHash && user.passwordHash.length > 0),
      userId: user._id,
      licenseKey: user.licenseKey || null,
      email: user.email,
      name: user.name,
    };
  },
});
