// convex/lib/s3/index.ts
// Central export for all S3 utilities

// Client
export { s3Client, BUCKET_NAME, REGION, testS3Connection } from "./client";

// Path generation
export {
  generateS3Key,
  parseS3Key,
  sanitizePathSegment,
  sanitizeFileName,
  generateUniqueFileName,
  convertLegacyToOrgPath,
  type S3Category,
} from "./paths";

// Presigned URLs
export {
  generateUploadUrl,
  generateDownloadUrl,
  generateViewUrl,
  batchGenerateDownloadUrls,
} from "./presign";

// Validation
export {
  validateUpload,
  validateUploadDetailed,
  isContentTypeAllowed,
  getMaxFileSize,
  getMaxFileSizeDisplay,
  validateFileExtension,
  formatFileSize,
  ALLOWED_CONTENT_TYPES,
  SIZE_LIMITS,
  type ValidationResult,
} from "./validation";

// Operations
export {
  deleteFile,
  deleteFiles,
  copyFile,
  fileExists,
  listFiles,
  getFileSize,
  getFileMetadata,
} from "./operations";
