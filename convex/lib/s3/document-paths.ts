// convex/lib/s3/document-paths.ts
// Central S3 path generator for all document types
// Ensures consistent naming across the application

import type { Id } from "../../_generated/dataModel";

/**
 * Generate S3 key for deal documents
 * Format: dealerships/{dealershipId}/deals/{dealId}/documents/{documentId}.{extension}
 */
export function generateDealDocumentPath(
  dealershipId: Id<"dealerships">,
  dealId: Id<"deals">,
  documentId: string,
  extension: string = "pdf"
): string {
  return `dealerships/${dealershipId}/deals/${dealId}/documents/${documentId}.${extension}`;
}

/**
 * Generate S3 key for custom documents
 * Format: dealerships/{dealershipId}/custom-documents/{dealId}/{fileName}
 */
export function generateCustomDocumentPath(
  dealershipId: Id<"dealerships">,
  dealId: Id<"deals">,
  fileName: string
): string {
  return `dealerships/${dealershipId}/custom-documents/${dealId}/${fileName}`;
}

/**
 * Generate S3 key for document templates
 * Format: dealerships/{dealershipId}/templates/{templateId}.{extension}
 */
export function generateTemplatePath(
  dealershipId: Id<"dealerships">,
  templateId: string,
  extension: string = "pdf"
): string {
  return `dealerships/${dealershipId}/templates/${templateId}.${extension}`;
}

/**
 * Generate S3 key for document pack files
 * Format: dealerships/{dealershipId}/document-packs/{packId}/{fileName}
 */
export function generateDocumentPackPath(
  dealershipId: Id<"dealerships">,
  packId: string,
  fileName: string
): string {
  return `dealerships/${dealershipId}/document-packs/${packId}/${fileName}`;
}

/**
 * Generate S3 key for marketplace document packs (master uploads)
 * Format: marketplace/document-packs/{packId}/{fileName}
 */
export function generateMarketplacePackPath(
  packId: string,
  fileName: string
): string {
  return `marketplace/document-packs/${packId}/${fileName}`;
}

/**
 * Validate S3 key format and structure
 * Returns validation result with error message if invalid
 */
export function validateS3Key(key: string): { valid: boolean; error?: string } {
  if (!key || key.trim() === "") {
    return { valid: false, error: "S3 key cannot be empty" };
  }

  const cleanKey = key.trim();

  // Check for invalid path structure
  if (cleanKey.includes("//") || cleanKey.startsWith("/")) {
    return { valid: false, error: "S3 key contains invalid path structure (double slashes or leading slash)" };
  }

  // Check for valid file extension
  if (!cleanKey.match(/\.(pdf|png|jpg|jpeg|gif|doc|docx|xlsx|xls|csv|txt)$/i)) {
    return { valid: false, error: "S3 key must have a valid file extension" };
  }

  // Check path length
  if (cleanKey.length > 1024) {
    return { valid: false, error: "S3 key exceeds maximum length (1024 characters)" };
  }

  return { valid: true };
}

/**
 * Clean S3 key by removing extra slashes and trimming whitespace
 */
export function cleanS3Key(key: string): string {
  return key.trim().replace(/\/+/g, "/");
}

/**
 * Parse dealership ID from S3 key
 * Returns null if path format is invalid
 */
export function parseDealershipIdFromKey(key: string): string | null {
  const match = key.match(/^dealerships\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Parse deal ID from S3 key
 * Returns null if path format is invalid
 */
export function parseDealIdFromKey(key: string): string | null {
  const match = key.match(/\/deals\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Get file extension from S3 key
 */
export function getFileExtension(key: string): string {
  const match = key.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Check if S3 key is for a deal document
 */
export function isDealDocumentKey(key: string): boolean {
  return key.includes("/deals/") && key.includes("/documents/");
}

/**
 * Check if S3 key is for a custom document
 */
export function isCustomDocumentKey(key: string): boolean {
  return key.includes("/custom-documents/");
}

/**
 * Check if S3 key is for a template
 */
export function isTemplateKey(key: string): boolean {
  return key.includes("/templates/");
}

/**
 * Check if S3 key is for a document pack
 */
export function isDocumentPackKey(key: string): boolean {
  return key.includes("/document-packs/");
}
