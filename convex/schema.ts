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

export const SubscriptionPlan = {
  BASIC: "basic",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
} as const;

export const BillingCycle = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export const SubscriptionFeatures = {
  [SubscriptionPlan.BASIC]: [
    "inventory_management",
    "basic_reporting",
    "employee_management",
    "customer_management",
    "file_storage_5gb",
  ],
  [SubscriptionPlan.PREMIUM]: [
    "inventory_management",
    "advanced_reporting",
    "employee_management",
    "customer_management",
    "document_generation",
    "analytics",
    "file_storage_50gb",
    "api_access",
    "deals_management",
    "desktop_app_access",
    "custom_document_upload",
  ],
  [SubscriptionPlan.ENTERPRISE]: [
    "inventory_management",
    "advanced_reporting",
    "employee_management",
    "customer_management",
    "document_generation",
    "analytics",
    "file_storage_unlimited",
    "api_access",
    "custom_integrations",
    "priority_support",
    "audit_logs",
    "deals_management",
    "desktop_app_access",
    "custom_document_upload",
  ],
} as const;

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
  file_uploads: defineTable({
    dealershipId: v.id("dealerships"),
    uploadedBy: v.string(), // user ID
    fileName: v.string(),
    originalFileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    category: v.string(), // vehicles, documents, logos, profiles, custom_documents
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
      v.literal("AVAILABLE"),
      v.literal("SOLD"),
      v.literal("PENDING"),
      v.literal("RESERVED")
    ),
    featured: v.boolean(),
    features: v.optional(v.string()),
    dealershipId: v.string(),
    clientId: v.optional(v.string()),
    // Additional fields
    costPrice: v.optional(v.number()), // Encrypted
    profit: v.optional(v.number()), // Calculated field
    daysOnLot: v.optional(v.number()),
    // SEO
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
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
      v.literal("LEAD"),
      v.literal("CUSTOMER"),
      v.literal("PREVIOUS")
    ),
    notes: v.optional(v.string()),
    createdById: v.optional(v.string()),
    dealershipId: v.string(),
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
    status: v.string(),
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
    documentStatus: v.optional(v.string()), // "none", "in_progress", "complete"
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
  dealer_uploaded_documents: defineTable({
    dealId: v.id("deals"),
    dealershipId: v.id("dealerships"),
    documentName: v.string(),
    documentType: v.string(), // contract, agreement, form, etc.
    fileId: v.id("file_uploads"),
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
    s3Key: v.string(), // Path to PDF template in S3
    fileSize: v.number(),

    // Field mapping (extracted PDF form fields)
    fields: v.array(
      v.object({
        name: v.string(),
        type: v.union(
          v.literal("text"),
          v.literal("number"),
          v.literal("date"),
          v.literal("checkbox"),
          v.literal("signature")
        ),
        label: v.string(),
        required: v.boolean(),
        defaultValue: v.optional(v.string()),
        // Maps to PDF form field name
        pdfFieldName: v.string(),
      })
    ),

    // Metadata
    uploadedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_dealership_and_category", ["dealershipId", "category"])
    .index("by_active", ["isActive"])
    .index("by_org", ["orgId"]),

  documentInstances: defineTable({
    dealershipId: v.id("dealerships"),
    orgId: v.optional(v.id("orgs")),

    // Links
    templateId: v.id("documentTemplates"),
    dealId: v.id("deals"),

    // Document data
    data: v.any(), // Filled form data (JSON)

    // Status machine
    status: v.union(
      v.literal("DRAFT"),
      v.literal("READY"),
      v.literal("SIGNED"),
      v.literal("VOID")
    ),

    // S3 storage for generated PDF
    s3Key: v.optional(v.string()), // Filled PDF in S3
    fileSize: v.optional(v.number()),

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
  })
    .index("by_dealership", ["dealershipId"])
    .index("by_deal", ["dealId"])
    .index("by_template", ["templateId"])
    .index("by_status", ["status"])
    .index("by_org", ["orgId"]),
});
