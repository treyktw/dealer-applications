// convex/schema.ts - Updated Schema with Security Features
import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  READONLY: "READONLY",
} as const;

export const InvitationStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REVOKED: "revoked",
  EXPIRED: "expired",
} as const;

export const SubscriptionStatus = {
  ACTIVE: "active",
  PENDING: "pending",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  PAST_DUE: "past_due",
} as const;

// Re-export from centralized subscription config
export {
  SubscriptionPlan,
  BillingCycle,
  SubscriptionFeatures,
  type SubscriptionPlanType,
  type BillingCycleType,
  type FeatureFlag,
} from "./lib/subscription/config";

export const OrgRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export const DomainVerificationType = {
  DNS_TXT: "dns_txt",
  HTTP_FILE: "http_file",
} as const;

export const DomainStatus = {
  PENDING: "pending",
  VERIFIED: "verified",
  FAILED: "failed",
  REVOKED: "revoked",
} as const;

export const DocumentStatus = {
  DRAFT: "DRAFT",
  READY: "READY",
  SIGNED: "SIGNED",
  VOID: "VOID",
} as const;

export const TemplateCategory = {
  BILL_OF_SALE: "bill_of_sale",
  ODOMETER_DISCLOSURE: "odometer_disclosure",
  BUYERS_GUIDE: "buyers_guide",
  POWER_OF_ATTORNEY: "power_of_attorney",
  TRADE_IN: "trade_in",
  FINANCE_CONTRACT: "finance_contract",
  WARRANTY: "warranty",
  CUSTOM: "custom",
} as const;

