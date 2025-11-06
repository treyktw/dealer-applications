// convex/documents/debug.ts
// Debug utilities for inspecting document paths and identifying issues

import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  validateS3Key,
  cleanS3Key,
  isDealDocumentKey,
  isCustomDocumentKey,
  isTemplateKey,
  parseDealershipIdFromKey,
  parseDealIdFromKey,
  getFileExtension
} from "../lib/s3/document_paths";

/**
 * Debug document paths for a specific deal
 * Returns detailed information about S3 keys and their validity
 */
export const debugDocumentPaths = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documentInstances")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .collect();

    return documents.map(doc => {
      const s3Key = doc.s3Key || "";
      const validation = validateS3Key(s3Key);
      const cleanedKey = cleanS3Key(s3Key);

      return {
        documentId: doc._id,
        documentName: doc.name,
        status: doc.status,
        s3Key: s3Key,
        s3KeyLength: s3Key.length,
        endsWithPdf: s3Key.endsWith('.pdf'),
        hasExtraData: s3Key.includes('.pdf') && !s3Key.endsWith('.pdf'),
        isValid: validation.valid,
        validationError: validation.error,
        cleanedKey: cleanedKey,
        isDealDocument: isDealDocumentKey(s3Key),
        dealershipIdFromKey: parseDealershipIdFromKey(s3Key),
        dealIdFromKey: parseDealIdFromKey(s3Key),
        fileExtension: getFileExtension(s3Key),
        createdAt: doc._creationTime,
        updatedAt: doc.updatedAt,
      };
    });
  },
});

/**
 * Debug custom document paths for a specific deal
 */
export const debugCustomDocumentPaths = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("dealer_uploaded_documents")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .collect();

    return documents.map(doc => {
      const s3Key = doc.s3Key || "";
      const validation = validateS3Key(s3Key);
      const cleanedKey = cleanS3Key(s3Key);

      return {
        documentId: doc._id,
        documentName: doc.documentName,
        isActive: doc.isActive,
        s3Key: s3Key,
        s3KeyLength: s3Key.length,
        isValid: validation.valid,
        validationError: validation.error,
        cleanedKey: cleanedKey,
        isCustomDocument: isCustomDocumentKey(s3Key),
        dealershipIdFromKey: parseDealershipIdFromKey(s3Key),
        fileExtension: getFileExtension(s3Key),
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        createdAt: doc._creationTime,
        updatedAt: doc.updatedAt,
      };
    });
  },
});

/**
 * Debug all documents for a dealership
 * Finds all documents with invalid S3 keys
 */
export const debugDealershipDocuments = query({
  args: {
    dealershipId: v.id("dealerships"),
    onlyInvalid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get all document instances for the dealership
    const documents = await ctx.db
      .query("documentInstances")
      .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId))
      .collect();

    const results = documents.map(doc => {
      const s3Key = doc.s3Key || "";
      const validation = validateS3Key(s3Key);

      return {
        documentId: doc._id,
        dealId: doc.dealId,
        documentName: doc.name,
        status: doc.status,
        s3Key: s3Key,
        isValid: validation.valid,
        validationError: validation.error,
        cleanedKey: cleanS3Key(s3Key),
      };
    });

    // Filter to only invalid if requested
    if (args.onlyInvalid) {
      return results.filter(r => !r.isValid);
    }

    return results;
  },
});

/**
 * Debug all custom documents for a dealership
 */
export const debugDealershipCustomDocuments = query({
  args: {
    dealershipId: v.id("dealerships"),
    onlyInvalid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("dealer_uploaded_documents")
      .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId))
      .collect();

    const results = documents.map(doc => {
      const s3Key = doc.s3Key || "";
      const validation = validateS3Key(s3Key);

      return {
        documentId: doc._id,
        dealId: doc.dealId,
        documentName: doc.documentName,
        isActive: doc.isActive,
        s3Key: s3Key,
        isValid: validation.valid,
        validationError: validation.error,
        cleanedKey: cleanS3Key(s3Key),
      };
    });

    // Filter to only invalid if requested
    if (args.onlyInvalid) {
      return results.filter(r => !r.isValid);
    }

    return results;
  },
});

/**
 * Debug templates
 * Check all document templates for valid S3 keys
 */
