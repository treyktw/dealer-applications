/**
 * Cleanup utilities for data retention and S3 document management
 *
 * Retention policies:
 * - Active/Pending deals: 6 months (180 days)
 * - Rejected deals: 3 months (90 days)
 * - Approved/Completed deals: 1 year (365 days)
 * - Notifications: 90 days
 */

import { internalMutation } from "../_generated/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "../../apps/web/src/lib/s3-client";
import {
  isDealDocumentKey,
  isCustomDocumentKey,
  parseDealIdFromKey,
} from "./s3/document_paths";

// Retention periods in milliseconds
const RETENTION_PERIODS = {
  ACTIVE_PENDING: 180 * 24 * 60 * 60 * 1000, // 6 months
  REJECTED: 90 * 24 * 60 * 60 * 1000, // 3 months
  APPROVED_COMPLETED: 365 * 24 * 60 * 60 * 1000, // 1 year
  NOTIFICATIONS: 90 * 24 * 60 * 60 * 1000, // 90 days
};

// Deal status categories
const STATUS_CATEGORIES = {
  ACTIVE_PENDING: [
    "DRAFT",
    "draft",
    "PENDING_APPROVAL",
    "DOCS_GENERATING",
    "DOCS_READY",
    "AWAITING_SIGNATURES",
    "PARTIALLY_SIGNED",
    "FINANCING_PENDING",
    "ON_HOLD",
    "on_hold",
  ],
  REJECTED: ["CANCELLED", "VOID", "FINANCING_DECLINED"],
  APPROVED_COMPLETED: [
    "APPROVED",
    "COMPLETED",
    "completed",
    "DELIVERED",
    "FINALIZED",
    "FINANCING_APPROVED",
  ],
};

/**
 * Get retention period for a deal based on its status
 */
function getRetentionPeriod(status: string): number {
  if (STATUS_CATEGORIES.ACTIVE_PENDING.includes(status)) {
    return RETENTION_PERIODS.ACTIVE_PENDING;
  }
  if (STATUS_CATEGORIES.REJECTED.includes(status)) {
    return RETENTION_PERIODS.REJECTED;
  }
  if (STATUS_CATEGORIES.APPROVED_COMPLETED.includes(status)) {
    return RETENTION_PERIODS.APPROVED_COMPLETED;
  }
  // Default to active/pending
  return RETENTION_PERIODS.ACTIVE_PENDING;
}

/**
 * Delete a file from S3
 */
async function deleteFromS3(s3Key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    await s3Client.send(command);
    console.log(`Deleted S3 object: ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`Error deleting S3 object ${s3Key}:`, error);
    return false;
  }
}

/**
 * Clean up deal documents based on retention policies
 * Runs daily to check for expired deals and delete their S3 documents
 */
export const cleanupDealDocuments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let totalDealsProcessed = 0;
    let totalDocumentsDeleted = 0;
    let totalS3ObjectsDeleted = 0;

    console.log(`Starting deal document cleanup at ${new Date(now).toISOString()}`);

    // Query all deals
    const deals = await ctx.db.query("deals").collect();

    for (const deal of deals) {
      const retentionPeriod = getRetentionPeriod(deal.status);
      const dealAge = now - deal.updatedAt;

      // Check if deal has exceeded retention period
      if (dealAge > retentionPeriod) {
        totalDealsProcessed++;

        console.log(
          `Processing deal ${deal._id} (status: ${deal.status}, age: ${Math.floor(dealAge / (24 * 60 * 60 * 1000))} days)`
        );

        // Get all documents for this deal
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_deal", (q) => q.eq("dealId", deal._id))
          .collect();

        for (const document of documents) {
          // Delete from S3 if documentUrl exists and is a deal document
          if (document.documentUrl && isDealDocumentKey(document.documentUrl)) {
            const deleted = await deleteFromS3(document.documentUrl);
            if (deleted) {
              totalS3ObjectsDeleted++;
            }
          }

          // Delete document record from database
          await ctx.db.delete(document._id);
          totalDocumentsDeleted++;
        }

        // Get all file uploads for this deal
        const fileUploads = await ctx.db
          .query("file_uploads")
          .withIndex("by_category", (q) => q.eq("category", "custom_documents"))
          .collect();

        for (const file of fileUploads) {
          // Check if this file belongs to the deal using proper path parsing
          if (file.s3Key && isCustomDocumentKey(file.s3Key)) {
            const dealIdFromKey = parseDealIdFromKey(file.s3Key);
            if (dealIdFromKey === deal._id) {
              const deleted = await deleteFromS3(file.s3Key);
              if (deleted) {
                totalS3ObjectsDeleted++;
              }

              // Delete file record
              await ctx.db.delete(file._id);
            }
          }
        }

        console.log(`Cleaned up deal ${deal._id}`);
      }
    }

    const summary = {
      timestamp: new Date(now).toISOString(),
      dealsProcessed: totalDealsProcessed,
      documentsDeleted: totalDocumentsDeleted,
      s3ObjectsDeleted: totalS3ObjectsDeleted,
    };

    console.log("Deal document cleanup completed:", summary);
    return summary;
  },
});

/**
 * Clean up old notifications
 * Deletes notifications older than 90 days or past their expiresAt timestamp
 */
export const cleanupNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - RETENTION_PERIODS.NOTIFICATIONS;
    let deletedCount = 0;

    console.log(`Starting notification cleanup at ${new Date(now).toISOString()}`);

    // Get all notifications
    const notifications = await ctx.db.query("notifications").collect();

    for (const notification of notifications) {
      let shouldDelete = false;

      // Delete if expired
      if (notification.expiresAt && notification.expiresAt < now) {
        shouldDelete = true;
      }
      // Delete if older than 90 days
      else if (notification.createdAt < cutoffTime) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        await ctx.db.delete(notification._id);
        deletedCount++;
      }
    }

    const summary = {
      timestamp: new Date(now).toISOString(),
      notificationsDeleted: deletedCount,
      cutoffDate: new Date(cutoffTime).toISOString(),
    };

    console.log("Notification cleanup completed:", summary);
    return summary;
  },
});

/**
 * Clean up old security logs
 * Keeps last 90 days of logs
 */
export const cleanupSecurityLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - RETENTION_PERIODS.NOTIFICATIONS; // 90 days
    let deletedCount = 0;

    console.log(`Starting security log cleanup at ${new Date(now).toISOString()}`);

    // Query old logs
    const oldLogs = await ctx.db
      .query("security_logs")
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    const summary = {
      timestamp: new Date(now).toISOString(),
      logsDeleted: deletedCount,
      cutoffDate: new Date(cutoffTime).toISOString(),
    };

    console.log("Security log cleanup completed:", summary);
    return summary;
  },
});

/**
 * Clean up expired rate limit entries
 * Removes entries older than 1 hour
 */
export const cleanupRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - 60 * 60 * 1000; // 1 hour
    let deletedCount = 0;

    console.log(`Starting rate limit cleanup at ${new Date(now).toISOString()}`);

    // Query old rate limit entries
    const oldEntries = await ctx.db
      .query("rate_limits")
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }

    const summary = {
      timestamp: new Date(now).toISOString(),
      entriesDeleted: deletedCount,
      cutoffDate: new Date(cutoffTime).toISOString(),
    };

    console.log("Rate limit cleanup completed:", summary);
    return summary;
  },
});
