# Comprehensive Codebase Analysis & Improvement Roadmap

**Generated:** 2025-11-05
**Project:** Dealer Applications - DMS Platform
**Scope:** Full codebase analysis with actionable recommendations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [UX Improvements](#ux-improvements)
3. [Missing Features & Functionality](#missing-features--functionality)
4. [Security Improvements](#security-improvements)
5. [Code Cleanup & Refactoring](#code-cleanup--refactoring)
6. [Stripe Management Consolidation](#stripe-management-consolidation)
7. [Master Admin System](#admin-system)
8. [S3 Bucket Cleanup & Optimization](#s3-bucket-cleanup--optimization)
9. [Technical Debt & Known Issues](#technical-debt--known-issues)
10. [Priority Matrix](#priority-matrix)
11. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### Current State
The Dealer Applications platform is a **production-grade monorepo** with solid architecture but has accumulated technical debt and incomplete features. The codebase shows **good engineering fundamentals** but needs **consolidation, cleanup, and completion** of partially implemented features.

### Key Findings

✅ **Strengths:**
- Modern tech stack (React 19, Next.js 15, Tauri 2, Convex)
- Comprehensive RBAC system with granular permissions
- Real-time synchronization across web and desktop
- Solid document generation foundation
- Good security logging infrastructure

⚠️ **Critical Issues:**
1. **Stripe code scattered** across 2 files (1,137 total lines) with duplication
2. **Dual S3 implementations** (s3_utils.ts + secure_s3.ts = 1,485 lines total)
3. **Org/OrgMembers tables exist in schema but NOT IMPLEMENTED**
4. **No master admin system** for multi-dealership management
5. **Desktop app has 4 critical bugs** (PDF signing, printing, updater, PDF viewing)
6. **Debug code in production** (convex/debug.ts - 300+ lines)
7. **Missing webhook idempotency** for Stripe
8. **No environment variable validation**

### Impact Assessment

| Category | Files Affected | Lines to Refactor | Estimated Effort |
|----------|---------------|------------------|------------------|
| Stripe Consolidation | 2 core + 3 utils | ~1,200 | 2-3 days |
| S3 Cleanup | 3 files | ~1,500 | 3-4 days |
| Master Admin | New system | ~800 | 4-5 days |
| Org System Implementation | 8 files | ~1,000 | 5-7 days |
| Security Hardening | 12 files | ~400 | 2-3 days |
| Desktop Bug Fixes | 6 files | ~300 | 3-4 days |

**Total Estimated Effort:** ~20-30 days for a solo developer

---

## UX Improvements

### 1. Desktop App (apps/desktop)

#### 1.1 Critical Fixes Needed
**File:** `apps/desktop/todo.md`

```markdown
Current Issues:
❌ Signature signing onto PDFs not working
❌ Printing functionality broken
❌ Updater functionality broken
❌ Build not showing actual PDFs
```

**Impact:** Desktop app is essentially non-functional for core workflows.

**Recommended Fixes:**

##### Fix 1: PDF Signature Integration
- **File:** `apps/desktop/src/components/documents/DocumentViewer.tsx`
- **Issue:** PDF.js viewer not properly integrated with signature capture
- **Solution:**
  ```typescript
  // Add signature overlay component
  // Integrate with pdf-lib for embedding signatures
  // Add signature validation before saving
  ```
- **Effort:** 1-2 days

##### Fix 2: Print Functionality
- **File:** `apps/desktop/src-tauri/src/printing.rs` (needs creation)
- **Issue:** No Tauri printing command implemented
- **Solution:**
  - Use Tauri's `tauri-plugin-printer` or native OS print dialogs
  - Add Rust command for `print_document`
- **Effort:** 1 day

##### Fix 3: Auto-Updater
- **File:** `apps/desktop/src-tauri/tauri.conf.json`
- **Issue:** Update configuration incomplete
- **Current Config:**
  ```json
  "updater": {
    "active": true,
    "endpoints": ["https://releases.example.com/{{target}}/{{current_version}}"],
    "dialog": true,
    "pubkey": "..." // Needs to be set
  }
  ```
- **Solution:**
  - Set up GitHub releases endpoint
  - Generate signing keys
  - Implement update check on app startup
- **Effort:** 1-2 days

##### Fix 4: PDF Rendering in Build
- **File:** `apps/desktop/public/pdfjs-viewer/`
- **Issue:** PDF.js worker not bundled correctly in production build
- **Solution:**
  ```typescript
  // vite.config.ts
  export default {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.worker.js')) {
              return 'assets/[name].[hash].js'
            }
            return 'assets/[name].[hash].[ext]'
          }
        }
      }
    }
  }
  ```
- **Effort:** 0.5 days

#### 1.2 UX Enhancements

##### Enhancement 1: Offline Mode Indicator
- **Current:** No visual feedback when offline
- **Proposed:**
  ```tsx
  // Add connection status banner
  <ConnectionStatusBanner
    online={isOnline}
    syncPending={pendingSyncCount}
  />
  ```
- **Files:** `apps/desktop/src/components/layout/Header.tsx`
- **Effort:** 0.5 days

##### Enhancement 2: Loading States & Skeletons
- **Current:** Inconsistent loading indicators
- **Proposed:**
  - Implement skeleton screens for inventory, deals, clients
  - Add optimistic UI updates for mutations
  - Show progress indicators for large operations
- **Files:** `apps/desktop/src/components/ui/skeleton.tsx` + 12 page components
- **Effort:** 1-2 days

##### Enhancement 3: Keyboard Shortcuts
- **Current:** None implemented
- **Proposed:**
  ```typescript
  // Common shortcuts
  Cmd/Ctrl + K → Quick search
  Cmd/Ctrl + N → New inventory item
  Cmd/Ctrl + D → New deal
  Cmd/Ctrl + , → Settings
  Cmd/Ctrl + P → Print
  ```
- **Files:** `apps/desktop/src/lib/keyboard-shortcuts.ts`
- **Effort:** 1 day

##### Enhancement 4: Data Tables Improvements
- **Current:** Basic tables with limited functionality
- **Proposed:**
  - Column sorting (persistent)
  - Column resizing & reordering
  - Bulk selection & actions
  - Export to CSV/Excel
  - Advanced filters (date range, multi-select, search)
- **Files:** All `**/table.tsx` components
- **Effort:** 2-3 days

---

### 2. Web CMS (apps/web)

#### 2.1 Dashboard UX Issues

##### Issue 1: Subscription Status Confusion
- **File:** `apps/web/src/app/(dashboard)/layout.tsx`
- **Current Problem:**
  - Users get redirected to subscription page even with pending payment
  - No clear messaging about subscription status
  - Force sync button hidden in settings
- **Solution:**
  ```tsx
  // Add subscription status banner
  {subscriptionStatus === 'pending' && (
    <Banner variant="warning">
      Your payment is processing. Full access will be granted shortly.
      <Button onClick={forceSyncSubscription}>Refresh Status</Button>
    </Banner>
  )}
  ```
- **Effort:** 0.5 days

##### Issue 2: No Bulk Operations
- **Current:** Must update inventory/clients one at a time
- **Proposed:**
  - Bulk delete
  - Bulk status update (AVAILABLE → SOLD)
  - Bulk export
  - Bulk import with CSV validation
- **Files:** `apps/web/src/app/(dashboard)/inventory/page.tsx`, `apps/web/src/app/(dashboard)/clients/page.tsx`
- **Effort:** 2 days

##### Issue 3: Poor Mobile Responsiveness
- **Current:** Dashboard barely usable on mobile/tablet
- **Proposed:**
  - Responsive data tables (card view on mobile)
  - Mobile-friendly navigation
  - Touch-optimized controls
- **Files:** All dashboard pages + layouts
- **Effort:** 3-4 days

#### 2.2 Document Management UX

##### Issue 1: No Progress Feedback for Document Generation
- **Current:** Silent failure or success
- **Proposed:**
  ```tsx
  // Add document generation progress
  <DocumentGenerationProgress
    dealId={dealId}
    steps={[
      'Loading template',
      'Filling fields',
      'Generating PDF',
      'Uploading to S3',
      'Creating audit log'
    ]}
    currentStep={currentStep}
  />
  ```
- **Files:** `apps/web/src/app/(dashboard)/deals/[id]/documents/page.tsx`
- **Effort:** 1 day

##### Issue 2: Template Upload Process Unclear
- **File:** `apps/web/src/app/(dashboard)/settings/document-templates/upload/page.tsx`
- **Current:** No validation feedback during upload
- **Proposed:**
  - Real-time PDF preview
  - Field extraction progress indicator
  - Validation errors before save
  - Template versioning UI
- **Effort:** 2 days

#### 2.3 Settings Page Improvements

**Current Settings Pages:**
```
settings/
├── api-keys/          ✅ Good
├── api-usage/         ⚠️ Basic
├── billing/           ⚠️ Needs Stripe portal integration
├── cache/             ❌ Debug tool (should be removed)
├── developer/         ⚠️ Incomplete
├── document-templates/ ✅ Good foundation
├── domain/            ⚠️ Verification flow incomplete
├── general/           ✅ Good
├── ip-management/     ✅ Good
├── notifications/     ⚠️ Not connected to actual notifications
└── users/             ✅ Good
```

**Improvements Needed:**

1. **Billing Page:** Add Stripe Customer Portal
   ```tsx
   // Redirect to Stripe-hosted billing management
   const portalSession = await stripe.billingPortal.sessions.create({
     customer: dealership.stripeCustomerId,
     return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
   })
   ```
   - **Effort:** 0.5 days

2. **Remove Cache Page:** Debug tool not needed in production
   - **Effort:** 0.1 days

3. **API Usage Page:** Add charts and rate limit monitoring
   - **Effort:** 1 day

4. **Domain Verification:** Complete DNS TXT + HTTP file verification flows
   - **Effort:** 2 days (covered in roadmap docs)

---

## Missing Features & Functionality

### 1. Master Admin System (CRITICAL)

**Status:** ❌ **NOT IMPLEMENTED** despite schema existing

**Current State:**
- `orgs` table exists in schema (line 944 in `convex/schema.ts`)
- `orgMembers` table exists in schema (line 974)
- **BUT:** No mutations, queries, or UI implemented
- Multiple TODOs reference this system

**Files with TODOs:**
```
convex/guards.ts:89       // TODO: Query orgMembers table when it exists
convex/guards.ts:283      // TODO: Use orgMembers.permissions when implemented
convex/permissions.ts:200 // TODO: When orgMembers exists, check array first
convex/permissions.ts:221 // TODO: When orgMembers exists, merge permissions
```

**Required Implementation:**

#### Schema (Already Exists):
```typescript
// convex/schema.ts (lines 944-1000)
orgs: defineTable({
  name: string,
  slug: string,
  stripeCustomerId: string,
  billingEmail: string,
  settings: object,
  createdAt: number,
  updatedAt: number
}).index("by_slug", ["slug"])

orgMembers: defineTable({
  orgId: Id<"orgs">,
  userId: Id<"users">,
  role: OrgRole, // OWNER, ADMIN, MEMBER
  permissions: array<string>,
  invitedBy: Id<"users">,
  createdAt: number
}).index("by_org", ["orgId"])
  .index("by_user", ["userId"])
```

#### Missing Files to Create:

**1. `convex/orgs.ts` - Core org management (NEW FILE)**
```typescript
// Mutations needed:
- createOrg()
- updateOrg()
- deleteOrg()
- addOrgMember()
- removeOrgMember()
- updateOrgMemberRole()
- transferOwnership()

// Queries needed:
- getOrg()
- getAllOrgs()
- getOrgMembers()
- getOrgsByUser()
- getOrgBillingInfo()
- getOrgUsageStats()
```
**Effort:** 2 days

**2. `apps/web/src/app/(admin)/` - Master admin UI (NEW DIRECTORY)**

Required pages:
```
(admin)/
├── layout.tsx              → Guard for super admin only
├── page.tsx                → Dashboard with org overview
├── orgs/
│   ├── page.tsx            → List all orgs (data table)
│   ├── [orgId]/
│   │   ├── page.tsx        → Org details
│   │   ├── members/page.tsx→ Manage org members
│   │   ├── billing/page.tsx→ View billing status
│   │   ├── usage/page.tsx  → Storage, API calls, users
│   │   └── settings/page.tsx→ Org-level settings
├── users/
│   └── page.tsx            → Global user search & management
├── billing/
│   └── page.tsx            → All subscriptions overview
├── analytics/
│   └── page.tsx            → Platform-wide metrics
└── security/
    └── page.tsx            → Security logs across all orgs
```
**Effort:** 3-4 days

**3. Master Admin Features:**

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Org Overview Table** | List all orgs with key metrics | P0 | 1 day |
| **Impersonation** | Login as org admin (with audit) | P1 | 1 day |
| **Usage Monitoring** | Storage, API calls, users per org | P0 | 1 day |
| **Billing Dashboard** | All subscriptions, MRR, churn | P1 | 1 day |
| **Bulk Operations** | Suspend org, reset data, etc. | P2 | 1 day |
| **Security Dashboard** | Failed logins, rate limits | P1 | 1 day |
| **Analytics** | Signup funnel, retention metrics | P2 | 2 days |

**Total Effort:** 5-7 days

---

### 2. Webhook Idempotency (CRITICAL)

**Current State:**
- `convex/stripe_webhook.ts` handles webhooks but **no idempotency store**
- Risk of duplicate subscription updates

**Required:**

```typescript
// convex/schema.ts - Add table
webhook_events: defineTable({
  eventId: v.string(),     // Stripe event ID
  type: v.string(),
  processedAt: v.number(),
  success: v.boolean(),
  error: v.optional(v.string()),
}).index("by_event_id", ["eventId"])

// convex/stripe_webhook.ts - Add check
export const handleStripeWebhook = internalAction({
  handler: async (ctx, args) => {
    const event = stripe.webhooks.constructEvent(...)

    // IDEMPOTENCY CHECK
    const existing = await ctx.runQuery(internal.webhooks.checkProcessed, {
      eventId: event.id
    })
    if (existing) {
      console.log(`Event ${event.id} already processed, skipping`)
      return { success: true, duplicate: true }
    }

    // Process event...

    // Mark as processed
    await ctx.runMutation(internal.webhooks.markProcessed, {
      eventId: event.id,
      type: event.type,
      success: true
    })
  }
})
```

**Files to Modify:**
- `convex/schema.ts` (add table)
- `convex/stripe_webhook.ts` (add idempotency)
- `convex/webhooks.ts` (NEW FILE - webhook utilities)

**Effort:** 0.5 days

---

### 3. Environment Variable Validation

**Current State:**
- No validation of required env vars
- App crashes at runtime if missing

**Required:**

```typescript
// convex/env.ts (NEW FILE)
import { z } from "zod"

const envSchema = z.object({
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_BASIC_MONTHLY_PRICE_ID: z.string().startsWith("price_"),
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: z.string().startsWith("price_"),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().startsWith("price_"),

  // AWS S3
  AWS_S3_BUCKET_NAME: z.string().min(3),
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  // Clerk
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),

  // Convex
  CONVEX_DEPLOYMENT: z.string(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),

  // Optional
  RESEND_API_KEY: z.string().optional(),
})

export function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error("❌ Environment validation failed:")
    console.error(error)
    process.exit(1)
  }
}

// Call in convex/init.ts and apps/web/middleware.ts
validateEnv()
```

**Effort:** 0.5 days

---

### 4. Public Inventory API (Partially Complete)

**Current State:**
- `convex/public_api.ts` exists (486 lines)
- Domain verification table exists in schema
- **BUT:** Domain verification flow NOT IMPLEMENTED

**Missing:**

1. **DNS TXT Verification**
   ```typescript
   // convex/domain_verification.ts (NEW FILE)
   export const verifyDNSTXT = action({
     args: { domain: v.string(), token: v.string() },
     handler: async (ctx, args) => {
       // Use DNS lookup to check for TXT record
       // uab-verify=<token>
     }
   })
   ```

2. **HTTP File Verification**
   ```typescript
   export const verifyHTTPFile = action({
     args: { domain: v.string(), token: v.string() },
     handler: async (ctx, args) => {
       // Fetch https://${domain}/uab-verify.txt
       // Check if content matches token
     }
   })
   ```

3. **UI for Domain Verification**
   - `apps/web/src/app/(dashboard)/settings/domain/page.tsx` exists but incomplete
   - Need step-by-step wizard

**Effort:** 2 days (already planned in existing roadmap docs)

---

### 5. Advanced Analytics & Reporting

**Current State:**
- Basic dashboard with stats
- No charts or visualizations
- No custom report builder

**Missing Features:**

1. **Sales Analytics**
   - Revenue trends (daily/weekly/monthly)
   - Average deal value
   - Sales by salesperson
   - Inventory turnover rate
   - Days on lot analysis

2. **Custom Report Builder**
   - Filter by date range, vehicle type, salesperson, etc.
   - Export to PDF/Excel
   - Schedule recurring reports

3. **Visualizations**
   - Chart.js or Recharts integration
   - Revenue graphs
   - Inventory pie charts
   - Sales funnel

**Files to Create:**
```
apps/web/src/app/(dashboard)/analytics/
├── page.tsx              → Overview
├── sales/page.tsx        → Sales analytics
├── inventory/page.tsx    → Inventory analytics
├── reports/
│   ├── page.tsx          → Report builder
│   └── [reportId]/page.tsx
```

**Effort:** 5-7 days

---

### 6. Mobile App (Planned but Not Started)

**From README.md:**
```markdown
### 🚧 In Development
- [ ] Mobile application (iOS/Android)
```

**Recommendation:**
- Use React Native or Expo
- Share business logic with web/desktop via shared packages
- Start with read-only views (inventory, deals)

**Effort:** 30+ days (full app)

---

### 7. Email Notifications & Automation

**Current State:**
- Resend integration exists
- Email templates in `apps/web/react-email/`
- **BUT:** No automated emails

**Missing:**

1. **Deal Notifications**
   - Email client when deal is ready for signature
   - Email dealer when client signs
   - Send reminders for unsigned deals

2. **Inventory Alerts**
   - Low inventory alerts
   - Price drop notifications to leads
   - New inventory emails to subscribed clients

3. **Campaign Management**
   - `campaigns` table exists in schema
   - **BUT:** No email sending implementation
   - Need integration with Resend or SendGrid

**Files:**
- `convex/campaigns.ts` (NEW FILE)
- `convex/crons.ts` (exists, add scheduled campaigns)
- `apps/web/src/app/(dashboard)/marketing/campaigns/` (NEW)

**Effort:** 3-4 days

---

### 8. Activity Feed / Audit Trail UI

**Current State:**
- `security_logs` table exists and populated
- `activities` table exists
- **NO UI TO VIEW THEM**

**Missing:**

```tsx
// apps/web/src/app/(dashboard)/activity/page.tsx (NEW)
export default function ActivityFeed() {
  const logs = useQuery(api.security.getSecurityLogs, {
    dealershipId: currentDealership._id,
    limit: 100
  })

  return (
    <Timeline>
      {logs.map(log => (
        <TimelineItem
          icon={getIconForAction(log.action)}
          time={log.timestamp}
          user={log.userId}
          description={log.details}
          severity={log.severity}
        />
      ))}
    </Timeline>
  )
}
```

**Effort:** 1 day

---

## Security Improvements

### 1. Encryption for Sensitive Data

**Current State:**
- Schema has comments like "Should be encrypted" but **NO ENCRYPTION IMPLEMENTED**

**Sensitive Fields:**
```typescript
// From schema.ts
clients: {
  phone: v.optional(v.string()),      // Should be encrypted
  creditScore: v.optional(v.string()), // Encrypted
  ssn: v.optional(v.string()),         // Encrypted
  driversLicense: v.optional(v.string()) // Encrypted
}

vehicles: {
  vin: v.string(),        // Should be encrypted in production
  costPrice: v.optional(v.number()) // Encrypted
}

dealerships: {
  taxId: v.optional(v.string()), // Encrypted
  s3AccessKeyId: v.optional(v.string()), // Encrypted
  s3SecretKey: v.optional(v.string())    // Encrypted
}
```

**Required:**

```typescript
// convex/lib/encryption.ts (NEW FILE)
import crypto from "crypto"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32-byte key
const ALGORITHM = "aes-256-gcm"

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":")

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

// Usage in mutations
export const createClient = mutation({
  handler: async (ctx, args) => {
    await ctx.db.insert("clients", {
      ...args,
      phone: encrypt(args.phone),
      ssn: encrypt(args.ssn),
      creditScore: encrypt(args.creditScore)
    })
  }
})

// Usage in queries
export const getClient = query({
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId)
    return {
      ...client,
      phone: decrypt(client.phone),
      ssn: decrypt(client.ssn),
      creditScore: decrypt(client.creditScore)
    }
  }
})
```

**Required Env Vars:**
```bash
ENCRYPTION_KEY=<32-byte-hex-string>
```

**Files to Modify:**
- Create `convex/lib/encryption.ts`
- Update `convex/clients.ts`
- Update `convex/vehicles.ts`
- Update `convex/dealerships.ts`

**Effort:** 2 days

---

### 2. API Rate Limiting (Partially Implemented)

**Current State:**
- `rate_limits` table exists
- **NO ENFORCEMENT**

**Required:**

```typescript
// convex/middleware/rate-limit.ts (NEW FILE)
export async function checkRateLimit(
  ctx: QueryCtx,
  identifier: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const key = `${identifier}:${action}`
  const now = Date.now()
  const windowStart = now - windowMs

  // Count requests in window
  const requests = await ctx.db
    .query("rate_limits")
    .withIndex("by_key_timestamp", (q) =>
      q.eq("key", key).gt("timestamp", windowStart)
    )
    .collect()

  if (requests.length >= limit) {
    // Log as blocked
    await ctx.db.insert("rate_limits", {
      key,
      identifier,
      action,
      timestamp: now,
      blocked: true,
      resetTime: windowStart + windowMs,
      ipAddress: "..."
    })

    return false // Rate limited
  }

  // Log request
  await ctx.db.insert("rate_limits", {
    key,
    identifier,
    action,
    timestamp: now,
    blocked: false,
    ipAddress: "..."
  })

  return true // Allowed
}

// Usage
export const getInventory = query({
  handler: async (ctx, args) => {
    const allowed = await checkRateLimit(
      ctx,
      ctx.auth.getUserIdentity()?.subject || "anonymous",
      "getInventory",
      100, // 100 requests
      60000 // per minute
    )

    if (!allowed) {
      throw new Error("Rate limit exceeded. Try again in 1 minute.")
    }

    // Continue...
  }
})
```

**Effort:** 1 day

---

### 3. IP Whitelisting Enforcement

**Current State:**
- `allowedIPs` table exists
- IP check middleware exists (`apps/web/src/middleware/ip-check.ts`)
- **BUT:** Only checks web requests, not Convex queries

**Required:**

```typescript
// convex/guards.ts - Add IP check
export async function requireIP(ctx: QueryCtx, ipAddress: string) {
  const allowed = await ctx.db
    .query("allowedIPs")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect()

  const isAllowed = allowed.some(record => {
    return ipAddress.startsWith(record.ip) || record.ip === "*"
  })

  if (!isAllowed) {
    await ctx.db.insert("security_logs", {
      action: "ip_blocked",
      ipAddress,
      success: false,
      details: `Blocked IP: ${ipAddress}`,
      timestamp: Date.now(),
      severity: "high"
    })

    throw new Error("Access denied: IP not whitelisted")
  }
}

// Usage in sensitive queries
export const getDealershipBilling = query({
  handler: async (ctx, args) => {
    // Get IP from request headers
    const ipAddress = ctx.requestHeaders?.get("x-forwarded-for") || "unknown"
    await requireIP(ctx, ipAddress)

    // Continue...
  }
})
```

**Effort:** 0.5 days

---

### 4. Two-Factor Authentication (2FA)

**Current State:**
- NOT IMPLEMENTED
- Clerk supports 2FA but not enabled

**Required:**

1. **Enable in Clerk Dashboard:**
   - Turn on 2FA for all users
   - Require for ADMIN and OWNER roles

2. **Add UI for 2FA Setup:**
   ```tsx
   // apps/web/src/app/(dashboard)/settings/security/page.tsx (NEW)
   <TwoFactorSetup
     enabled={user.twoFactorEnabled}
     onEnable={handleEnable2FA}
     onDisable={handleDisable2FA}
   />
   ```

**Effort:** 0.5 days (config) + 1 day (UI)

---

### 5. Security Headers & CSP

**Current State:**
- No Content Security Policy
- No security headers

**Required:**

```typescript
// apps/web/src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://*.convex.cloud https://api.stripe.com;
      frame-src https://js.stripe.com https://hooks.stripe.com;
    `.replace(/\s+/g, " ").trim()
  )

  return response
}
```

**Effort:** 0.5 days

---

## Code Cleanup & Refactoring

### 1. Remove Debug Code (CRITICAL)

**File:** `convex/debug.ts` (313 lines)

**Functions to Remove:**
```typescript
debugUserSubscription
debugFixUserSubscription
debugStripeWebhooks
debugCreateTestSubscription
debugUploadIssue
```

**Impact:** These are dev tools that should NOT be in production

**Action:**
```bash
# Option 1: Delete entirely
rm convex/debug.ts

# Option 2: Move to dev-only directory
mkdir convex/__dev__
mv convex/debug.ts convex/__dev__/
```

**Effort:** 0.1 days

---

### 2. Consolidate S3 Implementations (HIGH PRIORITY)

**Current State:**
- `convex/s3_utils.ts` (355 lines) - New org-based paths
- `convex/secure_s3.ts` (1,131 lines) - Bucket creation & security
- `apps/web/src/lib/s3-client.ts` - S3 client setup
- **Total:** ~1,500 lines across 3 files with DUPLICATION

**Issues:**
1. Two different path structures (org-based vs dealership-based)
2. Duplicate presigned URL generation
3. Unclear which to use when

**Recommended Consolidation:**

```typescript
// convex/lib/s3/index.ts (NEW FILE - Single source of truth)
export * from "./client"
export * from "./paths"
export * from "./presign"
export * from "./upload"
export * from "./security"

// convex/lib/s3/client.ts
export const s3Client = new S3Client({...})

// convex/lib/s3/paths.ts
export function generateS3Key(params: {
  orgId: string
  category: S3Category
  resourceId?: string
  fileName: string
}): string {
  // Single path generation logic
  // Always use org-based paths going forward
  return `org/${orgId}/${category}/${resourceId}/${fileName}`
}

// convex/lib/s3/presign.ts
export async function generateUploadUrl(s3Key: string, contentType: string) {
  // Single presign logic
}

export async function generateDownloadUrl(s3Key: string, expiresIn = 300) {
  // Single presign logic
}

// convex/lib/s3/upload.ts
export async function uploadFile(params: UploadParams) {
  // Validation
  // Generate key
  // Generate presigned URL
  // Return URL
}

// convex/lib/s3/security.ts
export async function validateUpload(category, contentType, fileSize) {
  // Content type validation
  // File size validation
  // Virus scanning (future)
}

// Migration path
export function migrateOldKeys(dealershipId: string, orgId: string) {
  // Copy objects from old path to new path
  // Keep old paths for 90 days, then delete
}
```

**Files to Delete/Archive:**
- Delete `convex/secure_s3.ts` (or move to `convex/__archive__/`)
- Consolidate `convex/s3_utils.ts` into new structure

**Effort:** 2 days

---

### 3. Stripe Code Consolidation (CRITICAL)

**Current State:**
- `convex/stripe_webhook.ts` (358 lines)
- `convex/subscriptions.ts` (779 lines)
- **Total:** 1,137 lines with DUPLICATION

**Issues:**
1. Duplicate status mapping functions
2. Price ID logic scattered
3. No centralized Stripe service
4. Webhook handling mixed with business logic

**Recommended Consolidation:**

```typescript
// convex/lib/stripe/index.ts (NEW FILE)
export * from "./client"
export * from "./subscriptions"
export * from "./webhooks"
export * from "./products"

// convex/lib/stripe/client.ts
import Stripe from "stripe"
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil"
})

// convex/lib/stripe/products.ts
export const PRICE_IDS = {
  BASIC_MONTHLY: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!,
  BASIC_YEARLY: process.env.STRIPE_BASIC_YEARLY_PRICE_ID!,
  PREMIUM_MONTHLY: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
  PREMIUM_YEARLY: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
  ENTERPRISE_MONTHLY: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
  ENTERPRISE_YEARLY: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!,
} as const

export function getPriceId(plan: SubscriptionPlan, cycle: BillingCycle): string {
  const key = `${plan.toUpperCase()}_${cycle.toUpperCase()}` as keyof typeof PRICE_IDS
  return PRICE_IDS[key]
}

export function parsePriceId(priceId: string): { plan: SubscriptionPlan; cycle: BillingCycle } {
  const entry = Object.entries(PRICE_IDS).find(([, id]) => id === priceId)
  if (!entry) throw new Error(`Unknown price ID: ${priceId}`)

  const [key] = entry
  const [plan, cycle] = key.split("_")

  return {
    plan: plan.toLowerCase() as SubscriptionPlan,
    cycle: cycle.toLowerCase() as BillingCycle
  }
}

// convex/lib/stripe/status.ts
export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    trialing: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    unpaid: SubscriptionStatus.CANCELLED,
    incomplete: SubscriptionStatus.PENDING,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    paused: SubscriptionStatus.PAST_DUE, // Treat as past due
  }

  return statusMap[stripeStatus] || SubscriptionStatus.PENDING
}

// convex/lib/stripe/webhooks.ts
export class WebhookHandler {
  async handle(event: Stripe.Event) {
    switch (event.type) {
      case "checkout.session.completed":
        return this.handleCheckoutComplete(event.data.object)
      case "customer.subscription.created":
        return this.handleSubscriptionCreated(event.data.object)
      case "customer.subscription.updated":
        return this.handleSubscriptionUpdated(event.data.object)
      case "customer.subscription.deleted":
        return this.handleSubscriptionDeleted(event.data.object)
      case "invoice.payment_succeeded":
        return this.handlePaymentSucceeded(event.data.object)
      case "invoice.payment_failed":
        return this.handlePaymentFailed(event.data.object)
      default:
        console.log(`Unhandled webhook: ${event.type}`)
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    // Centralized checkout logic
  }

  // ... other handlers
}

// Usage in convex/stripe_webhook.ts
import { WebhookHandler } from "./lib/stripe/webhooks"

export const handleStripeWebhook = internalAction({
  handler: async (ctx, args) => {
    const event = stripe.webhooks.constructEvent(...)

    // Check idempotency
    const processed = await checkIfProcessed(ctx, event.id)
    if (processed) return { success: true, duplicate: true }

    // Handle event
    const handler = new WebhookHandler(ctx)
    await handler.handle(event)

    // Mark as processed
    await markAsProcessed(ctx, event.id, event.type)

    return { success: true }
  }
})
```

**Files to Refactor:**
- Create `convex/lib/stripe/` directory structure
- Refactor `convex/subscriptions.ts` to use new utils
- Refactor `convex/stripe_webhook.ts` to use new utils

**Benefits:**
- ✅ Single source of truth for Stripe logic
- ✅ Easy to test
- ✅ Type-safe price ID handling
- ✅ Centralized status mapping
- ✅ Clean webhook handling

**Effort:** 2-3 days

---

### 4. Duplicate Code Removal

**Duplicates Found:**

1. **Status Mapping (Stripe):**
   - `convex/subscriptions.ts:52` - `mapStripeStatusToOurStatus()`
   - Used in multiple places
   - Should be in single utility

2. **Auth Helpers:**
   - `convex/dealerships.ts:7` - `requireAuth()`
   - `convex/guards.ts:31` - `requireAuth()`
   - **DUPLICATE** implementations

3. **S3 Path Generation:**
   - `convex/s3_utils.ts:32` - `generateOrgPath()`
   - `convex/secure_s3.ts:29` - `generateDealershipBucketName()`
   - Different approaches

4. **User Lookup:**
   - `getUserByClerkId()` implemented in multiple files

**Consolidation Plan:**

```typescript
// convex/lib/auth.ts (CONSOLIDATE ALL AUTH)
export async function requireAuth(ctx, token?) { ... }
export async function requireDealership(ctx) { ... }
export async function requireRole(ctx, role) { ... }

// convex/lib/users.ts (CONSOLIDATE USER QUERIES)
export async function getUserByClerkId(ctx, clerkId) { ... }
export async function getUserByEmail(ctx, email) { ... }

// Delete duplicates from other files
```

**Effort:** 1 day

---

### 5. TypeScript Strict Mode

**Current State:**
- `tsconfig.json` has `strict: false` or missing

**Required:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Impact:** Will surface ~100+ type errors that need fixing

**Effort:** 2-3 days

---

### 6. Unused Imports & Dead Code

**Tool:** Use `ts-prune` or `knip`

```bash
npx knip
```

**Expected:** 50-100 unused exports to remove

**Effort:** 1 day

---

## Stripe Management Consolidation

*See "Code Cleanup & Refactoring" → Section 3*

Summary of changes:
- ✅ Consolidate into `convex/lib/stripe/`
- ✅ Single status mapping function
- ✅ Centralized price ID handling
- ✅ Clean webhook handler class
- ✅ Add idempotency store
- ✅ Improve error handling

**Total Effort:** 2-3 days

---

## Master Admin System

*See "Missing Features & Functionality" → Section 1*

Summary:
- ✅ Implement `orgs` and `orgMembers` CRUD
- ✅ Create master admin UI at `/admin/master`
- ✅ Add org overview, usage, billing dashboards
- ✅ Implement impersonation with audit logging
- ✅ Add platform-wide analytics

**Total Effort:** 5-7 days

---

## S3 Bucket Cleanup & Optimization

### Current Issues

**1. Dual Path Structure:**
```
❌ Old (dealership-based):
  {dealershipId}/vehicles/{imageId}.jpg
  {dealershipId}/documents/{doc}.pdf

✅ New (org-based):
  org/{orgId}/vehicles/{vin}/{imageId}.jpg
  org/{orgId}/docs/templates/{templateId}/template.pdf
  org/{orgId}/docs/instances/{dealId}/{documentId}.pdf
```

**Problem:** Both exist, causing confusion and wasted storage

### Cleanup Plan

**Phase 1: Audit Current Storage (1 day)**

```typescript
// scripts/audit-s3.ts (NEW FILE)
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"

async function auditStorage() {
  const s3 = new S3Client({...})

  let continuationToken: string | undefined
  const stats = {
    oldPaths: 0,
    newPaths: 0,
    totalSize: 0,
    byCategory: {} as Record<string, number>
  }

  do {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      ContinuationToken: continuationToken
    }))

    for (const object of response.Contents || []) {
      if (object.Key?.startsWith("org/")) {
        stats.newPaths++
      } else {
        stats.oldPaths++
      }

      stats.totalSize += object.Size || 0
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  console.log("S3 Audit Results:")
  console.log(`Old paths: ${stats.oldPaths}`)
  console.log(`New paths: ${stats.newPaths}`)
  console.log(`Total size: ${(stats.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`)

  return stats
}
```

**Phase 2: Migration Script (2 days)**

```typescript
// scripts/migrate-s3-paths.ts (NEW FILE)
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

async function migrateOldPaths() {
  const s3 = new S3Client({...})

  // Get all dealerships with their orgIds
  const dealerships = await convex.query(api.dealerships.getAllDealerships)

  for (const dealership of dealerships) {
    console.log(`Migrating dealership: ${dealership._id}`)

    // List all objects with old path
    const oldPrefix = `${dealership._id}/`
    const newPrefix = `org/${dealership.orgId}/`

    // Copy each object to new location
    const objects = await listAllObjects(oldPrefix)

    for (const object of objects) {
      const oldKey = object.Key
      const category = determineCategory(oldKey)
      const newKey = generateNewKey(dealership.orgId, category, oldKey)

      // Copy
      await s3.send(new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${oldKey}`,
        Key: newKey
      }))

      console.log(`Copied: ${oldKey} → ${newKey}`)

      // Don't delete yet - mark for deletion after verification
      await db.insert("migration_log", {
        dealershipId: dealership._id,
        oldKey,
        newKey,
        migratedAt: Date.now(),
        verified: false
      })
    }
  }
}

// Verify migration
async function verifyMigration() {
  const logs = await db.query("migration_log")
    .filter(q => q.eq(q.field("verified"), false))
    .collect()

  for (const log of logs) {
    const oldExists = await objectExists(log.oldKey)
    const newExists = await objectExists(log.newKey)

    if (newExists && compareSizes(log.oldKey, log.newKey)) {
      await db.patch(log._id, { verified: true })
      console.log(`✅ Verified: ${log.oldKey}`)
    }
  }
}

// Delete old objects (after 30 days of verification)
async function deleteOldObjects() {
  const logs = await db.query("migration_log")
    .filter(q =>
      q.and(
        q.eq(q.field("verified"), true),
        q.lt(q.field("migratedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
    )
    .collect()

  for (const log of logs) {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: log.oldKey
    }))

    await db.patch(log._id, { deletedAt: Date.now() })
    console.log(`🗑️ Deleted: ${log.oldKey}`)
  }
}
```

**Phase 3: Lifecycle Policies (0.5 days)**

```json
// S3 Lifecycle Policy
{
  "Rules": [
    {
      "Id": "Delete-Old-Paths-After-90-Days",
      "Status": "Enabled",
      "Filter": {
        "And": {
          "Prefix": "",
          "Tags": [
            {
              "Key": "migration_status",
              "Value": "old"
            }
          ]
        }
      },
      "Expiration": {
        "Days": 90
      }
    },
    {
      "Id": "Delete-Temp-Uploads-After-7-Days",
      "Status": "Enabled",
      "Prefix": "temp/",
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "Archive-Old-Documents",
      "Status": "Enabled",
      "Prefix": "org/",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

**Phase 4: Monitoring Dashboard (1 day)**

```tsx
// apps/web/src/app/(dashboard)/storage/page.tsx (NEW)
export default function StorageDashboard() {
  const usage = useQuery(api.storage.getUsageByOrg, { orgId })

  return (
    <div>
      <StorageChart data={usage.byCategory} />

      <Table>
        <TableRow>
          <TableCell>Documents</TableCell>
          <TableCell>{formatBytes(usage.documents)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Vehicle Images</TableCell>
          <TableCell>{formatBytes(usage.vehicles)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell>{formatBytes(usage.total)}</TableCell>
        </TableRow>
      </Table>

      <Alert>
        Your plan allows {formatBytes(usage.limit)}.
        You're using {((usage.total / usage.limit) * 100).toFixed(1)}%
      </Alert>
    </div>
  )
}
```

### Optimization Opportunities

**1. CloudFront CDN:**
- Add CloudFront in front of S3
- Cache vehicle images (public, 1 year TTL)
- Cache documents (private, signed URLs, 5 min TTL)

**2. Image Optimization:**
- Convert to WebP on upload
- Generate thumbnails (200x150, 400x300, 800x600)
- Lazy load images

**3. Storage Cost Reduction:**
```
Estimated Savings:
- Migrate old docs to Glacier: -60% cost
- Delete duplicates: -50% storage
- Image compression: -40% size
Total: Save ~$200-500/month at scale
```

**Total Effort:** 4-5 days

---

## Technical Debt & Known Issues

### 1. Desktop App Critical Bugs

**From:** `apps/desktop/todo.md`

| Bug | Severity | Effort |
|-----|----------|--------|
| PDF signature not working | 🔴 Critical | 1-2 days |
| Printing broken | 🔴 Critical | 1 day |
| Updater not functioning | 🔴 Critical | 1-2 days |
| PDFs not showing in build | 🔴 Critical | 0.5 days |

**Total:** 3-4 days

---

### 2. Web App Known Issues

**From:** `apps/web/todo.md`

```markdown
1. Add the site master          → See "Master Admin System"
2. Fix Stripe backend           → See "Stripe Consolidation"
3. Update the UI                → See "UX Improvements"
```

---

### 3. Schema Inconsistencies

**Issue:** Some tables use string IDs, others use Convex IDs

```typescript
// ❌ Inconsistent
clients: {
  client_id: v.string(),        // String
  dealershipId: v.string()      // String (should be Id<"dealerships">)
}

vehicles: {
  id: v.string(),               // String
  dealershipId: v.string()      // String
}

deals: {
  clientId: v.id("clients"),    // Convex ID ✅
  vehicleId: v.id("vehicles"),  // Convex ID ✅
}
```

**Recommendation:** Migrate to Convex IDs for consistency

**Effort:** 3-4 days (needs data migration)

---

### 4. Missing Indexes

**Performance Issue:** Queries without indexes are slow

```typescript
// Add indexes for common queries
vehicles:
  .index("by_dealership_featured", ["dealershipId", "featured"])
  .index("by_year_make", ["year", "make"])
  .index("by_price_range", ["dealershipId", "price"])

clients:
  .index("by_dealership_status", ["dealershipId", "status"])
  .index("by_created_at", ["createdAt"])

deals:
  .index("by_dealership_status", ["dealershipId", "status"])
  .index("by_created_at", ["createdAt"])
```

**Effort:** 0.5 days

---

### 5. Error Handling

**Current State:**
- Generic error messages
- No error boundary components
- Poor error logging

**Required:**

```tsx
// apps/web/src/app/error.tsx
export default function Error({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log to error tracking service (Sentry, etc.)
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

**Effort:** 1 day

---

## Priority Matrix

### Critical (P0) - Do Immediately

| Task | Impact | Effort | ROI |
|------|--------|--------|-----|
| Fix desktop app bugs | 🔴 High | 3-4 days | ⭐⭐⭐⭐⭐ |
| Implement webhook idempotency | 🔴 High | 0.5 days | ⭐⭐⭐⭐⭐ |
| Remove debug code | 🔴 High | 0.1 days | ⭐⭐⭐⭐⭐ |
| Stripe consolidation | 🟠 Medium | 2-3 days | ⭐⭐⭐⭐ |
| S3 consolidation | 🟠 Medium | 2 days | ⭐⭐⭐⭐ |

**Total:** 8-10 days

---

### High (P1) - Do Soon

| Task | Impact | Effort | ROI |
|------|--------|--------|-----|
| Master admin system | 🟠 Medium | 5-7 days | ⭐⭐⭐⭐ |
| Environment validation | 🟠 Medium | 0.5 days | ⭐⭐⭐⭐ |
| Encryption for sensitive data | 🟠 Medium | 2 days | ⭐⭐⭐⭐ |
| S3 migration script | 🟠 Medium | 2 days | ⭐⭐⭐ |
| UX improvements (web) | 🟡 Low | 5 days | ⭐⭐⭐ |

**Total:** 14-17 days

---

### Medium (P2) - Do Eventually

| Task | Impact | Effort | ROI |
|------|--------|--------|-----|
| Advanced analytics | 🟡 Low | 5-7 days | ⭐⭐⭐ |
| Email automation | 🟡 Low | 3-4 days | ⭐⭐⭐ |
| Activity feed UI | 🟡 Low | 1 day | ⭐⭐ |
| TypeScript strict mode | 🟡 Low | 2-3 days | ⭐⭐ |

---

### Low (P3) - Nice to Have

| Task | Impact | Effort | ROI |
|------|--------|--------|-----|
| Mobile app | 🟡 Low | 30+ days | ⭐⭐ |
| 2FA implementation | 🟡 Low | 1.5 days | ⭐⭐ |
| CloudFront CDN | 🟡 Low | 2 days | ⭐⭐ |

---

## Implementation Roadmap

### Sprint 1 (Week 1): Critical Fixes & Cleanup
**Goal:** Stabilize existing features, remove tech debt

**Days 1-2:**
- ✅ Fix desktop app bugs (4 critical issues)
- ✅ Remove debug.ts from production

**Day 3:**
- ✅ Implement webhook idempotency
- ✅ Add environment variable validation

**Days 4-5:**
- ✅ Consolidate Stripe code
- ✅ Consolidate S3 code

**Deliverables:**
- ✅ Desktop app fully functional
- ✅ Cleaner, more maintainable codebase
- ✅ Better error handling

---

### Sprint 2 (Week 2): Master Admin & Security
**Goal:** Enable multi-org management, improve security

**Days 1-3:**
- ✅ Implement `orgs` and `orgMembers` CRUD
- ✅ Create master admin UI layout
- ✅ Build org overview table

**Days 4-5:**
- ✅ Add org usage dashboard
- ✅ Implement impersonation feature
- ✅ Add security improvements (encryption, rate limiting)

**Deliverables:**
- ✅ Master admin can manage all orgs
- ✅ Sensitive data encrypted
- ✅ Rate limiting enforced

---

### Sprint 3 (Week 3): UX & Features
**Goal:** Improve user experience, add missing features

**Days 1-2:**
- ✅ Complete domain verification flow
- ✅ Fix subscription status UX

**Days 3-5:**
- ✅ Implement bulk operations
- ✅ Add data table improvements
- ✅ Create activity feed UI

**Deliverables:**
- ✅ Better UX for dealers
- ✅ More productive workflows
- ✅ Clear audit trail

---

### Sprint 4 (Week 4): S3 & Optimization
**Goal:** Clean up storage, reduce costs

**Days 1-2:**
- ✅ Run S3 audit script
- ✅ Create migration script
- ✅ Verify migration

**Days 3-4:**
- ✅ Set up lifecycle policies
- ✅ Add storage monitoring dashboard
- ✅ Implement image optimization

**Day 5:**
- ✅ Testing & validation

**Deliverables:**
- ✅ Clean S3 structure
- ✅ Cost savings
- ✅ Better performance

---

### Sprint 5 (Week 5+): Advanced Features
**Goal:** Add analytics, automation, reporting

**Week 5:**
- ✅ Advanced analytics dashboard
- ✅ Custom report builder

**Week 6:**
- ✅ Email automation & campaigns
- ✅ Activity feed & notifications

**Week 7:**
- ✅ TypeScript strict mode
- ✅ Performance optimizations

---

## Summary & Next Steps

### Immediate Actions (This Week)

1. **Fix desktop app** → Unblock desktop users
2. **Remove debug.ts** → Clean production code
3. **Add webhook idempotency** → Prevent billing issues
4. **Start Stripe consolidation** → Easier maintenance

### Short-Term (Next 2 Weeks)

1. **Build master admin system** → Enable scaling
2. **Improve security** → Encrypt sensitive data
3. **Enhance UX** → Reduce support tickets

### Long-Term (Next Month)

1. **S3 cleanup & migration** → Cost savings
2. **Advanced features** → Analytics, automation
3. **Performance optimization** → Faster, better UX

---

**Total Estimated Effort:** 4-6 weeks for solo developer

**Estimated Cost Savings:** $200-500/month (storage optimization)

**Estimated Revenue Impact:** +20-30% conversion (better UX, master admin for scaling)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Next Review:** After Sprint 1 completion