export default defineSchema({
  // Core tables
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    image: v.optional(v.string()),
    role: v.string(),
    permissions: v.optional(v.array(v.string())),
    dealershipId: v.optional(v.id("dealerships")),
    isActive: v.optional(v.boolean()),
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    needsOnboarding: v.optional(v.boolean()),
    subscriptionStatus: v.optional(v.string()),
    subscriptionId: v.optional(v.id("subscriptions")),
    // User settings
    settings: v.optional(
      v.object({
        emailNotifications: v.boolean(),
        pushNotifications: v.boolean(),
        dealUpdates: v.boolean(),
        marketingEmails: v.boolean(),
        theme: v.string(),
        language: v.string(),
        profileVisibility: v.string(),
        activityTracking: v.boolean(),
      })
    ),
    // Security fields
    failedLoginAttempts: v.optional(v.number()),
    lastFailedLogin: v.optional(v.number()),
    accountLocked: v.optional(v.boolean()),
    lockoutExpires: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_dealership", ["dealershipId"])
    .index("by_role", ["role"]),

  dealerships: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),

    // NEW: Link to parent org
    orgId: v.optional(v.id("orgs")),

    // S3 Configuration
    s3BucketName: v.optional(v.string()),
    s3Region: v.optional(v.string()),
    s3AccessKeyId: v.optional(v.string()), // Encrypted
    s3SecretKey: v.optional(v.string()), // Encrypted

    // Storage Management
    storageUsed: v.optional(v.number()), // Bytes
    storageLimit: v.optional(v.number()), // Bytes (default 5GB = 5368709120)

    // Business info
    taxId: v.optional(v.string()), // Encrypted
    businessHours: v.optional(v.string()),

    // Subscription
    subscriptionId: v.optional(v.id("subscriptions")),

    // Billing
    billingEmail: v.optional(v.string()),
    billingAddress: v.optional(v.string()),
    billingCity: v.optional(v.string()),
    billingState: v.optional(v.string()),
    billingZipCode: v.optional(v.string()),
    billingCountry: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),

    // Security settings
    allowedDomains: v.optional(v.array(v.string())),
    apiKeysEnabled: v.optional(v.boolean()),
    ipWhitelist: v.optional(v.array(v.string())),

    // Service Management (Master Admin)
    isSuspended: v.optional(v.boolean()),
    suspendedAt: v.optional(v.number()),
    suspensionReason: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    deletionReason: v.optional(v.string()),
    notes: v.optional(v.string()), // Master admin notes
    contactEmail: v.optional(v.string()), // Primary contact email
    contactPhone: v.optional(v.string()), // Primary contact phone

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]), // NEW INDEX

  // Security tables
  security_logs: defineTable({
    dealershipId: v.optional(v.id("dealerships")),
    action: v.string(),
    userId: v.optional(v.string()),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    success: v.boolean(),
    details: v.optional(v.string()),
    timestamp: v.number(),
    // Additional context
    resource: v.optional(v.string()), // What was accessed
    method: v.optional(v.string()), // HTTP method or action type
    severity: v.optional(v.string()), // low, medium, high, critical
  })
    .index("by_dealership_timestamp", ["dealershipId", "timestamp"])
    .index("by_action", ["action"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_severity", ["severity"]),

  rate_limits: defineTable({
    key: v.string(), // identifier:action
    timestamp: v.number(),
    identifier: v.string(), // user ID, IP address, etc.
    action: v.string(),
    ipAddress: v.string(),
    // Metadata
    blocked: v.optional(v.boolean()),
    resetTime: v.optional(v.number()),
  })
    .index("by_key_timestamp", ["key", "timestamp"])
    .index("by_identifier", ["identifier"])
    .index("by_action", ["action"]),

  api_keys: defineTable({
    dealershipId: v.id("dealerships"),
    orgId: v.optional(v.id("orgs")), // NEW

    name: v.string(),
    keyHash: v.string(), // SHA-256 hash of the key
    keyPrefix: v.string(), // First 8 chars for identification

    // Permissions/Scopes
    permissions: v.array(v.string()), // Keep for backward compatibility
    scopes: v.optional(v.array(v.string())), // NEW: e.g., ["inventory:read", "vehicles:read"]

    // Status
    isActive: v.boolean(),
    status: v.optional(
      v.union(
        // NEW
        v.literal("active"),
        v.literal("revoked"),
        v.literal("expired")
      )
    ),

    // Usage tracking
    lastUsed: v.optional(v.number()),
    usageCount: v.optional(v.number()),
    requestCount: v.optional(v.number()), // NEW
    lastUsedAt: v.optional(v.number()), // NEW (duplicate of lastUsed, consolidate later)

    // Rate limiting
    rateLimit: v.optional(
      v.object({
        requests: v.number(),
        window: v.number(), // in milliseconds
      })
    ),
    rateLimitPerHour: v.optional(v.number()), // NEW
    rateLimitPerDay: v.optional(v.number()), // NEW

    // IP restrictions
    allowedIps: v.optional(v.array(v.string())),

    // Expiration
    expiresAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(), // user ID
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_key_hash", ["keyHash"])
    .index("by_active", ["isActive"])
    .index("by_org", ["orgId"]),

  // File management
  // Centralized file storage tracking for all S3 uploads
  file_uploads: defineTable({
    dealershipId: v.id("dealerships"),
    uploadedBy: v.string(), // user ID
    fileName: v.string(),
    originalFileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    category: v.string(), // vehicles, documents, logos, profiles, custom_documents
    // S3 Key Format: depends on category
    // - custom_documents: dealerships/{dealershipId}/custom-documents/{dealId}/{fileName}
    // - vehicles: dealerships/{dealershipId}/vehicles/{vehicleId}/{fileName}
    // - logos: dealerships/{dealershipId}/logos/{fileName}
    s3Key: v.string(),
    s3Bucket: v.string(),
    // Security
    checksum: v.optional(v.string()),
    encrypted: v.boolean(),
    // Metadata
    isPublic: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
    downloadCount: v.optional(v.number()),
    lastAccessed: v.optional(v.number()),
    // Virus scanning
    scanStatus: v.optional(v.string()), // pending, clean, infected, error
    scanDate: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_category", ["category"])
    .index("by_uploader", ["uploadedBy"])
    .index("by_scan_status", ["scanStatus"])
    .index("by_s3_key", ["s3Key"]),

  // Existing tables (vehicles, clients, etc.)
  vehicles: defineTable({
    id: v.string(),
    stock: v.string(),
    vin: v.string(), // Should be encrypted in production
    make: v.string(),
    model: v.string(),
    year: v.number(),
    trim: v.optional(v.string()),
    bodyType: v.optional(v.string()),
    mileage: v.number(),
    price: v.number(),
    images: v.optional(
      v.array(
        v.object({
          url: v.string(),
          isPrimary: v.optional(v.boolean()),
          fileId: v.optional(v.id("file_uploads")), // Reference to file_uploads
          vehicleId: v.optional(v.string()),
        })
      )
    ),
    exteriorColor: v.optional(v.string()),
    interiorColor: v.optional(v.string()),
    fuelType: v.optional(v.string()),
    transmission: v.optional(v.string()),
    drivetrain: v.optional(v.string()),
    engine: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(
      // Available for sale
      v.literal("AVAILABLE"),
      v.literal("FEATURED"),
      // In process
      v.literal("IN_TRANSIT"),
      v.literal("IN_SERVICE"),
      v.literal("RESERVED"),
      v.literal("PENDING_SALE"),
      // Sold/Off lot
      v.literal("SOLD"),
      v.literal("WHOLESALE"),
      v.literal("TRADED"),
      // Other
      v.literal("UNAVAILABLE"),
      v.literal("ARCHIVED"),
      // Legacy (for backward compatibility during migration)
      v.literal("PENDING")
    ),
    featured: v.boolean(),
    features: v.optional(v.string()),
    dealershipId: v.string(),
    clientId: v.optional(v.string()),

    // Status tracking fields
    statusChangedAt: v.optional(v.number()),
    statusChangedBy: v.optional(v.string()), // user ID
    reservedBy: v.optional(v.string()), // client ID
    reservedAt: v.optional(v.number()),
    reservedUntil: v.optional(v.number()),

    // Additional fields
    costPrice: v.optional(v.number()), // Encrypted
    profit: v.optional(v.number()), // Calculated field
    daysOnLot: v.optional(v.number()),
    // SEO
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),

    condition: v.optional(
      v.union(
        v.literal("new"),
        v.literal("used"),
        v.literal("certified_pre_owned")
      )
    ),

    // Timestamps
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_dealership_status", ["dealershipId", "status"])
    .index("by_vehicle_id", ["id"])
    .index("by_make_model", ["make", "model"])
    .index("by_price", ["price"])
    .index("by_status", ["status"]),

  clients: defineTable({
    client_id: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()), // Should be encrypted
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.union(
      // Lead stages
      v.literal("PROSPECT"),
      v.literal("CONTACTED"),
      v.literal("QUALIFIED"),
      v.literal("NEGOTIATING"),
      // Customer stages
      v.literal("CUSTOMER"),
      v.literal("REPEAT_CUSTOMER"),
      // Inactive/Lost
      v.literal("LOST"),
      v.literal("NOT_INTERESTED"),
      v.literal("DO_NOT_CONTACT"),
      v.literal("PREVIOUS"),
      // Legacy (for backward compatibility during migration)
      v.literal("LEAD")
    ),
    notes: v.optional(v.string()),
    createdById: v.optional(v.string()),
    dealershipId: v.string(),

    // Status tracking fields
    statusChangedAt: v.optional(v.number()),
    statusChangedBy: v.optional(v.string()), // user ID
    lostReason: v.optional(v.string()),
    leadSource: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    nextFollowUpAt: v.optional(v.number()),

    // Additional fields
    creditScore: v.optional(v.string()), // Encrypted
    ssn: v.optional(v.string()), // Encrypted
    driversLicense: v.optional(v.string()), // Encrypted
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_id", ["client_id"])
    .index("by_dealership", ["dealershipId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // Subscription tables
  subscriptions: defineTable({
    dealershipId: v.id("dealerships"),
    status: v.string(),
    plan: v.string(),
    billingCycle: v.string(),
    currentPeriodStart: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    clientSecret: v.optional(v.string()),
    features: v.array(v.string()),
    // Usage tracking
    storageUsed: v.optional(v.number()), // in bytes
    apiCallsUsed: v.optional(v.number()),
    usersCount: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_status", ["status"]),

  // Other existing tables...
  activities: defineTable({
    type: v.union(
      v.literal("NOTE"),
      v.literal("EMAIL"),
      v.literal("CALL"),
      v.literal("MEETING"),
      v.literal("TASK")
    ),
    content: v.string(),
    clientId: v.string(),
    userId: v.optional(v.string()),
    dealershipId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_dealership", ["dealershipId"]),

  deals: defineTable({
    // id: v.string(),
    type: v.string(),
    clientId: v.id("clients"),
    vehicleId: v.id("vehicles"),
    // dealId: v.id("deals"),
    generated: v.boolean(),
    generatedAt: v.optional(v.number()),
    clientSigned: v.boolean(),
    clientSignedAt: v.optional(v.number()),
    dealerSigned: v.boolean(),
    dealerSignedAt: v.optional(v.number()),
    notarized: v.boolean(),
    notarizedAt: v.optional(v.number()),
    documentUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.union(
      // Initial stages
      v.literal("DRAFT"),
      v.literal("PENDING_APPROVAL"),
      v.literal("APPROVED"),
      // Documentation stages
      v.literal("DOCS_GENERATING"),
      v.literal("DOCS_READY"),
      v.literal("AWAITING_SIGNATURES"),
      v.literal("PARTIALLY_SIGNED"),
      // Financing stages (future-proofing)
      v.literal("FINANCING_PENDING"),
      v.literal("FINANCING_APPROVED"),
      v.literal("FINANCING_DECLINED"),
      // Completion stages
      v.literal("COMPLETED"),
      v.literal("DELIVERED"),
      v.literal("FINALIZED"),
      // Problem stages
      v.literal("ON_HOLD"),
      v.literal("CANCELLED"),
      v.literal("VOID"),
      // Legacy (for backward compatibility during migration)
      v.literal("draft"),
      v.literal("on_hold"),
      v.literal("completed")
    ),
    totalAmount: v.number(),
    dealershipId: v.string(),
    clientEmail: v.optional(v.string()),
    clientPhone: v.optional(v.string()),
    vin: v.optional(v.string()),
    stockNumber: v.optional(v.string()),
    saleDate: v.optional(v.number()),
    saleAmount: v.optional(v.number()),
    salesTax: v.optional(v.number()),
    docFee: v.optional(v.number()),
    tradeInValue: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    financedAmount: v.optional(v.number()),
    documentPackId: v.optional(v.id("document_packs")),
    buyerData: v.optional(v.any()), // Cached buyer info
    dealData: v.optional(v.any()), // Additional custom deal data
    documentStatus: v.optional(v.string()), // "none", "in_progress", "complete"

    // Document Pack Marketplace - Track which purchased pack was used
    documentPackPurchaseUsed: v.optional(v.id("dealer_document_pack_purchases")),
    documentPackVersionUsed: v.optional(v.number()), // Version of pack used (for audit)

    // Status tracking fields
    statusChangedAt: v.optional(v.number()),
    statusChangedBy: v.optional(v.string()), // user ID
    statusHistory: v.optional(v.array(
      v.object({
        previousStatus: v.string(),
        newStatus: v.string(),
        changedAt: v.number(),
        changedBy: v.optional(v.string()),
        reason: v.optional(v.string()),
      })
    )),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    cancelledBy: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string())
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  documents: defineTable({
    dealId: v.id("deals"),
    type: v.string(),
    documentUrl: v.string(),
    fileId: v.optional(v.id("file_uploads")),
    clientSigned: v.boolean(),
    dealerSigned: v.boolean(),
    notarized: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_deal", ["dealId"]),

  // Legacy tables
  allowedIPs: defineTable({
    ip: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  notificationSettings: defineTable({
    userId: v.optional(v.string()),
    type: v.string(),
    emailEnabled: v.boolean(),
    inAppEnabled: v.boolean(),
  }),

  invitations: defineTable({
    token: v.string(),
    email: v.string(),
    role: v.string(),
    dealershipId: v.id("dealerships"),
    status: v.string(),
    expiresAt: v.number(),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_dealership", ["dealershipId"])
    .index("by_status", ["status"])
    .index("by_expires_at", ["expiresAt"]),

  employees: defineTable({
    userId: v.string(),
    dealershipId: v.string(),
    jobTitle: v.string(),
    department: v.string(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    startDate: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_user", ["userId"]),

  campaigns: defineTable({
    title: v.string(),
    subject: v.string(),
    fromName: v.string(),
    fromEmail: v.string(),
    content: v.string(),
    audienceType: v.string(),
    segmentId: v.optional(v.string()),
    recipientCount: v.optional(v.number()),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SCHEDULED"),
      v.literal("SENDING"),
      v.literal("SENT"),
      v.literal("CANCELLED")
    ),
    scheduledFor: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    openRate: v.optional(v.number()),
    clickRate: v.optional(v.number()),
    trackOpens: v.boolean(),
    trackClicks: v.boolean(),
    createdById: v.string(),
    dealershipId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_dealership", ["dealershipId"]),

  vehicleImages: defineTable({
    url: v.string(),
    caption: v.optional(v.string()),
    isPrimary: v.boolean(),
    vehicleId: v.string(),
    fileId: v.optional(v.id("file_uploads")),
  }),

  vehicleFeatures: defineTable({
    name: v.string(),
    category: v.optional(v.string()),
    vehicleId: v.string(),
  }),

  clientVehicleNotes: defineTable({
    note: v.string(),
    status: v.optional(v.string()),
    clientId: v.string(),
    vehicleId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  deeplink_tokens: defineTable({
    token: v.string(),
    dealId: v.id("deals"),
    userId: v.string(),
    dealershipId: v.id("dealerships"),
    used: v.boolean(),
    usedAt: v.optional(v.number()),
    usedBy: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_deal", ["dealId"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  templates: defineTable({
    name: v.string(),
    version: v.string(),
    dealershipId: v.string(),
    isActive: v.boolean(),
    fields: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          required: v.boolean(),
        })
      )
    ),
    requiredFields: v.optional(v.array(v.string())),
    mappings: v.optional(v.any()),
    pdfUrl: v.optional(v.string()),
    pdfSha256: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_active", ["isActive"]),

  pdf_templates: defineTable({
    templateId: v.string(), // "bill-of-sale-ga-v1"
    templateType: v.string(), // "bill_of_sale", "odometer_disclosure", etc.
    jurisdiction: v.string(), // "GA", "FL", etc.
    version: v.string(),
    storageId: v.string(),
    // Template storage
    blankPdfUrl: v.string(), // S3 URL to blank template
    pdfSha256: v.string(),

    // Field definitions extracted from PDF
    fields: v.array(
      v.object({
        fieldName: v.string(), // PDF form field name "TEXT_VIN"
        fieldType: v.string(), // "text", "checkbox", "radio", "signature"
        required: v.boolean(),
        maxLength: v.optional(v.number()),
        options: v.optional(v.array(v.string())), // for dropdowns/radios
        exportValue: v.optional(v.string()), // for checkboxes
        rect: v.optional(
          v.object({
            // position on PDF
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
          })
        ),
      })
    ),

    // Data mapping configuration
    fieldMappings: v.array(
      v.object({
        pdfFieldName: v.string(), // "TEXT_VIN"
        dataPath: v.string(), // "vehicle.vin" or "buyers[0].firstName"
        transform: v.optional(v.string()), // "uppercase", "date:MM/DD/YYYY"
        validation: v.optional(v.string()), // "vin", "ssn", "email"
        fallback: v.optional(v.string()), // default value if missing
      })
    ),

    dealershipId: v.id("dealerships"),
    isActive: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership_type", ["dealershipId", "templateType"])
    .index("by_active", ["isActive"]),

  // Document Pack for a Deal
  document_packs: defineTable({
    dealId: v.id("deals"),
    dealershipId: v.id("dealerships"),

    status: v.string(), // "draft", "data_complete", "generated", "signed", "finalized"

    // Pack configuration
    packType: v.string(), // "cash_sale", "finance", "lease"
    jurisdiction: v.string(), // state

    // Documents in this pack
    documents: v.array(
      v.object({
        templateId: v.string(),
        templateType: v.string(),
        documentName: v.string(), // "Bill of Sale"

        status: v.string(), // "pending", "generated", "signed", "uploaded"

        // Generated PDF info
        generatedAt: v.optional(v.number()),
        generatedPdfUrl: v.optional(v.string()), // temp S3 URL
        generatedPdfSha256: v.optional(v.string()),
        generatedPdfExpiry: v.optional(v.number()), // when temp URL expires

        // Signed PDF info
        signedAt: v.optional(v.number()),
        signedPdfUrl: v.optional(v.string()), // permanent S3 URL
        signedPdfSha256: v.optional(v.string()),
        uploadedBy: v.optional(v.string()),

        // Field data used for generation
        fieldData: v.optional(v.any()), // JSON snapshot of data used
      })
    ),

    // Buyer Information
    buyers: v.array(
      v.object({
        buyerType: v.string(), // "primary", "co_buyer"

        // Identity
        firstName: v.string(),
        middleName: v.optional(v.string()),
        lastName: v.string(),
        suffix: v.optional(v.string()),

        // PII (encrypted in production)
        dateOfBirth: v.string(),
        ssn: v.optional(v.string()),

        // Driver's License
        dlNumber: v.string(),
        dlState: v.string(),
        dlIssueDate: v.optional(v.string()),
        dlExpirationDate: v.string(),

        // Contact
        email: v.string(),
        phone: v.string(),

        // Address
        address: v.object({
          street: v.string(),
          apt: v.optional(v.string()),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
        }),

        // Previous address if < 2 years
        previousAddress: v.optional(
          v.object({
            street: v.string(),
            apt: v.optional(v.string()),
            city: v.string(),
            state: v.string(),
            zipCode: v.string(),
            monthsAtAddress: v.number(),
          })
        ),

        // Employment (for financing)
        employment: v.optional(
          v.object({
            employerName: v.string(),
            jobTitle: v.string(),
            employerPhone: v.string(),
            monthsEmployed: v.number(),
            monthlyIncome: v.number(),
            otherIncome: v.optional(v.number()),
            otherIncomeSource: v.optional(v.string()),
          })
        ),

        // Consents
        consents: v.object({
          eSignature: v.boolean(),
          eDelivery: v.boolean(),
          privacyPolicy: v.boolean(),
          marketing: v.optional(v.boolean()),
        }),

        // Metadata
        dataSource: v.string(), // "manual", "import", "autofill"
        validatedAt: v.optional(v.number()),
      })
    ),

    // Deal-specific dealership info
    dealershipInfo: v.object({
      salespersonName: v.string(),
      salespersonId: v.string(),
      financeManagerName: v.optional(v.string()),
      financeManagerId: v.optional(v.string()),
      notaryName: v.optional(v.string()),
      notaryId: v.optional(v.string()),
    }),

    // Validation state
    validationStatus: v.object({
      buyerDataComplete: v.boolean(),
      vehicleDataComplete: v.boolean(),
      dealershipDataComplete: v.boolean(),
      allRequiredFields: v.boolean(),
      lastValidated: v.optional(v.number()),
      errors: v.optional(
        v.array(
          v.object({
            field: v.string(),
            message: v.string(),
            severity: v.string(), // "error", "warning"
          })
        )
      ),
    }),

    // Audit trail
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    finalizedAt: v.optional(v.number()),
    finalizedBy: v.optional(v.string()),
  })
    .index("by_deal", ["dealId"])
    .index("by_dealership", ["dealershipId"])
    .index("by_status", ["status"]),

  // Audit log for document operations
  document_audit_logs: defineTable({
    documentPackId: v.id("document_packs"),
    dealId: v.id("deals"),
    dealershipId: v.id("dealerships"),

    action: v.string(), // "generated", "downloaded", "uploaded", "signed", "finalized"
    documentType: v.optional(v.string()),

    userId: v.string(),
    userName: v.string(),
    userRole: v.string(),

    // File info
    fileName: v.optional(v.string()),
    fileSha256: v.optional(v.string()),
    fileSize: v.optional(v.number()),

    // Context
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    details: v.optional(v.string()),

    timestamp: v.number(),
  })
    .index("by_pack", ["documentPackId"])
    .index("by_deal", ["dealId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  // Custom documents uploaded by dealers
  // These are dealer-uploaded PDFs attached to deals (not generated from templates)
  dealer_uploaded_documents: defineTable({
    dealId: v.id("deals"),
    dealershipId: v.id("dealerships"),
    documentName: v.string(),
    documentType: v.string(), // contract, agreement, form, etc.
    fileId: v.id("file_uploads"),
    // S3 Key Format: dealerships/{dealershipId}/custom-documents/{dealId}/{fileName}
    // Generated by: generateCustomDocumentPath() in lib/s3/document-paths.ts
    s3Key: v.string(),
    s3Bucket: v.string(),
    uploadedBy: v.string(), // userId
    fileSize: v.number(),
    mimeType: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_deal", ["dealId"])
    .index("by_dealership", ["dealershipId"])
    .index("by_uploader", ["uploadedBy"]),
  template_mappings: defineTable({
    dealershipId: v.id("dealerships"),
    templateType: v.string(), // "bill_of_sale", "finance_contract", etc.
    storageId: v.string(), // Storage ID of the PDF template

    // Dynamic field mappings
    fieldMappings: v.array(
      v.object({
        pdfFieldName: v.string(), // Exact field name in PDF
        fieldType: v.string(), // TextField, CheckBox, etc.
        dataPath: v.string(), // Where to get data from (e.g., "vehicle.vin")
        label: v.string(), // Human-readable label
        inputType: v.string(), // text, number, currency, date, select
        required: v.boolean(),
        category: v.string(), // vehicle, buyer, seller, financial, other
        validation: v.optional(v.any()), // Validation rules
      })
    ),

    // Metadata
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership_type", ["dealershipId", "templateType"])
    .index("by_dealership", ["dealershipId"]),

  auth_sessions: defineTable({
    userId: v.id("users"),
    token: v.string(), // Session token stored in Tauri keyring
    expiresAt: v.number(), // When session expires
    createdAt: v.number(),
    lastAccessedAt: v.number(), // Track activity
    userAgent: v.optional(v.string()), // Device info
    ipAddress: v.optional(v.string()), // For security logging
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  /**
   * Standalone user sessions (for desktop app)
   * Separate from auth_sessions to support license-based auth
   */
  standalone_sessions: defineTable({
    userId: v.id("standalone_users"),
    token: v.string(), // Session token stored in Tauri keyring
    licenseKey: v.string(), // Associated license key
    machineId: v.string(), // Machine where session was created
    expiresAt: v.number(), // When session expires
    createdAt: v.number(),
    lastAccessedAt: v.number(), // Track activity
    userAgent: v.optional(v.string()), // Device info
    ipAddress: v.optional(v.string()), // For security logging
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_license", ["licenseKey"])
    .index("by_machine", ["machineId"])
    .index("by_expiry", ["expiresAt"]),

  orgs: defineTable({
    name: v.string(),
    slug: v.string(), // unique identifier for URLs
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("pending")
    ),

    // Billing at org level
    stripeCustomerId: v.optional(v.string()),
    billingEmail: v.optional(v.string()),

    // Settings
    settings: v.optional(
      v.object({
        allowMultipleDealerships: v.optional(v.boolean()),
        masterAdminEmails: v.optional(v.array(v.string())),
      })
    ),

    // Metadata
    createdBy: v.string(), // userId who created the org
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_status", ["status"]),

  orgMembers: defineTable({
    orgId: v.id("orgs"),
    userId: v.id("users"),

    // Role within the organization
    role: v.union(
      v.literal("OWNER"), // Full control, can't be removed
      v.literal("ADMIN"), // Can manage everything except billing
      v.literal("MEMBER") // Can access dealerships they're assigned to
    ),

    // Granular permissions (overrides role defaults)
    customPermissions: v.optional(v.array(v.string())),

    // Invitation tracking
    invitedBy: v.optional(v.id("users")),
    invitationAcceptedAt: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("suspended")
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_and_user", ["orgId", "userId"])
    .index("by_status", ["status"]),

  verifiedDomains: defineTable({
    dealershipId: v.id("dealerships"),
    orgId: v.optional(v.id("orgs")),

    domain: v.string(), // e.g., "example-dealership.com"

    // Verification method
    verificationType: v.union(v.literal("dns_txt"), v.literal("http_file")),
    verificationToken: v.string(), // Token to verify ownership

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("failed"),
      v.literal("revoked")
    ),

    // Verification details
    verifiedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    lastCheckedAt: v.optional(v.number()),
    verificationAttempts: v.number(),

    // Usage tracking
    apiCallsToday: v.optional(v.number()),
    apiCallsThisMonth: v.optional(v.number()),
    lastApiCallAt: v.optional(v.number()),

    // Metadata
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_domain", ["domain"])
    .index("by_status", ["status"])
    .index("by_org", ["orgId"]),

  // Document Templates
  // Master PDF templates used to generate filled documents for deals
  documentTemplates: defineTable({
    dealershipId: v.id("dealerships"),
    orgId: v.optional(v.id("orgs")),

    // Template info
    name: v.string(),
    category: v.union(
      v.literal("bill_of_sale"),
      v.literal("odometer_disclosure"),
      v.literal("buyers_guide"),
      v.literal("power_of_attorney"),
      v.literal("trade_in"),
      v.literal("finance_contract"),
      v.literal("warranty"),
      v.literal("custom")
    ),
    description: v.optional(v.string()),

    // Version control
    version: v.number(),
    isActive: v.boolean(), // Only one version active per category

    // S3 storage
    // S3 Key Format: dealerships/{dealershipId}/templates/{templateId}.pdf
    // Generated by: generateTemplatePath() in lib/s3/document-paths.ts
    s3Key: v.string(), // Path to PDF template in S3
    fileSize: v.number(),

    // PDF form fields (extracted from PDF)
    pdfFields: v.array(
      v.object({
        name: v.string(), // PDF field name (e.g., "buyer_name")
        type: v.union(
          v.literal("text"),
          v.literal("number"),
          v.literal("date"),
          v.literal("checkbox"),
          v.literal("signature"),
          v.literal("radio"),
          v.literal("dropdown")
        ),
        label: v.string(), // Human-readable label
        required: v.boolean(), // Whether field is required
        defaultValue: v.optional(v.string()), // Default value
        pdfFieldName: v.string(), // Original PDF field name
        page: v.number(), // Which page the field is on
        rect: v.optional(v.array(v.number())), // [x, y, width, height]
      })
    ),

    // Field mappings (maps PDF fields to data schema)
    fieldMappings: v.array(
      v.object({
        pdfFieldName: v.string(), // "buyer_name"
        dataPath: v.string(), // "client.firstName + ' ' + client.lastName"
        transform: v.optional(
          v.union(
            v.literal("uppercase"),
            v.literal("lowercase"),
            v.literal("titlecase"),
            v.literal("currency"),
            v.literal("date")
          )
        ),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
        autoMapped: v.boolean(), // Was this auto-detected or manual?
      })
    ),

    // Metadata
    uploadedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_dealership_and_category", ["dealershipId", "category"])
    .index("by_dealership_active", ["dealershipId", "isActive"])
    .index("by_org", ["orgId"]),

  // Document Instances
  // Generated documents for specific deals (filled from templates)
  // Each instance is a filled PDF generated from a documentTemplate for a specific deal
  documentInstances: defineTable({
    dealershipId: v.id("dealerships"),
    orgId: v.optional(v.id("orgs")),

    // Links
    templateId: v.id("documentTemplates"),
    dealId: v.id("deals"),

    // Document info
    documentType: v.string(), // "bill_of_sale", etc. (from template.category)
    name: v.string(), // "Bill of Sale - John Doe"

    // Document data
    data: v.any(), // Filled form data (JSON snapshot)

    // Status machine
    status: v.union(
      v.literal("DRAFT"), // Being created
      v.literal("READY"), // Generated, ready to sign
      v.literal("SIGNED"), // All signatures collected
      v.literal("VOID"), // Voided/cancelled
      v.literal("FINALIZING"), // Finalizing
      v.literal("FINALIZED") // Finalized
    ),

    // S3 storage
    // S3 Key Format: dealerships/{dealershipId}/deals/{dealId}/documents/{documentId}.pdf
    // Generated by: generateDealDocumentPath() in lib/s3/document-paths.ts
    // IMPORTANT: Must always end with .pdf extension
    s3Key: v.optional(v.string()), // Generated PDF (blank template)
    handSignedS3Key: v.optional(v.string()), // Scanned/uploaded PDF with handwritten signatures
    fileSize: v.optional(v.number()),

    // Handwritten signature tracking (physical documents only)
    // No digital signature embedding - all signatures must be handwritten
    allPartiesSigned: v.optional(v.boolean()), // All required parties have signed physically
    physicalSignatureDate: v.optional(v.number()), // When physical document was signed
    physicalSignatureNotes: v.optional(v.string()), // Notes about physical signing

    // Audit trail
    audit: v.object({
      createdBy: v.id("users"),
      createdAt: v.number(),
      signedBy: v.optional(v.id("users")),
      signedAt: v.optional(v.number()),
      voidedBy: v.optional(v.id("users")),
      voidedAt: v.optional(v.number()),
      voidReason: v.optional(v.string()),
    }),

    // Metadata
    updatedAt: v.number(),
    finalizedAt: v.optional(v.number()),
    finalizedBy: v.optional(v.id("users")),
    
    // Notarization
    notarized: v.optional(v.boolean()),
    notarizedAt: v.optional(v.number()),
    notarizedBy: v.optional(v.id("users")),
    
    metadata: v.optional(
      v.object({
        lastFieldValues: v.optional(v.any()), // 🆕 Add this
        lastFieldUpdate: v.optional(v.number()), // 🆕 Add this
        // ... other metadata
      })
    ),

    // NEW: Link to final archived version
    generatedDocumentId: v.optional(v.id("generatedDocuments")),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_deal", ["dealId"])
    .index("by_template", ["templateId"])
    .index("by_status", ["status"])
    .index("by_org", ["orgId"])
    .index("by_dealership_status", ["dealershipId", "status"]),

  // Removed: signature sessions, signatures, and e-signature consents

  generatedDocuments: defineTable({
    dealershipId: v.id("dealerships"),
    dealId: v.id("deals"),
    templateId: v.id("documentTemplates"),
    documentType: v.string(),

    // Generation Data
    generatedData: v.any(), // Snapshot of data used to fill
    s3Key: v.string(), // Filled PDF location
    fileSize: v.number(),

    // Status (simplified)
    status: v.string(), // "draft" | "ready" | "void"

    // Audit Trail
    generatedBy: v.id("users"),
    generatedAt: v.number(),
    lastModifiedAt: v.number(),
    voidedAt: v.optional(v.number()),
    voidedBy: v.optional(v.id("users")),
    voidReason: v.optional(v.string()),
  })
    .index("by_deal", ["dealId"])
    .index("by_dealership_status", ["dealershipId", "status"])
    .index("by_template", ["templateId"]),

  // Webhook Events - Idempotency tracking
  webhook_events: defineTable({
    eventId: v.string(), // Stripe event ID (evt_xxx)
    type: v.string(), // Event type (checkout.session.completed, etc.)
    source: v.string(), // "stripe" | "clerk" | etc.
    processedAt: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional event metadata
  })
    .index("by_event_id", ["eventId"])
    .index("by_type", ["type"])
    .index("by_source", ["source"])
    .index("by_processed_at", ["processedAt"]),

  // ============================================================================
  // DOCUMENT PACK MARKETPLACE - Platform-provided document packs for purchase
  // ============================================================================

  // Master templates available for purchase
  document_pack_templates: defineTable({
    // Pack Info
    name: v.string(), // "California Cash Sale Pack"
    description: v.string(), // Full description
    jurisdiction: v.string(), // "california" | "texas" | "federal" | "multi-state"
    packType: v.string(), // "cash_sale" | "finance" | "lease" | "complete"

    // Pricing
    price: v.number(), // Price in cents (e.g., 9900 = $99.00)
    stripeProductId: v.optional(v.string()), // Stripe product ID
    stripePriceId: v.optional(v.string()), // Stripe price ID

    // Documents included in this pack (stored in Convex, not S3)
    documents: v.array(
      v.object({
        type: v.string(), // "bill_of_sale" | "odometer_disclosure" | etc.
        name: v.string(), // Display name
        templateContent: v.string(), // HTML/PDF template content
        fillableFields: v.array(v.string()), // Field names for data mapping
        required: v.boolean(), // Must be included in every deal
        order: v.number(), // Display/generation order
      })
    ),

    // Status & Versioning
    isActive: v.boolean(), // Can be purchased
    version: v.number(), // Template version for tracking updates
    changelog: v.optional(v.array(
      v.object({
        version: v.number(),
        changes: v.string(),
        updatedAt: v.number(),
        updatedBy: v.id("users"),
      })
    )),

    // Sales Tracking
    totalPurchases: v.number(),
    totalRevenue: v.number(), // In cents

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"), // Master admin who created
  })
    .index("by_jurisdiction", ["jurisdiction"])
    .index("by_pack_type", ["packType"])
    .index("by_active", ["isActive"])
    .index("by_jurisdiction_type", ["jurisdiction", "packType", "isActive"]),

  // Dealer purchases of document packs
  dealer_document_pack_purchases: defineTable({
    // Ownership
    dealershipId: v.id("dealerships"),
    packTemplateId: v.id("document_pack_templates"),
    packVersion: v.number(), // Version purchased (for tracking if template updates)

    // Purchase Info
    purchaseDate: v.number(),
    purchasedBy: v.id("users"), // User who made the purchase
    amountPaid: v.number(), // Amount in cents

    // Stripe Info
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("active"), // Can be used
      v.literal("refunded"), // Refunded, cannot use
      v.literal("cancelled") // Cancelled, cannot use
    ),

    // Usage Tracking
    timesUsed: v.number(), // How many deals used this pack
    lastUsedAt: v.optional(v.number()),

    // Customization (future feature)
    customizations: v.optional(
      v.object({
        logoOverride: v.optional(v.string()),
        colorScheme: v.optional(v.string()),
        customFields: v.optional(v.any()),
      })
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_pack_template", ["packTemplateId"])
    .index("by_dealership_status", ["dealershipId", "status"])
    .index("by_dealership_pack", ["dealershipId", "packTemplateId"]) // Check ownership
    .index("by_stripe_session", ["stripeCheckoutSessionId"]),

  // ============================================================================
  // NOTIFICATIONS & EMAIL SYSTEM
  // ============================================================================

  /**
   * In-app notifications for users
   * Supports real-time alerts and notification center
   */
  notifications: defineTable({
    // Target
    userId: v.id("users"),
    dealershipId: v.optional(v.id("dealerships")),

    // Notification Content
    type: v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("deal_update"),
      v.literal("payment_received"),
      v.literal("document_signed"),
      v.literal("subscription_expiring"),
      v.literal("new_feature"),
      v.literal("system_alert")
    ),
    title: v.string(),
    message: v.string(),
    icon: v.optional(v.string()), // Icon name or emoji

    // Action
    actionUrl: v.optional(v.string()), // Where to navigate when clicked
    actionLabel: v.optional(v.string()), // "View Deal", "Upgrade Now", etc.

    // Metadata
    relatedEntityType: v.optional(
      v.union(
        v.literal("deal"),
        v.literal("vehicle"),
        v.literal("client"),
        v.literal("subscription"),
        v.literal("document")
      )
    ),
    relatedEntityId: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional context data

    // Status
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    isArchived: v.boolean(),

    // Priority
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // Auto-delete after this time
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_dealership", ["dealershipId"])
    .index("by_created_at", ["createdAt"])
    .index("by_expires_at", ["expiresAt"]),

  /**
   * Email campaigns for B2B (platform to dealers) and B2C (dealers to clients)
   */
  email_campaigns: defineTable({
    // Campaign Info
    name: v.string(),
    subject: v.string(),
    previewText: v.optional(v.string()),

    // Campaign Type
    campaignType: v.union(
      v.literal("b2b_announcement"), // Platform to all dealers
      v.literal("b2b_feature_update"), // New feature announcement
      v.literal("b2b_billing"), // Billing related
      v.literal("b2b_onboarding"), // Onboarding sequence
      v.literal("b2c_promotion"), // Dealer to clients promotion
      v.literal("b2c_newsletter"), // Dealer newsletter to clients
      v.literal("b2c_deal_update"), // Deal status update to client
      v.literal("transactional") // System emails (receipts, confirmations)
    ),

    // Content
    templateId: v.optional(v.string()), // Resend template ID
    htmlContent: v.optional(v.string()), // Custom HTML if not using template
    textContent: v.optional(v.string()), // Plain text version

    // Sender (for B2B, this is platform; for B2C, this is dealership)
    senderType: v.union(v.literal("platform"), v.literal("dealership")),
    senderDealershipId: v.optional(v.id("dealerships")), // For B2C campaigns
    senderEmail: v.string(), // From email address
    senderName: v.string(), // From name
    replyTo: v.optional(v.string()),

    // Recipients
    recipientType: v.union(
      v.literal("all_dealers"), // All dealerships
      v.literal("specific_dealers"), // Selected dealerships
      v.literal("all_clients"), // All clients for a dealership
      v.literal("specific_clients"), // Selected clients
      v.literal("single_user") // Single recipient
    ),
    recipientDealershipIds: v.optional(v.array(v.id("dealerships"))),
    recipientUserIds: v.optional(v.array(v.id("users"))),
    recipientClientIds: v.optional(v.array(v.id("clients"))),
    recipientEmails: v.optional(v.array(v.string())), // Direct email list

    // Scheduling
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),

    // Analytics
    totalRecipients: v.number(),
    totalSent: v.number(),
    totalDelivered: v.number(),
    totalOpened: v.number(),
    totalClicked: v.number(),
    totalBounced: v.number(),
    totalUnsubscribed: v.number(),

    // Settings
    trackOpens: v.boolean(),
    trackClicks: v.boolean(),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_sender_dealership", ["senderDealershipId"])
    .index("by_status", ["status"])
    .index("by_campaign_type", ["campaignType"])
    .index("by_scheduled_at", ["scheduledAt"])
    .index("by_created_by", ["createdBy"]),

  /**
   * Individual email sends (tracks each email sent)
   */
  email_sends: defineTable({
    campaignId: v.optional(v.id("email_campaigns")),

    // Recipient
    recipientEmail: v.string(),
    recipientUserId: v.optional(v.id("users")),
    recipientClientId: v.optional(v.id("clients")),
    recipientDealershipId: v.optional(v.id("dealerships")),

    // Email Content
    subject: v.string(),
    fromEmail: v.string(),
    fromName: v.string(),

    // Resend Integration
    resendEmailId: v.optional(v.string()), // Resend's email ID

    // Status
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed"),
      v.literal("opened"),
      v.literal("clicked")
    ),

    // Tracking
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    bouncedAt: v.optional(v.number()),

    // Error handling
    errorMessage: v.optional(v.string()),

    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_recipient_email", ["recipientEmail"])
    .index("by_recipient_user", ["recipientUserId"])
    .index("by_status", ["status"])
    .index("by_sent_at", ["sentAt"]),

  /**
   * Email templates for reusable email designs
   */
  email_templates: defineTable({
    // Template Info
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("b2b_transactional"),
      v.literal("b2b_marketing"),
      v.literal("b2c_transactional"),
      v.literal("b2c_marketing"),
      v.literal("system")
    ),

    // Content
    subject: v.string(),
    previewText: v.optional(v.string()),
    htmlContent: v.string(),
    textContent: v.optional(v.string()),

    // Variables (for template interpolation)
    variables: v.array(
      v.object({
        name: v.string(), // {{dealershipName}}
        description: v.string(),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
      })
    ),

    // Resend Integration
    resendTemplateId: v.optional(v.string()),

    // Settings
    isActive: v.boolean(),
    isSystemTemplate: v.boolean(), // Cannot be deleted

    // Ownership (null = platform template, otherwise dealership template)
    dealershipId: v.optional(v.id("dealerships")),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_category", ["category"])
    .index("by_dealership", ["dealershipId"])
    .index("by_active", ["isActive"]),

  /**
   * Email preferences and unsubscribe management
   */
  email_preferences: defineTable({
    // User/Client
    email: v.string(),
    userId: v.optional(v.id("users")),
    clientId: v.optional(v.id("clients")),
    dealershipId: v.optional(v.id("dealerships")),

    // Preferences
    emailType: v.union(
      v.literal("marketing"), // Marketing emails
      v.literal("transactional"), // Order confirmations, receipts
      v.literal("notifications"), // Activity notifications
      v.literal("newsletters"), // Regular newsletters
      v.literal("promotions") // Special offers
    ),

    isSubscribed: v.boolean(),
    unsubscribedAt: v.optional(v.number()),
    unsubscribeReason: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_email_type", ["emailType", "isSubscribed"]),

  /**
   * Desktop app license keys (Stripe integration)
   * For standalone desktop app monetization
   */
  licenses: defineTable({
    // Purchase info
    paymentIntentId: v.optional(v.string()), // Stripe Payment Intent ID (for one-time purchases)
    checkoutSessionId: v.optional(v.string()), // Stripe Checkout Session ID
    stripeSubscriptionId: v.optional(v.string()), // Stripe Subscription ID (for subscription-based licenses)
    licenseKey: v.string(), // Format: DEALER-XXXX-XXXX-XXXX
    customerEmail: v.string(),
    stripeCustomerId: v.string(), // Stripe customer ID
    stripeProductId: v.string(), // Stripe product ID
    stripePriceId: v.string(), // Stripe price ID

    // License tier
    tier: v.union(
      v.literal("single"), // Single user/machine
      v.literal("team"), // Small team (5 users)
      v.literal("enterprise") // Unlimited users
    ),

    // Activation limits
    maxActivations: v.number(), // 1, 5, or unlimited (-1)
    activations: v.array(
      v.object({
        machineId: v.string(), // Unique machine identifier
        activatedAt: v.number(),
        lastSeen: v.number(),
        platform: v.string(), // windows, macos, linux
        appVersion: v.string(),
        hostname: v.optional(v.string()),
      })
    ),

    // Status
    isActive: v.boolean(),
    issuedAt: v.number(),
    expiresAt: v.optional(v.number()), // null for perpetual licenses

    // Payment info
    amount: v.number(), // Amount paid in cents
    currency: v.string(), // USD, EUR, etc.

    // Association
    dealershipId: v.optional(v.id("dealerships")), // Linked after activation
    userId: v.optional(v.id("users")), // Primary user

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    notes: v.optional(v.string()), // Admin notes
  })
    .index("by_license_key", ["licenseKey"])
    .index("by_customer", ["customerEmail"])
    .index("by_dealership", ["dealershipId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_status", ["isActive"]),

  /**
   * Standalone users (for desktop app)
   * Email/password authentication for standalone operation
   */
  standalone_users: defineTable({
    email: v.string(),
    passwordHash: v.string(), // bcrypt hash
    name: v.string(),
    businessName: v.optional(v.string()),

    // License association
    licenseKey: v.optional(v.string()),

    // Subscription
    subscriptionId: v.optional(v.id("standalone_subscriptions")),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("trial"),
      v.literal("none"),
      v.literal("pending")
    ),
    stripeCustomerId: v.optional(v.string()), // Stripe customer ID for subscription management

    // Trial info
    trialEndsAt: v.optional(v.number()),

    // Security
    emailVerified: v.boolean(),
    verificationToken: v.optional(v.string()),
    resetToken: v.optional(v.string()),
    resetTokenExpiresAt: v.optional(v.number()),

    // Metadata
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_license", ["licenseKey"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_verification_token", ["verificationToken"])
    .index("by_reset_token", ["resetToken"]),

  /**
   * Standalone subscriptions (Stripe integration)
   * Monthly recurring billing for desktop app
   */
  standalone_subscriptions: defineTable({
    userId: v.id("standalone_users"),

    // Stripe info
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    stripeProductId: v.string(),

    // Subscription details
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("incomplete"),
      v.literal("trialing"),
      v.literal("unpaid")
    ),

    // Billing
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    cancelledAt: v.optional(v.number()),

    // Plan info
    planName: v.string(), // "monthly" or "annual"
    amount: v.number(), // in cents
    currency: v.string(),
    interval: v.union(v.literal("month"), v.literal("year")),

    // Trial
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_status", ["status"]),

  /**
   * Standalone clients (synced from desktop SQLite)
   * Stores client data for standalone users
   */
  standalone_clients: defineTable({
    userId: v.string(), // Standalone user ID (string, not Convex ID)
    localId: v.string(), // Local SQLite ID

    // Client information
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    driversLicense: v.optional(v.string()),

    // Sync metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    syncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_local_id", ["userId", "localId"]),

  /**
   * Standalone vehicles (synced from desktop SQLite)
   * Stores vehicle inventory data for standalone users
   */
  standalone_vehicles: defineTable({
    userId: v.string(), // Standalone user ID
    localId: v.string(), // Local SQLite ID

    // Vehicle information
    vin: v.string(),
    stockNumber: v.optional(v.string()),
    year: v.number(),
    make: v.string(),
    model: v.string(),
    trim: v.optional(v.string()),
    body: v.optional(v.string()),
    doors: v.optional(v.number()),
    transmission: v.optional(v.string()),
    engine: v.optional(v.string()),
    cylinders: v.optional(v.number()),
    titleNumber: v.optional(v.string()),
    mileage: v.number(),
    color: v.optional(v.string()),
    price: v.number(),
    cost: v.number(),
    status: v.string(),
    description: v.optional(v.string()),

    // Sync metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    syncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_local_id", ["userId", "localId"])
    .index("by_vin", ["userId", "vin"]),

  /**
   * Standalone deals (synced from desktop SQLite)
   * Stores deal data for standalone users
   */
  standalone_deals: defineTable({
    userId: v.string(), // Standalone user ID
    localId: v.string(), // Local SQLite ID

    // Deal information
    type: v.string(), // "retail", "wholesale", "lease"
    clientLocalId: v.string(), // Reference to standalone_clients.localId
    vehicleLocalId: v.string(), // Reference to standalone_vehicles.localId
    status: v.string(), // "draft", "pending", "sold", etc.
    totalAmount: v.number(),
    saleDate: v.optional(v.number()),
    saleAmount: v.optional(v.number()),
    salesTax: v.optional(v.number()),
    docFee: v.optional(v.number()),
    tradeInValue: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    financedAmount: v.optional(v.number()),
    documentIds: v.array(v.string()), // Array of document local IDs
    cobuyerData: v.optional(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        addressLine2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        driversLicense: v.optional(v.string()),
      })
    ),

    // Sync metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    syncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_local_id", ["userId", "localId"])
    .index("by_client", ["userId", "clientLocalId"])
    .index("by_vehicle", ["userId", "vehicleLocalId"])
    .index("by_status", ["userId", "status"]),

  /**
   * Standalone documents (synced from desktop SQLite)
   * Stores document metadata (actual PDFs stored in S3)
   */
  standalone_documents: defineTable({
    userId: v.string(), // Standalone user ID
    localId: v.string(), // Local SQLite ID
    dealLocalId: v.string(), // Reference to standalone_deals.localId

    // Document information
    type: v.string(), // "bill_of_sale", "buyers_order", etc.
    filename: v.string(),
    s3Key: v.string(), // S3 key where PDF is stored
    fileSize: v.optional(v.number()),
    fileChecksum: v.optional(v.string()),

    // Sync metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    syncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_local_id", ["userId", "localId"])
    .index("by_deal", ["userId", "dealLocalId"]),

  /**
   * VIN Decode Cache
   * Caches VIN decode results from NHTSA vPIC API
   * Reduces API calls and improves performance
   */
  vin_cache: defineTable({
    vin: v.string(), // 17-character VIN (uppercase)
    data: v.string(), // JSON string of DecodedVIN
    createdAt: v.number(),
    lastAccessedAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(), // Cache expiration timestamp (90 days)
  })
    .index("by_vin", ["vin"])
    .index("by_expires", ["expiresAt"]),
});
