/**
 * Audit Logging - Convex Functions
 * Centralized audit trail for compliance and security
 */

import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createAuditLogEntry,
  formatChanges,
  AuditCategory,
  AuditAction,
  AuditStatus,
  AuditSeverity,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditReportTypeType,
  AuditReportType,
} from "./lib/audit/auditLogger";

/**
 * Log an audit event
 * Main entry point for all audit logging
 */
export const logAuditEvent = action({
  args: {
    category: v.string(),
    action: v.string(),
    userId: v.string(),
    description: v.string(),
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    dealershipId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    resourceName: v.optional(v.string()),
    details: v.optional(v.any()),
    changesBefore: v.optional(v.any()),
    changesAfter: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    device: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create audit log entry with auto-filled fields
    const entry = createAuditLogEntry({
      category: args.category as any,
      action: args.action as any,
      userId: args.userId,
      description: args.description,
      status: args.status as any,
      severity: args.severity as any,
      userEmail: args.userEmail,
      userName: args.userName,
      dealershipId: args.dealershipId,
      sessionId: args.sessionId,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      resourceName: args.resourceName,
      details: args.details,
      changesBefore: args.changesBefore,
      changesAfter: args.changesAfter,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      device: args.device,
      errorMessage: args.errorMessage,
      errorCode: args.errorCode,
    });

    // Store in database
    await ctx.runMutation(internal.auditLog.storeAuditLog, {
      entry,
    });

    return { success: true };
  },
});

/**
 * Log user activity (simplified wrapper)
 */
export const logUserActivity = action({
  args: {
    userId: v.string(),
    action: v.string(),
    description: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    dealershipId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.auditLog.logAuditEvent, {
      category: AuditCategory.USER,
      action: args.action,
      userId: args.userId,
      description: args.description,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      dealershipId: args.dealershipId,
      ipAddress: args.ipAddress,
    });
  },
});

/**
 * Log data access (PII/sensitive data)
 */
export const logDataAccess = action({
  args: {
    userId: v.string(),
    dataType: v.string(), // "ssn", "credit_card", "pii", etc.
    action: v.string(), // "read", "create", "update", "delete"
    resourceId: v.string(),
    reason: v.optional(v.string()),
    dealershipId: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.auditLog.logAuditEvent, {
      category:
        args.action === "read"
          ? AuditCategory.DATA_PII_READ
          : args.action === "create"
          ? AuditCategory.DATA_PII_CREATE
          : args.action === "update"
          ? AuditCategory.DATA_PII_UPDATE
          : AuditCategory.DATA_PII_DELETE,
      action: args.action,
      userId: args.userId,
      description: `Accessed ${args.dataType} data${
        args.reason ? `: ${args.reason}` : ""
      }`,
      resourceType: args.dataType,
      resourceId: args.resourceId,
      dealershipId: args.dealershipId,
      ipAddress: args.ipAddress,
      details: {
        reason: args.reason,
      },
    });
  },
});

/**
 * Log resource update with before/after changes
 */
export const logResourceUpdate = action({
  args: {
    userId: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    resourceName: v.optional(v.string()),
    before: v.any(),
    after: v.any(),
    dealershipId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Format changes
    const changes = formatChanges(args.before, args.after);

    return await ctx.runAction(internal.auditLog.logAuditEvent, {
      category: `${args.resourceType}.update`,
      action: AuditAction.UPDATE,
      userId: args.userId,
      description: `Updated ${args.resourceType}${
        args.resourceName ? ` "${args.resourceName}"` : ""
      }`,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      resourceName: args.resourceName,
      changesBefore: changes.changesBefore,
      changesAfter: changes.changesAfter,
      details: {
        changedFields: changes.changedFields,
      },
      dealershipId: args.dealershipId,
      ipAddress: args.ipAddress,
    });
  },
});

/**
 * Query audit logs with filters
 */
