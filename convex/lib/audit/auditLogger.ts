/**
 * Centralized Audit Logging System
 * Compliance with HIPAA, GDPR, SOX, PCI DSS
 */

/**
 * Audit Event Categories
 * Organized by compliance requirements
 */
export const AuditCategory = {
  // Authentication & Authorization
  AUTH: "authentication",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
  AUTH_FAILED: "auth.failed",
  AUTH_2FA: "auth.2fa",
  AUTH_PASSWORD_RESET: "auth.password_reset",

  // User Management
  USER: "user",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  USER_ROLE_CHANGE: "user.role_change",
  USER_PERMISSION_CHANGE: "user.permission_change",

  // Data Access (HIPAA/PII)
  DATA_ACCESS: "data.access",
  DATA_PII_READ: "data.pii.read",
  DATA_PII_CREATE: "data.pii.create",
  DATA_PII_UPDATE: "data.pii.update",
  DATA_PII_DELETE: "data.pii.delete",
  DATA_EXPORT: "data.export",

  // Financial (SOX)
  FINANCIAL: "financial",
  FINANCIAL_TRANSACTION: "financial.transaction",
  FINANCIAL_REFUND: "financial.refund",
  FINANCIAL_INVOICE: "financial.invoice",

  // Deals & Documents
  DEAL: "deal",
  DEAL_CREATE: "deal.create",
  DEAL_UPDATE: "deal.update",
  DEAL_DELETE: "deal.delete",
  DEAL_STATUS_CHANGE: "deal.status_change",
  DOCUMENT_GENERATE: "document.generate",
  DOCUMENT_SIGN: "document.sign",
  DOCUMENT_DOWNLOAD: "document.download",

  // Inventory
  INVENTORY: "inventory",
  VEHICLE_CREATE: "vehicle.create",
  VEHICLE_UPDATE: "vehicle.update",
  VEHICLE_DELETE: "vehicle.delete",
  VEHICLE_STATUS_CHANGE: "vehicle.status_change",

  // Settings & Configuration
  SETTINGS: "settings",
  SETTINGS_UPDATE: "settings.update",
  API_KEY_CREATE: "api_key.create",
  API_KEY_REVOKE: "api_key.revoke",

  // Security Events
  SECURITY: "security",
  SECURITY_BREACH_ATTEMPT: "security.breach_attempt",
  SECURITY_SUSPICIOUS_ACTIVITY: "security.suspicious",
  SECURITY_RATE_LIMIT: "security.rate_limit",

  // System Events
  SYSTEM: "system",
  SYSTEM_ERROR: "system.error",
  SYSTEM_WARNING: "system.warning",
} as const;

export type AuditCategoryType = typeof AuditCategory[keyof typeof AuditCategory];

/**
 * Audit Action Types
 */
export const AuditAction = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  EXECUTE: "execute",
  DOWNLOAD: "download",
  UPLOAD: "upload",
  EXPORT: "export",
  IMPORT: "import",
  GRANT: "grant",
  REVOKE: "revoke",
  APPROVE: "approve",
  REJECT: "reject",
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

/**
 * Audit Severity Levels
 */
export const AuditSeverity = {
  DEBUG: "debug",
  INFO: "info",
  NOTICE: "notice",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  ALERT: "alert",
  EMERGENCY: "emergency",
} as const;

export type AuditSeverityType = typeof AuditSeverity[keyof typeof AuditSeverity];

/**
 * Audit Event Status
 */
export const AuditStatus = {
  SUCCESS: "success",
  FAILURE: "failure",
  PARTIAL: "partial",
  DENIED: "denied",
} as const;

export type AuditStatusType = typeof AuditStatus[keyof typeof AuditStatus];

/**
 * Audit Log Entry Structure
 */
export interface AuditLogEntry {
  // Core fields
  category: AuditCategoryType;
  action: AuditActionType;
  status: AuditStatusType;
  severity: AuditSeverityType;

  // User & Session
  userId: string;
  userEmail?: string;
  userName?: string;
  dealershipId?: string;
  sessionId?: string;

