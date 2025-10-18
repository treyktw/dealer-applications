// convex/email-auth.ts
import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 DAYS (changed from 30)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// AUTH HELPERS - For authenticating requests with email auth tokens
// ============================================================================

/**
 * Validate email auth token and return the associated user
 * Used for desktop app authentication
 */
export async function validateEmailAuthToken(ctx: QueryCtx | MutationCtx, token: string) {
  const session = await ctx.db
    .query("auth_sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session) {
    return null;
  }

  const now = Date.now();
  if (session.expiresAt < now) {
    return null;
  }

  // Get the user
  const user = await ctx.db.get(session.userId as Id<"users">);
  return user;
}

/**
 * Get authenticated user from either Clerk or Email auth token parameter
 * This allows the backend to support both web (Clerk) and desktop (Email) auth
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx, emailAuthToken?: string) {
  // First, try email auth token if provided (desktop app)
  if (emailAuthToken) {
    const user = await validateEmailAuthToken(ctx, emailAuthToken);
    if (user) {
      return user;
    }
  }

  // Fall back to Clerk auth (for web app)
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.email) {
    // User is authenticated via Clerk - find their user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email as string))
      .first();
    return user;
  }
  
  return null;
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx, emailAuthToken?: string) {
  const user = await getAuthenticatedUser(ctx, emailAuthToken);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

// ============================================================================
// CODE GENERATION
// ============================================================================

function generateVerificationCode(): string {
  // Generate a 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

function generateVerificationEmail(code: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName}` : 'Hi there';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to DealerPro</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            🚗 DealerPro
          </h1>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px;">
            ${greeting}! 👋
          </h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Here's your verification code to sign in to DealerPro Desktop. This code will expire in <strong>15 minutes</strong>.
            Once verified, you'll stay logged in for <strong>7 days</strong>.
          </p>
          
          <!-- Verification Code -->
          <div style="text-align: center; margin: 32px 0;">
            <div style="background: #f3f4f6; border: 2px solid #667eea; border-radius: 12px; padding: 24px; display: inline-block;">
              <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                Your Verification Code
              </div>
              <div style="font-size: 42px; font-weight: 700; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
          </div>
          
          <!-- Instructions -->
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.5;">
              <strong>📋 How to use:</strong><br/>
              1. Copy the code above<br/>
              2. Return to DealerPro Desktop<br/>
              3. Paste the code when prompted<br/>
              4. Stay logged in for 7 days!
            </p>
          </div>
          
          <!-- Security Notice -->
          <div style="margin-top: 32px; padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
              <strong>🔒 Security Notice:</strong> If you didn't request this code, you can safely ignore this email. Never share this code with anyone.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} DealerPro. All rights reserved.<br/>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// RESEND EMAIL HELPER
// ============================================================================

async function sendVerificationEmail(
  email: string, 
  code: string,
  userName?: string
): Promise<void> {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    console.log('📧 DEV MODE: Skipping email send');
    console.log('Verification code:', code);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    throw new ConvexError('Email service not configured');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'DealerPro <noreply@universalautobrokers.net>',
        to: email,
        subject: 'Your DealerPro verification code',
        html: generateVerificationEmail(code, userName),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      throw new Error('Failed to send email');
    }

    const data = await response.json();
    console.log('Email sent successfully:', data.id);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new ConvexError('Failed to send verification code. Please try again.');
  }
}

// ============================================================================
// VERIFICATION CODE GENERATION
// ============================================================================

/**
 * Request a verification code for email authentication
 * Called from the Tauri app when user enters their email
 */
export const requestVerificationCode = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    
    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      throw new ConvexError("Invalid email address");
    }

    // Check if user exists
    const user = await ctx.runQuery(internal.emailAuth.getUserByEmail, {
      email,
    });

    if (!user) {
      throw new ConvexError("No account found with this email. Please contact your admin.");
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new ConvexError("Your account has been deactivated. Please contact your admin.");
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    // Store verification code
    await ctx.runMutation(internal.emailAuth.storeVerificationCode, {
      userId: user._id,
      email,
      code,
      expiresAt,
    });

    console.log(`Verification code generated for ${email}: ${code}`);

    // Send email (will skip in dev mode)
    try {
      await sendVerificationEmail(email, code, user.name);
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't throw - we still want to return the code in dev mode
    }

    // Check if we're in dev mode to return the code
    const isDev = process.env.NODE_ENV === 'development';

    return {
      success: true,
      message: isDev 
        ? "Verification code generated (dev mode - no email sent)" 
        : "Verification code sent to your email",
      // Only include code in development
      ...(isDev && { code }),
    };
  },
});