export const debugTemplates = query({
  args: {
    dealershipId: v.optional(v.id("dealerships")),
    onlyInvalid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let templates: Doc<"documentTemplates">[];

    if (args.dealershipId) {
      templates = await ctx.db
        .query("documentTemplates")
        .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId))
        .collect();
    } else {
      templates = await ctx.db.query("documentTemplates").collect();
    }

    const results = templates.map(template => {
      const s3Key = template.s3Key || "";
      const validation = validateS3Key(s3Key);

      return {
        templateId: template._id,
        templateName: template.name,
        isActive: template.isActive,
        s3Key: s3Key,
        isValid: validation.valid,
        validationError: validation.error,
        cleanedKey: cleanS3Key(s3Key),
        isTemplate: isTemplateKey(s3Key),
        fileExtension: getFileExtension(s3Key),
      };
    });

    // Filter to only invalid if requested
    if (args.onlyInvalid) {
      return results.filter(r => !r.isValid);
    }

    return results;
  },
});

/**
 * Get statistics about document path issues across the platform
 */
export const getDocumentPathStatistics = query({
  args: {},
  handler: async (ctx) => {
    // Get all document instances
    const allDocuments = await ctx.db.query("documentInstances").collect();

    // Get all custom documents
    const allCustomDocuments = await ctx.db.query("dealer_uploaded_documents").collect();

    // Get all templates
    const allTemplates = await ctx.db.query("documentTemplates").collect();

    // Analyze document instances
    const documentStats = {
      total: allDocuments.length,
      withS3Key: allDocuments.filter(d => d.s3Key).length,
      withoutS3Key: allDocuments.filter(d => !d.s3Key).length,
      validKeys: 0,
      invalidKeys: 0,
      keysWithExtraData: 0,
    };

    allDocuments.forEach(doc => {
      if (doc.s3Key) {
        const validation = validateS3Key(doc.s3Key);
        if (validation.valid) {
          documentStats.validKeys++;
        } else {
          documentStats.invalidKeys++;
        }

        if (doc.s3Key.includes('.pdf') && !doc.s3Key.endsWith('.pdf')) {
          documentStats.keysWithExtraData++;
        }
      }
    });

    // Analyze custom documents
    const customDocumentStats = {
      total: allCustomDocuments.length,
      active: allCustomDocuments.filter(d => d.isActive).length,
      withS3Key: allCustomDocuments.filter(d => d.s3Key).length,
      validKeys: 0,
      invalidKeys: 0,
    };

    allCustomDocuments.forEach(doc => {
      if (doc.s3Key) {
        const validation = validateS3Key(doc.s3Key);
        if (validation.valid) {
          customDocumentStats.validKeys++;
        } else {
          customDocumentStats.invalidKeys++;
        }
      }
    });

    // Analyze templates
    const templateStats = {
      total: allTemplates.length,
      active: allTemplates.filter(t => t.isActive).length,
      withS3Key: allTemplates.filter(t => t.s3Key).length,
      validKeys: 0,
      invalidKeys: 0,
    };

    allTemplates.forEach(template => {
      if (template.s3Key) {
        const validation = validateS3Key(template.s3Key);
        if (validation.valid) {
          templateStats.validKeys++;
        } else {
          templateStats.invalidKeys++;
        }
      }
    });

    return {
      documentInstances: documentStats,
      customDocuments: customDocumentStats,
      templates: templateStats,
      summary: {
        totalDocuments: documentStats.total + customDocumentStats.total + templateStats.total,
        totalInvalidKeys: documentStats.invalidKeys + customDocumentStats.invalidKeys + templateStats.invalidKeys,
        percentageInvalid: ((documentStats.invalidKeys + customDocumentStats.invalidKeys + templateStats.invalidKeys) /
          (documentStats.total + customDocumentStats.total + templateStats.total) * 100).toFixed(2),
      },
    };
  },
});

/**
 * Find documents with specific path patterns
 */
export const findDocumentsByPathPattern = query({
  args: {
    pattern: v.string(), // e.g., "org/", ".pdf.pdf", etc.
  },
  handler: async (ctx, args) => {
    const allDocuments = await ctx.db.query("documentInstances").collect();

    const matches = allDocuments.filter(doc =>
      doc.s3Key && doc.s3Key.includes(args.pattern)
    );

    return matches.map(doc => ({
      documentId: doc._id,
      dealId: doc.dealId,
      dealershipId: doc.dealershipId,
      documentName: doc.name,
      s3Key: doc.s3Key,
      status: doc.status,
    }));
  },
});
