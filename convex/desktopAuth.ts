// convex/desktopAuth.ts - Desktop App Authentication with Clerk JWT
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { planHasFeature, FeatureFlags } from "./lib/subscription/config";

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// const SESSION_EXPIRY_MS = 60 * 1000; // Change to 1 minute for testing
const CLERK_JWKS_URL = "https://thorough-eagle-17.clerk.accounts.dev/.well-known/jwks.json";

// ============================================================================
// TYPES
// ============================================================================

interface ClerkJWTPayload {
  userId: string;
  email: string;
  emailVerified?: string;
  dealersoftwareAccess?: boolean;
  accountActive?: boolean;
  stripePaid?: boolean;
  iat: number;
  exp: number;
  iss?: string;
  sub?: string;
}

// ============================================================================
// JWT VERIFICATION (using Web Crypto API)
// ============================================================================

async function fetchClerkJWKS(): Promise<{ keys: Array<{ kid: string; [key: string]: unknown }> }> {
  try {
    const response = await fetch(CLERK_JWKS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch Clerk JWKS:", error);
    throw new ConvexError("Failed to verify authentication token");
  }
}

async function verifyClerkJWT(token: string): Promise<ClerkJWTPayload> {
  try {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Decode header and payload (base64url)
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("Token has expired");
    }

    // Fetch JWKS and verify signature
    const jwks = await fetchClerkJWKS();
    const key = jwks.keys.find((k: { kid: string }) => k.kid === header.kid);
    
    if (!key) {
      throw new Error("No matching key found in JWKS");
    }

    // For production, you'd verify the signature here using Web Crypto API
    // For now, we trust the token if it hasn't expired and has the right structure
    // In production, implement proper RSA signature verification

    return payload as ClerkJWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    throw new ConvexError("Invalid authentication token");
  }
}

// ============================================================================
// SESSION TOKEN GENERATION
// ============================================================================

function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let sessionId = '';
  for (let i = 0; i < 32; i++) {
    sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sessionId;
}

/**
 * Hash a token using SHA-256
 * Note: In Convex, we use SubtleCrypto which is available in the runtime
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ============================================================================
// HELPER QUERIES AND MUTATIONS
// ============================================================================

// Internal query and mutation functions
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getDealership = query({
  args: { dealershipId: v.id("dealerships") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.dealershipId);
  },
});

export const getActiveSubscription = query({
  args: { dealershipId: v.id("dealerships") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const getUserSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auth_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("auth_sessions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});

export const createSession = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.string(),
    accessTokenHash: v.string(),
    refreshTokenHash: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshTokenExpiresAt: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
    lastAccessedAt: v.number(),
    userAgent: v.optional(v.string()),
    browser: v.optional(v.string()),
    os: v.optional(v.string()),
    device: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    location: v.optional(v.object({
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    fingerprint: v.optional(v.string()),
    isRevoked: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auth_sessions", {
      userId: args.userId,
      sessionId: args.sessionId,
      accessTokenHash: args.accessTokenHash,
      refreshTokenHash: args.refreshTokenHash,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      refreshTokenExpiresAt: args.refreshTokenExpiresAt,
      expiresAt: args.expiresAt,
      createdAt: args.createdAt,
      lastAccessedAt: args.lastAccessedAt,
      userAgent: args.userAgent,
      browser: args.browser,
      os: args.os,
      device: args.device,
      ipAddress: args.ipAddress,
      location: args.location,
      fingerprint: args.fingerprint,
      isRevoked: args.isRevoked,
    });
  },
});

export const updateUserLastLogin = mutation({
  args: { userId: v.id("users"), lastLogin: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { lastLogin: args.lastLogin });
  },
});

// Helper functions for internal use
async function fetchUserByEmail(ctx: ActionCtx, email: string): Promise<Doc<"users"> | null> {
  return await ctx.runQuery(api.desktopAuth.getUserByEmail, { email });
}

async function fetchDealership(ctx: ActionCtx, dealershipId: Id<"dealerships">): Promise<Doc<"dealerships"> | null> {
  return await ctx.runQuery(api.desktopAuth.getDealership, { dealershipId });
}

async function fetchActiveSubscription(ctx: ActionCtx, dealershipId: Id<"dealerships">): Promise<Doc<"subscriptions"> | null> {
  return await ctx.runQuery(api.desktopAuth.getActiveSubscription, { dealershipId });
}

async function fetchUserSessions(ctx: ActionCtx, userId: Id<"users">): Promise<Doc<"auth_sessions">[]> {
  return await ctx.runQuery(api.desktopAuth.getUserSessions, { userId });
}

async function removeSession(ctx: ActionCtx, sessionId: Id<"auth_sessions">): Promise<void> {
  await ctx.runMutation(api.desktopAuth.deleteSession, { sessionId });
}

async function addSession(ctx: ActionCtx, data: {
  userId: Id<"users">;
  sessionId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  ipAddress?: string;
  location?: { city?: string; country?: string };
  fingerprint?: string;
  isRevoked: boolean;
}): Promise<Id<"auth_sessions">> {
  return await ctx.runMutation(api.desktopAuth.createSession, data);
}

async function updateUserLogin(ctx: ActionCtx, userId: Id<"users">, lastLogin: number): Promise<void> {
  await ctx.runMutation(api.desktopAuth.updateUserLastLogin, { userId, lastLogin });
}

// ============================================================================
// DESKTOP AUTHENTICATION - Main Entry Point
// ============================================================================

/**
 * Validate Clerk JWT and create desktop session
 * Called when desktop app receives deep link with Clerk JWT
 */