/**
 * Verify code and create session
 * Called when user enters the 6-digit code
 */
export const verifyCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const code = args.code.trim();

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      throw new ConvexError("Invalid code format. Code must be 6 digits.");
    }

    // Find the code
    const verificationCode = await ctx.db
      .query("verification_codes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("code"), code))
      .first();

    if (!verificationCode) {
      throw new ConvexError("Invalid verification code");
    }

    // Check if expired
    if (Date.now() > verificationCode.expiresAt) {
      throw new ConvexError("Verification code has expired. Please request a new one.");
    }

    // Check if already used
    if (verificationCode.used) {
      throw new ConvexError("This verification code has already been used");
    }

    // Get user
    const user = await ctx.db.get(verificationCode.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new ConvexError("Your account has been deactivated");
    }

    // Mark code as used
    await ctx.db.patch(verificationCode._id, {
      used: true,
      usedAt: Date.now(),
    });

    // Create session with 7-day expiry
    const sessionToken = generateSessionToken();
    const expiresAt = Date.now() + SESSION_EXPIRY_MS; // Now 7 days

    await ctx.db.insert("auth_sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      userAgent: "Tauri Desktop App",
      ipAddress: "local",
    });

    return {
      success: true,
      session: {
        token: sessionToken,
        expiresAt,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          dealershipId: user.dealershipId,
        },
      },
    };
  },
});

// Generate secure session token
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Validate session token and return user
 * Called on app startup and for protected routes
 */
export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user || user.isActive === false) {
      return null;
    }

    // Note: Can't update lastAccessedAt here because this is a query (read-only)
    // If you need to track last access, call updateSessionAccess mutation separately

    return {
      session: {
        id: session._id,
        token: session.token,
        expiresAt: session.expiresAt,
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
    };
  },
});

/**
 * Update session last accessed time (optional)
 * Call this periodically if you want to track user activity
 */
export const updateSessionAccess = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session && Date.now() <= session.expiresAt) {
      await ctx.db.patch(session._id, {
        lastAccessedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Refresh session - extends expiration by another 7 days
 */
export const refreshSession = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      throw new ConvexError("Session expired");
    }

    // Extend session by another 7 days from now
    const newExpiresAt = Date.now() + SESSION_EXPIRY_MS;

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
      lastAccessedAt: Date.now(),
    });

    return {
      success: true,
      expiresAt: newExpiresAt,
    };
  },
});

/**
 * Logout - invalidate session
 */
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Logout from all devices
 */
export const logoutAllDevices = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find current session to get userId
    const currentSession = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!currentSession) {
      throw new ConvexError("Session not found");
    }

    // Delete all sessions for this user
    const allSessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_user", (q) => q.eq("userId", currentSession.userId))
      .collect();

    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true, sessionsDeleted: allSessions.length };
  },
});

// ============================================================================
// ADMIN: USER MANAGEMENT
// ============================================================================

/**
 * Admin only: Get all users for current dealership
 */
export const getAllUsers = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionData = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!sessionData) {
      throw new ConvexError("Unauthorized");
    }

    const currentUser = await ctx.db.get(sessionData.userId);
    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    if (currentUser.role !== "ADMIN") {
      throw new ConvexError("Admin access required");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_dealership", (q) => 
        q.eq("dealershipId", currentUser.dealershipId)
      )
      .collect();

    return users;
  },
});

// ============================================================================
// INTERNAL FUNCTIONS (not exposed to client)
// ============================================================================

export const getUserByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const storeVerificationCode = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Invalidate any existing unused codes for this email
    const existingCodes = await ctx.db
      .query("verification_codes")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("used"), false))
      .collect();

    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Create new code
    return await ctx.db.insert("verification_codes", {
      userId: args.userId,
      email: args.email,
      code: args.code,
      expiresAt: args.expiresAt,
      used: false,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// CLEANUP TASKS (run periodically)
// ============================================================================

/**
 * Clean up expired codes and sessions
 * Call this periodically via cron
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Delete expired verification codes
    const expiredCodes = await ctx.db
      .query("verification_codes")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }

    // Delete expired sessions
    const expiredSessions = await ctx.db
      .query("auth_sessions")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return {
      codesDeleted: expiredCodes.length,
      sessionsDeleted: expiredSessions.length,
    };
  },
});