  // Resource
  resourceType?: string; // "vehicle", "deal", "client", etc.
  resourceId?: string;
  resourceName?: string;

  // Context
  description: string;
  details?: Record<string, any>; // Additional structured data

  // Changes (for UPDATE actions)
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;

  // Network & Device
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  location?: {
    city?: string;
    country?: string;
  };

  // Compliance
  complianceFlags?: string[]; // ["HIPAA", "GDPR", "SOX", "PCI"]
  retentionYears?: number; // How long to retain (default: 7 years)

  // Error info (if status is FAILURE)
  errorMessage?: string;
  errorCode?: string;
  stackTrace?: string;

  // Timestamp
  timestamp: number;
}

/**
 * Audit Log Configuration
 */
export const AUDIT_CONFIG = {
  // Retention periods (in years)
  retention: {
    default: 7, // Default retention: 7 years
    financial: 7, // SOX requirement
    medical: 6, // HIPAA requirement (minimum)
    security: 10, // Security events
    pii: 7, // GDPR/privacy
  },

  // Compliance flags
  compliance: {
    hipaa: ["DATA_PII_READ", "DATA_PII_CREATE", "DATA_PII_UPDATE", "DATA_PII_DELETE"],
    sox: ["FINANCIAL_TRANSACTION", "FINANCIAL_REFUND", "FINANCIAL_INVOICE"],
    pci: ["FINANCIAL_TRANSACTION"],
    gdpr: ["DATA_PII_READ", "DATA_PII_CREATE", "DATA_PII_UPDATE", "DATA_PII_DELETE", "DATA_EXPORT"],
  },

  // Automatic severity mapping
  severityMap: {
    [AuditCategory.SECURITY_BREACH_ATTEMPT]: AuditSeverity.CRITICAL,
    [AuditCategory.SECURITY_SUSPICIOUS_ACTIVITY]: AuditSeverity.WARNING,
    [AuditCategory.AUTH_FAILED]: AuditSeverity.NOTICE,
    [AuditCategory.SYSTEM_ERROR]: AuditSeverity.ERROR,
    [AuditCategory.DATA_PII_DELETE]: AuditSeverity.WARNING,
  },
} as const;

/**
 * Determine compliance flags for a category
 */
export function getComplianceFlags(category: AuditCategoryType): string[] {
  const flags: string[] = [];

  if (AUDIT_CONFIG.compliance.hipaa.includes(category)) {
    flags.push("HIPAA");
  }
  if (AUDIT_CONFIG.compliance.sox.includes(category)) {
    flags.push("SOX");
  }
  if (AUDIT_CONFIG.compliance.pci.includes(category)) {
    flags.push("PCI");
  }
  if (AUDIT_CONFIG.compliance.gdpr.includes(category)) {
    flags.push("GDPR");
  }

  return flags;
}

/**
 * Determine retention period for a category
 */
export function getRetentionPeriod(category: AuditCategoryType): number {
  if (category.startsWith("financial")) {
    return AUDIT_CONFIG.retention.financial;
  }
  if (category.startsWith("data.pii")) {
    return AUDIT_CONFIG.retention.medical;
  }
  if (category.startsWith("security")) {
    return AUDIT_CONFIG.retention.security;
  }
  return AUDIT_CONFIG.retention.default;
}

/**
 * Auto-determine severity from category
 */
export function getAutoSeverity(
  category: AuditCategoryType,
  status: AuditStatusType
): AuditSeverityType {
  // Check predefined severity map
  if (AUDIT_CONFIG.severityMap[category]) {
    return AUDIT_CONFIG.severityMap[category];
  }

  // Auto-determine based on status
  if (status === AuditStatus.FAILURE || status === AuditStatus.DENIED) {
    if (category.startsWith("security")) {
      return AuditSeverity.ERROR;
    }
    return AuditSeverity.WARNING;
  }

  // Default severity based on category
  if (category.startsWith("security")) {
    return AuditSeverity.NOTICE;
  }

  return AuditSeverity.INFO;
}

