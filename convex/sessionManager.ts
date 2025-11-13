/**
 * Session Manager - Convex Functions
 * Handles session creation, refresh, revocation, and management
 */

import { v } from "convex/values";
import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal, api } from "./_generated/api";
import {
  generateSessionId,
  generateTokenPair,
  hashToken,
  isTokenExpired,
  isSessionIdle,
  isSessionExpired,
  createSessionMetadata,
  detectSuspiciousActivity,
  SESSION_CONFIG,
  SESSION_RATE_LIMIT,
  type TokenPair,
} from "./lib/session/tokenManager";

/**
 * Create a new session for a user
 * Returns access token and refresh token
 */
export const createSession = action({
  args: {
    userId: v.id("users"),
    userAgent: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args): Promise<TokenPair & { sessionId: string }> => {
    // Check rate limits
    const rateLimitCheck = await ctx.runQuery(
      internal.sessionManager.checkSessionRateLimit,
      {
        userId: args.userId,
        ipAddress: args.ipAddress,
      }
    );

    if (rateLimitCheck.limited) {
      throw new Error(
        `Session creation rate limit exceeded. ${rateLimitCheck.reason}`
      );
    }

    // Generate session ID and tokens
    const sessionId = generateSessionId();
    const tokens = await generateTokenPair(args.userId, sessionId);

    // Hash tokens for storage (never store plaintext tokens)
    const accessTokenHash = await hashToken(tokens.accessToken);
    const refreshTokenHash = await hashToken(tokens.refreshToken);

    // Create session metadata
    const metadata = createSessionMetadata(args.userAgent, args.ipAddress);

    // Store session
    await ctx.runMutation(internal.sessionManager.storeSession, {
      userId: args.userId,
      sessionId,
      accessTokenHash,
      refreshTokenHash,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      browser: metadata.browser,
      os: metadata.os,
      device: metadata.device,
      location: metadata.location,
    });

    return {
      ...tokens,
      sessionId,
    };
  },
});

/**
 * Refresh access token using refresh token
 * Implements refresh token rotation for security
 */
export const refreshAccessToken = action({
  args: {
    refreshToken: v.string(),
    userAgent: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args): Promise<TokenPair> => {
    // Hash the provided refresh token
    const refreshTokenHash = await hashToken(args.refreshToken);

    // Find session by refresh token hash
    const session = await ctx.runQuery(
      internal.sessionManager.getSessionByRefreshToken,
      {
        refreshTokenHash,
      }
    );

    if (!session) {
      throw new Error("Invalid or expired refresh token");
    }

    // Check if session is revoked
    if (session.isRevoked) {
      throw new Error("Session has been revoked");
    }

    // Check if refresh token is expired
    if (isTokenExpired(session.refreshTokenExpiresAt)) {
      // Revoke the session
      await ctx.runMutation(
        api.sessionManager
          .revokeSession,
        {
          sessionId: session.sessionId,
          reason: "Refresh token expired",
        }
      );
      throw new Error("Refresh token expired. Please log in again.");
    }

    // Check if session is idle
    if (isSessionIdle(session.lastAccessedAt)) {
      // Revoke the session
      await ctx.runMutation(
        api.sessionManager
          .revokeSession,
        {
          sessionId: session.sessionId,
          reason: "Session idle timeout",
        }
      );
      throw new Error(
        "Session expired due to inactivity. Please log in again."
      );
    }

    // Check if session has exceeded absolute timeout
    if (isSessionExpired(session.createdAt)) {
      // Revoke the session
      await ctx.runMutation(api.sessionManager.revokeSession, {
        sessionId: session.sessionId,
        reason: "Session absolute timeout",
      });
      throw new Error("Session expired. Please log in again.");
    }

    // Detect suspicious activity
    const suspiciousCheck = detectSuspiciousActivity(
      {
        browser: session.browser || "Unknown",
        os: session.os || "Unknown",
        device: session.device || "Desktop",
        ipAddress: session.ipAddress || "",
        userAgent: session.userAgent || "",
        createdAt: session.createdAt,
        lastActivityAt: session.lastAccessedAt,
      },
      {
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      }
    );

    if (suspiciousCheck.suspicious) {
      // Log suspicious activity but don't block (could be legitimate)
      console.warn(
        `Suspicious session activity detected for user ${session.userId}:`,
        suspiciousCheck.reasons
      );
      // In production, you might want to require 2FA verification here
    }

    // Generate new token pair (refresh token rotation)
    const newTokens = await generateTokenPair(session.userId, session.sessionId);

    // Hash new tokens
    const newAccessTokenHash = await hashToken(newTokens.accessToken);
    const newRefreshTokenHash = await hashToken(newTokens.refreshToken);

    // Update session with new tokens
    await ctx.runMutation(internal.sessionManager.rotateSessionTokens, {
      sessionId: session.sessionId,
      accessTokenHash: newAccessTokenHash,
      refreshTokenHash: newRefreshTokenHash,
      accessTokenExpiresAt: newTokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: newTokens.refreshTokenExpiresAt,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    return newTokens;
  },
});

/**
 * Validate access token
 * Used by API middleware to authenticate requests
 */
export const validateAccessToken = query({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Hash the token
    const accessTokenHash = await hashToken(args.accessToken);

    // Find session by access token hash
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_access_token_hash", (q) =>
        q.eq("accessTokenHash", accessTokenHash)
      )
      .first();

    if (!session) {
      return {
        valid: false,
        reason: "Invalid access token",
      };
    }

    // Check if session is revoked
    if (session.isRevoked) {
      return {
        valid: false,
        reason: "Session has been revoked",
      };
    }

    // Check if access token is expired
    if (isTokenExpired(session.accessTokenExpiresAt)) {
      return {
        valid: false,
        reason: "Access token expired",
        requiresRefresh: true,
      };
    }

    // Check if session is idle
    if (isSessionIdle(session.lastAccessedAt)) {
      return {
        valid: false,
        reason: "Session idle timeout",
      };
    }

    // Check if session has exceeded absolute timeout
    if (isSessionExpired(session.createdAt)) {
      return {
        valid: false,
        reason: "Session absolute timeout",
      };
    }

    return {
      valid: true,
      userId: session.userId,
      sessionId: session.sessionId,
    };
  },
});

