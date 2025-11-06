// convex/lib/s3/validation.ts
// File upload validation (content type, size limits, etc.)

import type { S3Category } from "./paths";

/**
 * Allowed content types by category
 */
export const ALLOWED_CONTENT_TYPES: Record<S3Category, string[]> = {
  "doc-templates": ["application/pdf"],
  "doc-instances": ["application/pdf"],
  "vehicles": ["image/jpeg", "image/png", "image/webp", "image/jpg"],
  "logos": ["image/jpeg", "image/png", "image/svg+xml", "image/jpg"],
  "profiles": ["image/jpeg", "image/png", "image/jpg"],
  "custom-documents": [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc
  ],
};

/**
 * File size limits by category (in bytes)
 */
export const SIZE_LIMITS: Record<S3Category, number> = {
  "doc-templates": 25 * 1024 * 1024, // 25MB
  "doc-instances": 25 * 1024 * 1024, // 25MB
  "vehicles": 10 * 1024 * 1024, // 10MB
  "logos": 5 * 1024 * 1024, // 5MB
  "profiles": 5 * 1024 * 1024, // 5MB
  "custom-documents": 25 * 1024 * 1024, // 25MB
};

/**
 * Validate file upload parameters
 *
 * @throws Error if validation fails
 */
export function validateUpload(
  category: S3Category,
  contentType: string,
  fileSize: number
): void {
  // Validate content type
  const allowedTypes = ALLOWED_CONTENT_TYPES[category];

  if (!allowedTypes.includes(contentType)) {
    throw new Error(
      `Invalid content type "${contentType}" for category "${category}". ` +
        `Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Validate file size
  const maxSize = SIZE_LIMITS[category];

  if (fileSize > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    throw new Error(
      `File size ${fileSizeMB}MB exceeds limit of ${maxSizeMB}MB for category "${category}"`
    );
  }

  // Validate file size is not zero
  if (fileSize === 0) {
    throw new Error("File size cannot be zero");
  }
}

/**
 * Check if content type is allowed for a category
 */
export function isContentTypeAllowed(
  category: S3Category,
  contentType: string
): boolean {
  return ALLOWED_CONTENT_TYPES[category].includes(contentType);
}

/**
 * Get max file size for a category
 */
export function getMaxFileSize(category: S3Category): number {
  return SIZE_LIMITS[category];
}

/**
 * Get max file size in human-readable format
 */
export function getMaxFileSizeDisplay(category: S3Category): string {
  const bytes = SIZE_LIMITS[category];
  const mb = bytes / 1024 / 1024;

  return `${mb}MB`;
}

/**
 * Validate that a file extension matches its content type
 */
export function validateFileExtension(
  fileName: string,
  contentType: string
): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension) {
    return false;
  }

  // Map of extensions to content types
  const extensionMap: Record<string, string[]> = {
    pdf: ["application/pdf"],
    jpg: ["image/jpeg", "image/jpg"],
    jpeg: ["image/jpeg", "image/jpg"],
    png: ["image/png"],
    webp: ["image/webp"],
    svg: ["image/svg+xml"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    doc: ["application/msword"],
  };

  const expectedTypes = extensionMap[extension];

  if (!expectedTypes) {
    return false; // Unknown extension
  }

  return expectedTypes.includes(contentType);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate upload with detailed error messages
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateUploadDetailed(
  category: S3Category,
  contentType: string,
  fileSize: number,
  fileName: string
): ValidationResult {
  const errors: string[] = [];

  // Check content type
  if (!isContentTypeAllowed(category, contentType)) {
    errors.push(
      `Content type "${contentType}" not allowed. ` +
        `Allowed: ${ALLOWED_CONTENT_TYPES[category].join(", ")}`
    );
  }

  // Check file size
  const maxSize = getMaxFileSize(category);
  if (fileSize > maxSize) {
    errors.push(
      `File size ${formatFileSize(fileSize)} exceeds limit of ${getMaxFileSizeDisplay(category)}`
    );
  }

  if (fileSize === 0) {
    errors.push("File is empty");
  }

  // Check extension matches content type
  if (!validateFileExtension(fileName, contentType)) {
    errors.push(
      `File extension does not match content type "${contentType}"`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
