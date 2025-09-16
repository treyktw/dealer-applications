// convex/security.ts - Security Framework
import { mutation, internalMutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Security event logging
export const logSecurityEvent = internalMutation({
  args: {
    action: v.string(),
    dealershipId: v.optional(v.id("dealerships")),
    userId: v.optional(v.string()),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    success: v.boolean(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logEntry = await ctx.db.insert("security_logs", {
      ...args,
      timestamp: Date.now(),
    });

    // Alert on critical security events
    if (!args.success && [
      'unauthorized_access_attempt', 
      'rate_limit_exceeded', 
      'bucket_creation_failed'
    ].includes(args.action)) {
      console.warn(`SECURITY ALERT: ${args.action}`, {
        dealershipId: args.dealershipId,
        userId: args.userId,
        details: args.details,
        timestamp: new Date().toISOString(),
      });
    }

    return logEntry;
  },
});

// Rate limiting
export const checkRateLimit = internalMutation({
  args: {
    identifier: v.string(),
    action: v.string(),
    limit: v.number(),
    windowMs: v.number(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowStart = now - args.windowMs;
    const key = `${args.identifier}:${args.action}`;

    // Clean up old rate limit records (older than window)
    const oldRecords = await ctx.db
      .query("rate_limits")
      .withIndex("by_key_timestamp", (q) => 
        q.eq("key", key).lt("timestamp", windowStart)
      )
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    // Get current requests in window
    const currentRequests = await ctx.db
      .query("rate_limits")
      .withIndex("by_key_timestamp", (q) => 
        q.eq("key", key).gte("timestamp", windowStart)
      )
      .collect();

    if (currentRequests.length >= args.limit) {
      const oldestRequest = currentRequests.sort((a, b) => a.timestamp - b.timestamp)[0];
      const retryAfter = Math.ceil((oldestRequest.timestamp + args.windowMs - now) / 1000);
      
      // Log rate limit exceeded
      await ctx.db.insert("security_logs", {
        action: 'rate_limit_exceeded',
        userId: args.identifier,
        success: false,
        details: `Rate limit exceeded for ${args.action}: ${currentRequests.length}/${args.limit} requests`,
        ipAddress: args.ipAddress || 'unknown',
        timestamp: Date.now(),
      });
      
      return { allowed: false, retryAfter };
    }

    // Record this request
    await ctx.db.insert("rate_limits", {
      key,
      timestamp: now,
      identifier: args.identifier,
      action: args.action,
      ipAddress: args.ipAddress || 'unknown',
    });

    return { allowed: true };
  },
});

// Row-level security validation
export const validateDealershipAccess = internalMutation({
  args: {
    userId: v.string(),
    dealershipId: v.id("dealerships"),
    action: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user by clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check dealership access
    if (user.dealershipId !== args.dealershipId) {
      // Log unauthorized access attempt
      await ctx.db.insert("security_logs", {
        action: 'unauthorized_access_attempt',
        dealershipId: args.dealershipId,
        userId: args.userId,
        success: false,
        details: `User attempted to access dealership ${args.dealershipId} but belongs to ${user.dealershipId}`,
        ipAddress: 'server',
        timestamp: Date.now(),
      });
      
      throw new ConvexError("Access denied: Dealership mismatch");
    }

    // Role-based access control
    if (args.action) {
      const hasPermission = checkPermission(user.role, args.action);
      if (!hasPermission) {
        await ctx.db.insert("security_logs", {
          action: 'insufficient_permissions',
          dealershipId: args.dealershipId,
          userId: args.userId,
          success: false,
          details: `User role ${user.role} insufficient for action ${args.action}`,
          ipAddress: 'server',
          timestamp: Date.now(),
        });
        
        throw new ConvexError(`Access denied: Insufficient permissions for ${args.action}`);
      }
    }

    return { user, authorized: true };
  },
});

// Permission checker helper function
function checkPermission(role: string, action: string): boolean {
  const permissions = {
    'admin': ['*'], // Admin can do everything
    'manager': [
      'vehicles.read', 'vehicles.create', 'vehicles.update', 'vehicles.delete',
      'clients.read', 'clients.create', 'clients.update', 'clients.delete',
      'deals.read', 'deals.create', 'deals.update',
      'files.upload', 'files.download',
      'reports.read',
    ],
    'employee': [
      'vehicles.read', 'vehicles.create', 'vehicles.update',
      'clients.read', 'clients.create', 'clients.update',
      'deals.read', 'deals.create', 'deals.update',
      'files.upload', 'files.download',
    ],
    'readonly': [
      'vehicles.read',
      'clients.read',
      'deals.read',
      'files.download',
    ],
  };

  const userPermissions = permissions[role.toLowerCase() as keyof typeof permissions] || [];
  return userPermissions.includes('*') || userPermissions.includes(action);
}

// Query security logs (for admin dashboard)
export const getSecurityLogs = query({
  args: {
    dealershipId: v.optional(v.id("dealerships")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    // Validate user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== 'admin') {
      throw new ConvexError("Admin access required");
    }

    const limit = Math.min(args.limit || 50, 100);
    const offset = args.offset || 0;

    let query = ctx.db.query("security_logs");
    
    if (args.dealershipId) {
      // If dealership specified, validate access
      if (user.dealershipId !== args.dealershipId) {
        throw new ConvexError("Access denied");
      }
      query = query.filter((q) => q.eq(q.field("dealershipId"), args.dealershipId));
    } else if (user.dealershipId) {
      // Regular admin can only see their dealership logs
      query = query.filter((q) => q.eq(q.field("dealershipId"), user.dealershipId));
    }

    const logs = await query
      .order("desc")
      .take(limit + offset);

    return {
      logs: logs.slice(offset, offset + limit),
      hasMore: logs.length > offset + limit,
    };
  },
});

// Test function to verify module is working
export const testSecurity = internalMutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Security module test:", args.message);
    return { success: true, message: args.message };
  },
});