/**
 * Revoke a specific session (logout)
 */
export const revokeSession = mutation({
  args: {
    sessionId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      isRevoked: true,
      revokedAt: Date.now(),
      revokedReason: args.reason || "User logout",
    });

    return { success: true };
  },
});

/**
 * Revoke all sessions for a user
 * Useful when user changes password or detects suspicious activity
 */
export const revokeAllSessions = mutation({
  args: {
    userId: v.id("users"),
    exceptSessionId: v.optional(v.string()), // Keep current session active
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isRevoked", false)
      )
      .collect();

    let revokedCount = 0;

    for (const session of sessions) {
      // Skip the exception session (usually current session)
      if (args.exceptSessionId && session.sessionId === args.exceptSessionId) {
        continue;
      }

      await ctx.db.patch(session._id, {
        isRevoked: true,
        revokedAt: Date.now(),
        revokedReason: args.reason || "All sessions revoked",
      });

      revokedCount++;
    }

    return {
      success: true,
      revokedCount,
    };
  },
});

/**
 * Get active sessions for a user
 */
export const getActiveSessions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isRevoked", false)
      )
      .collect();

    // Filter out expired sessions
    const activeSessions = sessions.filter(
      (session) =>
        !isTokenExpired(session.refreshTokenExpiresAt) &&
        !isSessionIdle(session.lastAccessedAt) &&
        !isSessionExpired(session.createdAt)
    );

    // Format for display
    return activeSessions.map((session) => ({
      sessionId: session.sessionId,
      device: session.device,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // Can be set by client if they know current sessionId
    }));
  },
});

/**
 * Update session activity
 * Called on each authenticated request to track last activity
 */
export const updateSessionActivity = mutation({
  args: {
    sessionId: v.string(),
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return { success: false };
    }

    await ctx.db.patch(session._id, {
      lastAccessedAt: Date.now(),
      lastActivityType: args.activityType,
    });

    return { success: true };
  },
});

/**
 * Clean up expired sessions
 * Should be run periodically (e.g., daily cron job)
 */
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("auth_sessions").collect();

    let deletedCount = 0;
    const now = Date.now();

    for (const session of allSessions) {
      // Delete if:
      // 1. Refresh token expired
      // 2. Session is idle
      // 3. Session exceeded absolute timeout
      // 4. Already revoked and revoked more than 30 days ago
      const shouldDelete =
        isTokenExpired(session.refreshTokenExpiresAt) ||
        isSessionIdle(session.lastAccessedAt) ||
        isSessionExpired(session.createdAt) ||
        (session.isRevoked &&
          session.revokedAt &&
          now - session.revokedAt > 30 * 24 * 60 * 60 * 1000);

      if (shouldDelete) {
        await ctx.db.delete(session._id);
        deletedCount++;
      }
    }

    console.log(`🗑️ Cleaned up ${deletedCount} expired sessions`);
    return { deletedCount };
  },
});

/**
 * Get session statistics for a user
 */