/**
 * Create audit log entry with auto-filled fields
 */
export function createAuditLogEntry(
  partial: Partial<AuditLogEntry> & {
    category: AuditCategoryType;
    action: AuditActionType;
    userId: string;
    description: string;
  }
): AuditLogEntry {
  const status = partial.status || AuditStatus.SUCCESS;
  const severity = partial.severity || getAutoSeverity(partial.category, status);
  const complianceFlags = getComplianceFlags(partial.category);
  const retentionYears = getRetentionPeriod(partial.category);

  return {
    category: partial.category,
    action: partial.action,
    status,
    severity,
    userId: partial.userId,
    userEmail: partial.userEmail,
    userName: partial.userName,
    dealershipId: partial.dealershipId,
    sessionId: partial.sessionId,
    resourceType: partial.resourceType,
    resourceId: partial.resourceId,
    resourceName: partial.resourceName,
    description: partial.description,
    details: partial.details,
    changesBefore: partial.changesBefore,
    changesAfter: partial.changesAfter,
    ipAddress: partial.ipAddress,
    userAgent: partial.userAgent,
    device: partial.device,
    location: partial.location,
    complianceFlags,
    retentionYears,
    errorMessage: partial.errorMessage,
    errorCode: partial.errorCode,
    stackTrace: partial.stackTrace,
    timestamp: partial.timestamp || Date.now(),
  };
}

/**
 * Sanitize sensitive data before logging
 * Remove or mask PII from log details
 */
export function sanitizeLogData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    "password",
    "passwordHash",
    "ssn",
    "creditCard",
    "cvv",
    "pin",
    "secret",
    "token",
    "apiKey",
    "privateKey",
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "***REDACTED***";
    }
  }

  return sanitized;
}

/**
 * Format changes for audit log
 * Shows what changed in an UPDATE operation
 */
export function formatChanges(
  before: Record<string, any>,
  after: Record<string, any>
): {
  changesBefore: Record<string, any>;
  changesAfter: Record<string, any>;
  changedFields: string[];
} {
  const changesBefore: Record<string, any> = {};
  const changesAfter: Record<string, any> = {};
  const changedFields: string[] = [];

  // Find changed fields
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changesBefore[key] = before[key];
      changesAfter[key] = after[key];
      changedFields.push(key);
    }
  }

  // Sanitize sensitive fields
  return {
    changesBefore: sanitizeLogData(changesBefore),
    changesAfter: sanitizeLogData(changesAfter),
    changedFields,
  };
}

/**
 * Query filters for audit logs
 */
export interface AuditLogFilters {
  userId?: string;
  dealershipId?: string;
  category?: AuditCategoryType;
  action?: AuditActionType;
  status?: AuditStatusType;
  severity?: AuditSeverityType;
  resourceType?: string;
  resourceId?: string;
  startDate?: number;
  endDate?: number;
  complianceFlag?: string;
  searchTerm?: string;
}

/**
 * Audit log report types
 */
export const AuditReportType = {
  USER_ACTIVITY: "user_activity",
  SECURITY_EVENTS: "security_events",
  DATA_ACCESS: "data_access",
  FINANCIAL: "financial",
  COMPLIANCE: "compliance",
  FAILED_ACTIONS: "failed_actions",
} as const;

export type AuditReportTypeType = typeof AuditReportType[keyof typeof AuditReportType];

/**
 * Common audit log queries
 */
export const AUDIT_QUERIES = {
  // Recent security events
  recentSecurityEvents: {
    category: AuditCategory.SECURITY,
    severity: AuditSeverity.WARNING,
  },

  // Failed login attempts
  failedLogins: {
    category: AuditCategory.AUTH_FAILED,
    action: AuditAction.EXECUTE,
    status: AuditStatus.FAILURE,
  },

  // PII access
  piiAccess: {
    category: AuditCategory.DATA_ACCESS,
    complianceFlag: "HIPAA",
  },

  // Financial transactions
  financialTransactions: {
    category: AuditCategory.FINANCIAL,
    complianceFlag: "SOX",
  },
} as const;