export const queryAuditLogs = query({
  args: {
    userId: v.optional(v.string()),
    dealershipId: v.optional(v.string()),
    category: v.optional(v.string()),
    action: v.optional(v.string()),
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 500);

    // Build query based on primary index
    let query;

    if (args.userId) {
      query = ctx.db
        .query("audit_logs")
        .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId));
    } else if (args.dealershipId) {
      query = ctx.db
        .query("audit_logs")
        .withIndex("by_dealership_timestamp", (q) =>
          q.eq("dealershipId", args.dealershipId)
        );
    } else if (args.category) {
      query = ctx.db
        .query("audit_logs")
        .withIndex("by_category_timestamp", (q) =>
          q.eq("category", args.category)
        );
    } else {
      query = ctx.db.query("audit_logs").withIndex("by_timestamp");
    }

    // Get logs
    let logs = await query.order("desc").take(limit * 2); // Get extra for filtering

    // Apply additional filters
    if (args.action) {
      logs = logs.filter((log) => log.action === args.action);
    }
    if (args.status) {
      logs = logs.filter((log) => log.status === args.status);
    }
    if (args.severity) {
      logs = logs.filter((log) => log.severity === args.severity);
    }
    if (args.resourceType) {
      logs = logs.filter((log) => log.resourceType === args.resourceType);
    }
    if (args.resourceId) {
      logs = logs.filter((log) => log.resourceId === args.resourceId);
    }
    if (args.startDate) {
      logs = logs.filter((log) => log.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((log) => log.timestamp <= args.endDate!);
    }

    // Limit results
    return logs.slice(0, limit);
  },
});

/**
 * Get audit logs for a specific resource
 */
export const getResourceAuditTrail = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 500);

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_resource", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get recent activity for a user
 */
export const getUserRecentActivity = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get security events
 */