export const getSessionStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const allSessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeSessions = allSessions.filter(
      (s) =>
        !s.isRevoked &&
        !isTokenExpired(s.refreshTokenExpiresAt) &&
        !isSessionIdle(s.lastAccessedAt) &&
        !isSessionExpired(s.createdAt)
    );

    const revokedSessions = allSessions.filter((s) => s.isRevoked);
    const expiredSessions = allSessions.filter(
      (s) =>
        !s.isRevoked &&
        (isTokenExpired(s.refreshTokenExpiresAt) ||
          isSessionIdle(s.lastAccessedAt) ||
          isSessionExpired(s.createdAt))
    );

    // Device breakdown
    const deviceBreakdown = activeSessions.reduce(
      (acc, session) => {
        const device = session.device || "Unknown";
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: allSessions.length,
      active: activeSessions.length,
      revoked: revokedSessions.length,
      expired: expiredSessions.length,
      deviceBreakdown,
      oldestSession:
        allSessions.length > 0
          ? Math.min(...allSessions.map((s) => s.createdAt))
          : null,
      newestSession:
        allSessions.length > 0
          ? Math.max(...allSessions.map((s) => s.createdAt))
          : null,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS AND QUERIES
// ============================================================================

export const storeSession = internalMutation({
  args: {
    userId: v.id("users"),
    sessionId: v.string(),
    accessTokenHash: v.string(),
    refreshTokenHash: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.number(),
    userAgent: v.string(),
    ipAddress: v.string(),
    browser: v.string(),
    os: v.string(),
    device: v.string(),
    location: v.optional(
      v.object({
        city: v.optional(v.string()),
        country: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("auth_sessions", {
      userId: args.userId,
      sessionId: args.sessionId,
      accessTokenHash: args.accessTokenHash,
      refreshTokenHash: args.refreshTokenHash,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + SESSION_CONFIG.absoluteTimeout,
      userAgent: args.userAgent,
      browser: args.browser,
      os: args.os,
      device: args.device,
      ipAddress: args.ipAddress,
      location: args.location,
      isRevoked: false,
    });
  },
});

export const getSessionByRefreshToken = internalQuery({
  args: {
    refreshTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auth_sessions")
      .withIndex("by_refresh_token_hash", (q) =>
        q.eq("refreshTokenHash", args.refreshTokenHash)
      )
      .first();
  },
});

export const rotateSessionTokens = internalMutation({
  args: {
    sessionId: v.string(),
    accessTokenHash: v.string(),
    refreshTokenHash: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.number(),
    ipAddress: v.string(),
    userAgent: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    const now = Date.now();

    await ctx.db.patch(session._id, {
      accessTokenHash: args.accessTokenHash,
      refreshTokenHash: args.refreshTokenHash,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      lastAccessedAt: now,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  },
});

export const checkSessionRateLimit = internalQuery({
  args: {
    userId: v.id("users"),
    ipAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Check max concurrent sessions per user
    const userSessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isRevoked", false)
      )
      .collect();

    const activeUserSessions = userSessions.filter(
      (s) =>
        !isTokenExpired(s.refreshTokenExpiresAt) &&
        !isSessionIdle(s.lastAccessedAt) &&
        !isSessionExpired(s.createdAt)
    );

    if (activeUserSessions.length >= SESSION_RATE_LIMIT.maxSessionsPerUser) {
      return {
        limited: true,
        reason: `Maximum ${SESSION_RATE_LIMIT.maxSessionsPerUser} concurrent sessions exceeded`,
      };
    }

    // Check max concurrent sessions per IP
    const ipSessions = await ctx.db.query("auth_sessions").collect();

    const activeIPSessions = ipSessions.filter(
      (s) =>
        s.ipAddress === args.ipAddress &&
        !s.isRevoked &&
        !isTokenExpired(s.refreshTokenExpiresAt) &&
        !isSessionIdle(s.lastAccessedAt) &&
        !isSessionExpired(s.createdAt)
    );

    if (activeIPSessions.length >= SESSION_RATE_LIMIT.maxSessionsPerIP) {
      return {
        limited: true,
        reason: `Maximum ${SESSION_RATE_LIMIT.maxSessionsPerIP} concurrent sessions per IP exceeded`,
      };
    }

    // Check session creation rate
    const recentSessions = userSessions.filter(
      (s) => Date.now() - s.createdAt < SESSION_RATE_LIMIT.createWindowMs
    );

    if (recentSessions.length >= SESSION_RATE_LIMIT.maxCreatesInWindow) {
      return {
        limited: true,
        reason: `Too many session creations. Please wait before creating another session.`,
      };
    }

    return {
      limited: false,
    };
  },
});
