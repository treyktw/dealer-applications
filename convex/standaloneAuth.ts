/**
 * Standalone Authentication System
 * Email/password authentication for standalone desktop app users
 * Replaces Clerk for offline-first operation
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Password hashing (you'll need to add bcryptjs to dependencies)
// For now, using a simple hash - MUST upgrade to bcrypt in production
async function hashPassword(password: string): Promise<string> {
  // TODO: Replace with bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
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

    // Create user with 14-day trial
    const now = Date.now();
    const trialDays = 14;
    const trialEndsAt = now + trialDays * 24 * 60 * 60 * 1000;

    const userId = await ctx.db.insert("standalone_users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      businessName: args.businessName,
      emailVerified: false,
      verificationToken,
      subscriptionStatus: "trial",
      trialEndsAt,
      createdAt: now,
      updatedAt: now,
    });

    // TODO: Send verification email
    console.log(`Verification token for ${args.email}: ${verificationToken}`);

    return {
      success: true,
      userId,
      trialEndsAt,
      message: "Account created successfully. Check your email to verify your account.",
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
    // Find user
    const user = await ctx.db
      .query("standalone_users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await verifyPassword(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Check subscription status
    const now = Date.now();
    let subscriptionValid = false;

    if (user.subscriptionStatus === "trial") {
      subscriptionValid = !user.trialEndsAt || user.trialEndsAt > now;
    } else if (user.subscriptionStatus === "active") {
      subscriptionValid = true;
    }

    if (!subscriptionValid) {
      throw new Error("Subscription expired. Please renew to continue.");
    }

    // Update last login
    await ctx.db.patch(user._id, {
      lastLoginAt: now,
      updatedAt: now,
    });

    // Generate session token
    const sessionToken = crypto.randomUUID();

    // Store session token (you might want a sessions table for better management)
    // For now, we'll just return it

    return {
      success: true,
      sessionToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
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

    // TODO: Send reset email
    console.log(`Reset token for ${args.email}: ${resetToken}`);

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
      trialEndsAt: user.trialEndsAt,
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
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name) updates.name = args.name;
    if (args.businessName !== undefined) updates.businessName = args.businessName;

    await ctx.db.patch(args.userId, updates);

    return { success: true, message: "Profile updated successfully" };
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

    const now = Date.now();

    // Check trial
    if (user.subscriptionStatus === "trial") {
      if (user.trialEndsAt && user.trialEndsAt > now) {
        return {
          valid: true,
          status: "trial",
          daysRemaining: Math.ceil((user.trialEndsAt - now) / (24 * 60 * 60 * 1000)),
        };
      } else {
        return { valid: false, reason: "trial_expired" };
      }
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