export const getSecurityEvents = query({
  args: {
    dealershipId: v.optional(v.string()),
    severity: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 500);

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_category")
      .order("desc")
      .collect();

    // Filter for security events
    const securityLogs = logs.filter(
      (log) =>
        log.category.startsWith("security") || log.category.startsWith("auth")
    );

    // Apply additional filters
    let filtered = securityLogs;

    if (args.dealershipId) {
      filtered = filtered.filter(
        (log) => log.dealershipId === args.dealershipId
      );
    }

    if (args.severity) {
      filtered = filtered.filter((log) => log.severity === args.severity);
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Generate compliance report
 */
export const generateComplianceReport = query({
  args: {
    dealershipId: v.optional(v.string()),
    complianceFlag: v.string(), // "HIPAA", "GDPR", "SOX", "PCI"
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all logs in date range
    const allLogs = await ctx.db
      .query("audit_logs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Filter by date range and compliance flag
    const relevantLogs = allLogs.filter(
      (log) =>
        log.timestamp >= args.startDate &&
        log.timestamp <= args.endDate &&
        log.complianceFlags?.includes(args.complianceFlag) &&
        (!args.dealershipId || log.dealershipId === args.dealershipId)
    );

    // Generate statistics
    const stats = {
      totalEvents: relevantLogs.length,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      failedEvents: relevantLogs.filter((l) => l.status === "failure").length,
      criticalEvents: relevantLogs.filter((l) => l.severity === "critical")
        .length,
    };

    // Count by status
    for (const log of relevantLogs) {
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
    }

    return {
      complianceFlag: args.complianceFlag,
      period: {
        start: args.startDate,
        end: args.endDate,
      },
      stats,
      events: relevantLogs,
    };
  },
});

/**
 * Get audit statistics for dashboard
 */
export const getAuditStatistics = query({
  args: {
    dealershipId: v.optional(v.string()),
    timeRange: v.optional(v.number()), // Last N milliseconds (default: 30 days)
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 30 * 24 * 60 * 60 * 1000; // 30 days
    const startTime = Date.now() - timeRange;

    // Get recent logs
    const allLogs = await ctx.db
      .query("audit_logs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Filter by time and dealership
    const recentLogs = allLogs.filter(
      (log) =>
        log.timestamp >= startTime &&
        (!args.dealershipId || log.dealershipId === args.dealershipId)
    );

    // Calculate statistics
    const stats = {
      totalEvents: recentLogs.length,
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      securityEvents: 0,
      failedActions: 0,
      criticalEvents: 0,
      piiAccess: 0,
      uniqueUsers: new Set<string>(),
    };

    for (const log of recentLogs) {
      // Count by category
      stats.byCategory[log.category] =
        (stats.byCategory[log.category] || 0) + 1;

      // Count by status
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;

      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

      // Special counts
      if (log.category.startsWith("security")) {
        stats.securityEvents++;
      }
      if (log.status === "failure") {
        stats.failedActions++;
      }
      if (log.severity === "critical" || log.severity === "alert") {
        stats.criticalEvents++;
      }
      if (log.category.includes("pii")) {
        stats.piiAccess++;
      }

      // Track unique users
      stats.uniqueUsers.add(log.userId);
    }

    return {
      ...stats,
      uniqueUsers: stats.uniqueUsers.size,
      timeRange: {
        start: startTime,
        end: Date.now(),
      },
    };
  },
});

/**
 * Clean up expired audit logs
 * Should be run periodically (e.g., daily cron job)
 */
export const cleanupExpiredAuditLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get expired logs
    const allLogs = await ctx.db.query("audit_logs").collect();

    let deletedCount = 0;

    for (const log of allLogs) {
      // Check if log has expired
      if (log.expiresAt && log.expiresAt < now) {
        await ctx.db.delete(log._id);
        deletedCount++;
      }
    }

    console.log(`🗑️ Cleaned up ${deletedCount} expired audit logs`);
    return { deletedCount };
  },
});

/**
 * Export audit logs for compliance
 * Returns data in structured format for external archiving
 */
export const exportAuditLogs = query({
  args: {
    dealershipId: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    category: v.optional(v.string()),
    complianceFlag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get logs in date range
    const allLogs = await ctx.db
      .query("audit_logs")
      .withIndex("by_timestamp")
      .collect();

    // Filter logs
    const logs = allLogs.filter(
      (log) =>
        log.timestamp >= args.startDate &&
        log.timestamp <= args.endDate &&
        (!args.dealershipId || log.dealershipId === args.dealershipId) &&
        (!args.category || log.category === args.category) &&
        (!args.complianceFlag ||
          log.complianceFlags?.includes(args.complianceFlag))
    );

    // Format for export
    return {
      exportDate: Date.now(),
      period: {
        start: args.startDate,
        end: args.endDate,
      },
      filters: {
        dealershipId: args.dealershipId,
        category: args.category,
        complianceFlag: args.complianceFlag,
      },
      totalRecords: logs.length,
      logs: logs.map((log) => ({
        ...log,
        _id: undefined, // Remove internal ID
        _creationTime: undefined,
      })),
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const storeAuditLog = internalMutation({
  args: {
    entry: v.any(),
  },
  handler: async (ctx, args) => {
    const entry = args.entry as AuditLogEntry;
    const now = Date.now();

    // Calculate expiration date
    const retentionMs = entry.retentionYears * 365 * 24 * 60 * 60 * 1000;
    const expiresAt = now + retentionMs;

    // Extract changed fields if present
    const changedFields =
      entry.changesBefore && entry.changesAfter
        ? Object.keys(entry.changesAfter).filter(
            (key) =>
              JSON.stringify(entry.changesBefore![key]) !==
              JSON.stringify(entry.changesAfter![key])
          )
        : undefined;

    await ctx.db.insert("audit_logs", {
      category: entry.category,
      action: entry.action,
      status: entry.status,
      severity: entry.severity,
      userId: entry.userId,
      userEmail: entry.userEmail,
      userName: entry.userName,
      dealershipId: entry.dealershipId,
      sessionId: entry.sessionId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      resourceName: entry.resourceName,
      description: entry.description,
      details: entry.details,
      changesBefore: entry.changesBefore,
      changesAfter: entry.changesAfter,
      changedFields,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      device: entry.device,
      location: entry.location,
      complianceFlags: entry.complianceFlags,
      retentionYears: entry.retentionYears,
      expiresAt,
      errorMessage: entry.errorMessage,
      errorCode: entry.errorCode,
      stackTrace: entry.stackTrace,
      timestamp: entry.timestamp,
      createdAt: now,
    });
  },
});
