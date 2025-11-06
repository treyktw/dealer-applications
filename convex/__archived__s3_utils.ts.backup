// convex/lib/s3-utils.ts - Updated S3 Utilities with Org-Based Paths
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET_NAME, s3Client } from "../apps/web/src/lib/s3-client";

/**
 * S3 Path Structure:
 * org/{orgId}/docs/templates/{templateId}/template-v{version}.pdf
 * org/{orgId}/docs/instances/{dealId}/{documentId}.pdf
 * org/{orgId}/vehicles/{vin}/{imageId}.jpg
 * org/{orgId}/logos/{filename}
 * 
 * Legacy fallback:
 * {dealershipId}/{category}/{filename}
 */

export type S3Category = 
  | "doc-templates" 
  | "doc-instances" 
  | "vehicles" 
  | "logos" 
  | "profiles"
  | "custom-documents";

/**
 * Generate new org-based S3 path
 */
export function generateOrgPath(params: {
  orgId: string;
  category: S3Category;
  resourceId?: string;
  fileName: string;
  version?: number;
}): string {
  const { orgId, category, resourceId, fileName, version } = params;
  
  switch (category) {
    case "doc-templates":
      return `org/${orgId}/docs/templates/${resourceId}/${version ? `v${version}-` : ""}${fileName}`;
    
    case "doc-instances":
      return `org/${orgId}/docs/instances/${resourceId}/${fileName}`;
    
    case "vehicles":
      return `org/${orgId}/vehicles/${resourceId}/${fileName}`;
    
    case "logos":
      return `org/${orgId}/logos/${fileName}`;
    
    case "profiles":
      return `org/${orgId}/profiles/${fileName}`;
    
    case "custom-documents":
      return `org/${orgId}/custom-docs/${fileName}`;
    
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

/**
 * Generate legacy dealership-based path (for backward compatibility)
 */
export function generateLegacyPath(params: {
  dealershipId: string;
  category: "vehicles" | "logos" | "documents" | "profiles";
  fileName: string;
}): string {
  const { dealershipId, category, fileName } = params;
  return `${dealershipId}/${category}/${fileName}`;
}

/**
 * Content type validation
 */
const ALLOWED_CONTENT_TYPES: Record<S3Category, string[]> = {
  "doc-templates": ["application/pdf"],
  "doc-instances": ["application/pdf"],
  "vehicles": ["image/jpeg", "image/png", "image/webp"],
  "logos": ["image/jpeg", "image/png", "image/svg+xml"],
  "profiles": ["image/jpeg", "image/png"],
  "custom-documents": ["application/pdf", "image/jpeg", "image/png"],
};

/**
 * File size limits (in bytes)
 */
const SIZE_LIMITS: Record<S3Category, number> = {
  "doc-templates": 25 * 1024 * 1024,  // 25MB
  "doc-instances": 25 * 1024 * 1024,   // 25MB
  "vehicles": 10 * 1024 * 1024,        // 10MB
  "logos": 5 * 1024 * 1024,            // 5MB
  "profiles": 5 * 1024 * 1024,         // 5MB
  "custom-documents": 25 * 1024 * 1024, // 25MB
};

/**
 * Validate file upload parameters
 */
export function validateUpload(
  category: S3Category,
  contentType: string,
  fileSize: number
): void {
  // Check content type
  if (!ALLOWED_CONTENT_TYPES[category].includes(contentType)) {
    throw new Error(
      `Invalid content type ${contentType} for category ${category}. ` +
      `Allowed types: ${ALLOWED_CONTENT_TYPES[category].join(", ")}`
    );
  }

  // Check file size
  if (fileSize > SIZE_LIMITS[category]) {
    const limitMB = SIZE_LIMITS[category] / (1024 * 1024);
    throw new Error(
      `File size ${(fileSize / (1024 * 1024)).toFixed(2)}MB exceeds ` +
      `limit of ${limitMB}MB for category ${category}`
    );
  }
}

/**
 * Sanitize filename for S3
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const sanitized = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ext = sanitized.split(".").pop();
  const nameWithoutExt = sanitized.replace(`.${ext}`, "");
  
  return `${timestamp}-${randomId}-${nameWithoutExt}.${ext}`;
}

/**
 * Generate presigned URL for upload (PUT)
 */
export async function generateUploadUrl(params: {
  s3Key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 15 minutes
}): Promise<string> {
  const { s3Key, contentType, expiresIn = 900 } = params;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate presigned URL for download (GET)
 */
export async function generateDownloadUrl(params: {
  s3Key: string;
  expiresIn?: number; // seconds, default 5 minutes
}): Promise<string> {
  const { s3Key, expiresIn = 300 } = params;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete file from S3
 */
export async function deleteFile(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);
}

/**
 * High-level helper: Generate upload URL for template
 */
export async function generateTemplateUploadUrl(params: {
  orgId: string;
  templateId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  version: number;
}): Promise<{ uploadUrl: string; s3Key: string }> {
  const { orgId, templateId, fileName, contentType, fileSize, version } = params;

  // Validate
  validateUpload("doc-templates", contentType, fileSize);

  // Generate path
  const uniqueFileName = generateUniqueFileName(fileName);
  const s3Key = generateOrgPath({
    orgId,
    category: "doc-templates",
    resourceId: templateId,
    fileName: uniqueFileName,
    version,
  });

  // Generate presigned URL
  const uploadUrl = await generateUploadUrl({
    s3Key,
    contentType,
    expiresIn: 900, // 15 minutes
  });

  return { uploadUrl, s3Key };
}

/**
 * High-level helper: Generate upload URL for document instance
 */
export async function generateDocumentInstanceUploadUrl(params: {
  orgId: string;
  dealId: string;
  documentId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; s3Key: string }> {
  const { orgId, dealId, documentId, fileName, contentType, fileSize } = params;

  // Validate
  validateUpload("doc-instances", contentType, fileSize);

  // Generate path
  const uniqueFileName =  `${fileName}` + `${documentId}.pdf`;
  const s3Key = generateOrgPath({
    orgId,
    category: "doc-instances",
    resourceId: dealId,
    fileName: uniqueFileName,
  });

  // Generate presigned URL
  const uploadUrl = await generateUploadUrl({
    s3Key,
    contentType,
    expiresIn: 900,
  });

  return { uploadUrl, s3Key };
}

/**
 * High-level helper: Generate upload URL for vehicle image
 */
export async function generateVehicleImageUploadUrl(params: {
  orgId: string;
  vin: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; s3Key: string }> {
  const { orgId, vin, fileName, contentType, fileSize } = params;

  // Validate
  validateUpload("vehicles", contentType, fileSize);

  // Generate path
  const uniqueFileName = generateUniqueFileName(fileName);
  const s3Key = generateOrgPath({
    orgId,
    category: "vehicles",
    resourceId: vin,
    fileName: uniqueFileName,
  });

  // Generate presigned URL
  const uploadUrl = await generateUploadUrl({
    s3Key,
    contentType,
    expiresIn: 900,
  });

  return { uploadUrl, s3Key };
}

/**
 * High-level helper: Get download URL for any S3 key
 */
export async function getDownloadUrl(s3Key: string): Promise<string> {
  return await generateDownloadUrl({
    s3Key,
    expiresIn: 300, // 5 minutes
  });
}

/**
 * Migration helper: Convert legacy path to new org path
 */
export function convertLegacyToOrgPath(
  legacyPath: string,
  orgId: string
): string | null {
  // Parse legacy path: {dealershipId}/{category}/{filename}
  const parts = legacyPath.split("/");
  if (parts.length !== 3) return null;

  const [, category, fileName] = parts;

  // Map to new category
  let newCategory: S3Category;
  switch (category) {
    case "vehicles":
      newCategory = "vehicles";
      break;
    case "documents":
      newCategory = "custom-documents";
      break;
    case "logos":
      newCategory = "logos";
      break;
    case "profiles":
      newCategory = "profiles";
      break;
    default:
      return null;
  }

  // For vehicles, we need the VIN from filename or return null
  if (newCategory === "vehicles") {
    return `org/${orgId}/vehicles/unknown/${fileName}`;
  }

  return generateOrgPath({
    orgId,
    category: newCategory,
    fileName,
  });
}