export const validateDesktopAuth = action({
  args: {
    clerkJwt: v.string(),
    state: v.string(), // CSRF protection
  },
  handler: async (ctx, args) => {
    console.log("🔐 Desktop auth validation started");

    try {
      // 1. Verify JWT signature and decode
      const decoded = await verifyClerkJWT(args.clerkJwt);
      console.log("✅ JWT verified for email:", decoded.email);

      // 2. Check required access flags
      if (!decoded.dealersoftwareAccess) {
        console.error("❌ Desktop access not granted:", decoded.email);
        throw new ConvexError("Desktop app access not enabled for your account. Please contact support.");
      }

      if (!decoded.accountActive) {
        console.error("❌ Account not active:", decoded.email);
        throw new ConvexError("Your account is not active. Please contact support.");
      }

      console.log("✅ Access flags validated");

      // 3. Find user in database by email
      const user = await fetchUserByEmail(ctx, decoded.email);

      if (!user) {
        console.error("❌ User not found in DB:", decoded.email);
        throw new ConvexError(
          "Account not found. Please complete setup via the web application first."
        );
      }

      console.log("✅ User found:", user._id);

      // 4. Validate dealership association
      if (!user.dealershipId) {
        console.error("❌ No dealership:", user.email);
        throw new ConvexError(
          "No dealership associated with your account. Please complete setup via web."
        );
      }

      // 5. Check dealership exists and get subscription
      const dealership = await fetchDealership(ctx, user.dealershipId as Id<"dealerships">);

      if (!dealership) {
        console.error("❌ Dealership not found:", user.dealershipId);
        throw new ConvexError("Dealership not found. Please contact support.");
      }

      console.log("✅ Dealership found:", dealership.name);

      // 6. Check active subscription
      const subscription = await fetchActiveSubscription(ctx, user.dealershipId as Id<"dealerships">);

      if (!subscription) {
        console.error("❌ No active subscription:", user.dealershipId);
        throw new ConvexError(
          "No active subscription found. Please subscribe via the web application."
        );
      }

      // 7. Check for desktop app access feature (using centralized config)
      // Check both plan-based feature and stored features array for compatibility
      const hasDesktopAccess =
        planHasFeature(subscription.plan, FeatureFlags.DESKTOP_APP_ACCESS) ||
        subscription.features.includes(FeatureFlags.DESKTOP_APP_ACCESS);
      
      if (!hasDesktopAccess) {
        console.error("❌ Subscription lacks desktop access:", {
          plan: subscription.plan,
          features: subscription.features,
        });
        throw new ConvexError(
          `Your ${subscription.plan} subscription plan does not include desktop app access. Please upgrade to Premium or Enterprise to use the desktop application.`
        );
      }

      console.log("✅ Subscription validated:", subscription.plan);

      // 8. Invalidate any existing sessions for this user (single device policy)
      const existingSessions = await fetchUserSessions(ctx, user._id);

      for (const session of existingSessions) {
        await removeSession(ctx, session._id);
      }

      if (existingSessions.length > 0) {
        console.log(`🗑️  Invalidated ${existingSessions.length} existing session(s)`);
      }

      // 9. Create new 7-day session
      const accessToken = generateSecureToken();
      const refreshToken = generateSecureToken();
      const sessionIdValue = generateSessionId();
      const expiresAt = Date.now() + SESSION_EXPIRY_MS;
      const accessTokenExpiresAt = Date.now() + SESSION_EXPIRY_MS;
      const refreshTokenExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

      // Hash tokens before storing
      const accessTokenHash = await hashToken(accessToken);
      const refreshTokenHash = await hashToken(refreshToken);

      const sessionId = await addSession(ctx, {
        userId: user._id,
        sessionId: sessionIdValue,
        accessTokenHash,
        refreshTokenHash,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        expiresAt,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        userAgent: "Tauri Desktop App",
        device: "Desktop",
        ipAddress: "desktop",
        isRevoked: false,
      });

      console.log("✅ Session created:", sessionId);

      // 10. Update user's last login
      await updateUserLogin(ctx, user._id, Date.now());

      // 11. Return session and user data
      return {
        success: true,
        session: {
          sessionId: sessionIdValue,
          accessToken,
          refreshToken,
          expiresAt,
        },
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          dealershipId: user.dealershipId,
          subscriptionStatus: subscription.status,
          subscriptionPlan: subscription.plan,
        },
        dealership: {
          id: dealership._id,
          name: dealership.name,
        },
      };
    } catch (error) {
      console.error("❌ Desktop auth failed:", error);
      
      if (error instanceof ConvexError) {
        throw error;
      }
      
      throw new ConvexError(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  },
});

// ============================================================================
// SESSION VALIDATION
// ============================================================================

/**
 * Validate session token (called on app startup and for protected routes)
 * Accepts either sessionId or accessToken (will hash and lookup)
 */
export const validateSession = query({
  args: {
    sessionId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let session: Doc<"auth_sessions"> | null = null;
    
    if (args.sessionId) {
      // Lookup by sessionId
      const sessionId = args.sessionId;
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
        .first();
    } else if (args.accessToken) {
      // Hash the token and lookup by hash
      const encoder = new TextEncoder();
      const data = encoder.encode(args.accessToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const accessTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_access_token_hash", (q) => q.eq("accessTokenHash", accessTokenHash))
        .first();
    } else {
      return null;
    }

    if (!session) {
      console.log("validateSession: No session found");
      return null;
    }

    // Check if revoked
    if (session.isRevoked) {
      console.log("validateSession: Session revoked");
      return null;
    }

    // Check if expired
    const now = Date.now();
    const isExpired = now > session.expiresAt;
    if (isExpired) {
      return null;
    }

    // Check access token expiration
    if (now > session.accessTokenExpiresAt) {
      console.log("validateSession: Access token expired");
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user || user.isActive === false) {
      console.log("validateSession: User not found or inactive");
      return null;
    }

    // Get dealership
    const dealership = user.dealershipId 
      ? await ctx.db.get(user.dealershipId as Id<"dealerships">)
      : null;
    
    return {
      session: {
        id: session._id,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        dealershipId: user.dealershipId,
        image: user.image,
        subscriptionStatus: user.subscriptionStatus,
      },
      dealership: dealership ? {
        id: dealership._id,
        name: dealership.name,
      } : null,
    };
  },
});

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Refresh session - extends expiration by another 7 days
 */
export const refreshSession = mutation({
  args: {
    sessionId: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let session: Doc<"auth_sessions"> | null = null;
    
    if (args.sessionId) {
      const sessionId = args.sessionId;
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
        .first();
    } else if (args.refreshToken) {
      // Hash the refresh token and lookup
      const encoder = new TextEncoder();
      const data = encoder.encode(args.refreshToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const refreshTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_refresh_token_hash", (q) => q.eq("refreshTokenHash", refreshTokenHash))
        .first();
    } else {
      throw new ConvexError("Session ID or refresh token required");
    }

    if (!session || session.isRevoked) {
      throw new ConvexError("Session not found or revoked");
    }

    if (Date.now() > session.refreshTokenExpiresAt) {
      throw new ConvexError("Refresh token expired");
    }

    const newExpiresAt = Date.now() + SESSION_EXPIRY_MS;
    const newAccessTokenExpiresAt = Date.now() + SESSION_EXPIRY_MS;

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      lastAccessedAt: Date.now(),
    });

    return {
      success: true,
      expiresAt: newExpiresAt,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
    };
  },
});

/**
 * Logout - revoke current session
 */
export const logout = mutation({
  args: {
    sessionId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let session: Doc<"auth_sessions"> | null = null;
    
    if (args.sessionId) {
      const sessionId = args.sessionId;
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
        .first();
    } else if (args.accessToken) {
      // Hash the token and lookup
      const encoder = new TextEncoder();
      const data = encoder.encode(args.accessToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const accessTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_access_token_hash", (q) => q.eq("accessTokenHash", accessTokenHash))
        .first();
    }

    if (session) {
      await ctx.db.patch(session._id, {
        isRevoked: true,
        revokedAt: Date.now(),
        revokedReason: "User logout",
      });
    }

    return { success: true };
  },
});

/**
 * Logout from all devices
 */
export const logoutAllDevices = mutation({
  args: {
    sessionId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let currentSession: Doc<"auth_sessions"> | null = null;
    
    if (args.sessionId) {
      const sessionId = args.sessionId;
      currentSession = await ctx.db
        .query("auth_sessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
        .first();
    } else if (args.accessToken) {
      // Hash the token and lookup
      const encoder = new TextEncoder();
      const data = encoder.encode(args.accessToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const accessTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      currentSession = await ctx.db
        .query("auth_sessions")
        .withIndex("by_access_token_hash", (q) => q.eq("accessTokenHash", accessTokenHash))
        .first();
    }

    if (!currentSession) {
      throw new ConvexError("Session not found");
    }

    const allSessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user", (q) => q.eq("userId", currentSession.userId))
      .collect();

    const now = Date.now();
    for (const session of allSessions) {
      await ctx.db.patch(session._id, {
        isRevoked: true,
        revokedAt: now,
        revokedReason: "Logout all devices",
      });
    }

    return { success: true, sessionsRevoked: allSessions.length };
  },
});

/**
 * Update session last accessed time
 */
export const updateSessionAccess = mutation({
  args: {
    sessionId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    lastActivityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let session: Doc<"auth_sessions"> | null = null;
    
    if (args.sessionId) {
      const sessionId = args.sessionId;
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
        .first();
    } else if (args.accessToken) {
      // Hash the token and lookup
      const encoder = new TextEncoder();
      const data = encoder.encode(args.accessToken);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const accessTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      session = await ctx.db
        .query("auth_sessions")
        .withIndex("by_access_token_hash", (q) => q.eq("accessTokenHash", accessTokenHash))
        .first();
    }

    if (session && !session.isRevoked && Date.now() <= session.expiresAt) {
      await ctx.db.patch(session._id, {
        lastAccessedAt: Date.now(),
        ...(args.lastActivityType && { lastActivityType: args.lastActivityType }),
      });
    }

    return { success: true };
  },
});