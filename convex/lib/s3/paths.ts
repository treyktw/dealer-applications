// convex/lib/s3/paths.ts
//
// DEPRECATED FOR DOCUMENTS: This file uses the old org-based path structure
//
// For document paths, use the NEW centralized path generator:
// See: convex/lib/s3/document-paths.ts
//
// This file is still used for non-document assets (vehicles, logos, profiles)
// but should eventually be migrated to dealership-based paths for consistency
//
// S3 path generation utilities
// Always uses org-based structure for consistency

export type S3Category =
  | "doc-templates"
  | "doc-instances"
  | "vehicles"
  | "logos"
  | "profiles"
  | "custom-documents";

/**
 * Generate S3 key using org-based structure
 *
 * Path format: org/{orgId}/{category}/{resourceId}/{fileName}
 *
 * Examples:
 * - org/org123/docs/templates/bill-of-sale/v1-template.pdf
 * - org/org123/docs/instances/deal456/doc789.pdf
 * - org/org123/vehicles/vin123/photo1.jpg
 * - org/org123/logos/dealership-logo.png
 */
export function generateS3Key(params: {
  orgId: string;
  category: S3Category;
  resourceId?: string;
  fileName: string;
  version?: number;
}): string {
  const { orgId, category, resourceId, fileName, version } = params;

  // Sanitize inputs
  const sanitizedOrgId = sanitizePathSegment(orgId);
  const sanitizedFileName = sanitizeFileName(fileName);
  const sanitizedResourceId = resourceId ? sanitizePathSegment(resourceId) : undefined;

  switch (category) {
    case "doc-templates":
      if (!sanitizedResourceId) {
        throw new Error("resourceId required for doc-templates");
      }
      const versionPrefix = version ? `v${version}-` : "";
      return `org/${sanitizedOrgId}/docs/templates/${sanitizedResourceId}/${versionPrefix}${sanitizedFileName}`;

    case "doc-instances":
      if (!sanitizedResourceId) {
        throw new Error("resourceId (dealId) required for doc-instances");
      }
      return `org/${sanitizedOrgId}/docs/instances/${sanitizedResourceId}/${sanitizedFileName}`;

    case "vehicles":
      if (!sanitizedResourceId) {
        throw new Error("resourceId (VIN) required for vehicles");
      }
      return `org/${sanitizedOrgId}/vehicles/${sanitizedResourceId}/${sanitizedFileName}`;

    case "logos":
      return `org/${sanitizedOrgId}/logos/${sanitizedFileName}`;

    case "profiles":
      return `org/${sanitizedOrgId}/profiles/${sanitizedFileName}`;

    case "custom-documents":
      if (sanitizedResourceId) {
        return `org/${sanitizedOrgId}/custom-docs/${sanitizedResourceId}/${sanitizedFileName}`;
      }
      return `org/${sanitizedOrgId}/custom-docs/${sanitizedFileName}`;

    default:
      throw new Error(`Unknown S3 category: ${category}`);
  }
}

/**
 * Parse an S3 key to extract components
 */
export function parseS3Key(s3Key: string): {
  orgId: string | null;
  category: S3Category | null;
  resourceId: string | null;
  fileName: string;
  isOrgBased: boolean;
} {
  const segments = s3Key.split("/");

  // Check if org-based path
  if (segments[0] === "org" && segments.length >= 3) {
    const orgId = segments[1];
    const fileName = segments[segments.length - 1];

    // Determine category
    let category: S3Category | null = null;
    let resourceId: string | null = null;

    if (segments[2] === "docs") {
      if (segments[3] === "templates") {
        category = "doc-templates";
        resourceId = segments[4] || null;
      } else if (segments[3] === "instances") {
        category = "doc-instances";
        resourceId = segments[4] || null;
      }
    } else if (segments[2] === "vehicles") {
      category = "vehicles";
      resourceId = segments[3] || null;
    } else if (segments[2] === "logos") {
      category = "logos";
    } else if (segments[2] === "profiles") {
      category = "profiles";
    } else if (segments[2] === "custom-docs") {
      category = "custom-documents";
      resourceId = segments.length > 4 ? segments[3] : null;
    }

    return {
      orgId,
      category,
      resourceId,
      fileName,
      isOrgBased: true,
    };
  }

  // Legacy path format: {dealershipId}/{category}/{fileName}
  return {
    orgId: null,
    category: null,
    resourceId: null,
    fileName: segments[segments.length - 1],
    isOrgBased: false,
  };
}

/**
 * Sanitize path segment (orgId, resourceId, etc.)
 * Removes characters that could cause path traversal issues
 */
export function sanitizePathSegment(segment: string): string {
  return segment
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * Sanitize filename for S3
 * Preserves file extension but cleans the name
 */
export function sanitizeFileName(fileName: string): string {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const name = parts.join(".");

  const sanitizedName = name
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return extension ? `${sanitizedName}.${extension}` : sanitizedName;
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFileName(originalName: string): string {
  const sanitized = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);

  const parts = sanitized.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const nameWithoutExt = parts.join(".");

  return extension
    ? `${nameWithoutExt}-${timestamp}-${randomId}.${extension}`
    : `${nameWithoutExt}-${timestamp}-${randomId}`;
}

/**
 * Convert legacy dealership-based path to org-based path
 *
 * Legacy: {dealershipId}/{category}/{fileName}
 * New: org/{orgId}/{category}/...
 */
export function convertLegacyToOrgPath(
  legacyPath: string,
  orgId: string,
  vehicleVin?: string
): string | null {
  const segments = legacyPath.split("/");

  if (segments.length < 3) {
    return null; // Not a valid legacy path
  }

  const [, legacyCategory, fileName] = segments;

  // Map legacy categories to new categories
  const categoryMap: Record<string, S3Category> = {
    vehicles: "vehicles",
    documents: "custom-documents",
    logos: "logos",
    profiles: "profiles",
  };

  const newCategory = categoryMap[legacyCategory];

  if (!newCategory) {
    return null; // Unknown category
  }

  // For vehicles, we need the VIN
  if (newCategory === "vehicles") {
    if (!vehicleVin) {
      return null; // Can't convert without VIN
    }
    return generateS3Key({
      orgId,
      category: newCategory,
      resourceId: vehicleVin,
      fileName,
    });
  }

  // For other categories
  return generateS3Key({
    orgId,
    category: newCategory,
    fileName,
  });
}
