# Status System Refactoring Plan

**Date:** 2025-11-05
**Branch:** `claude/codebase-analysis-improvements-011CUp8fA1VYjZDVhW5jSUJr`
**Status:** 📋 **PLANNING PHASE** (No code execution yet)

---

## 🎯 Objective

Standardize and improve the status systems for **Deals**, **Vehicles (Sales Cars)**, and **Clients** throughout the application to provide:
- Better workflow management
- Clear status transitions
- Type safety
- Consistent UX
- Audit trail of status changes

---

## 📊 Current State Analysis

### 1. Vehicles (Sales Cars)

**Location:** `convex/schema.ts` lines 353-358

**Current Status Union:**
```typescript
status: v.union(
  v.literal("AVAILABLE"),
  v.literal("SOLD"),
  v.literal("PENDING"),
  v.literal("RESERVED")
)
```

**Issues:**
- ❌ No "IN_TRANSIT" status for incoming inventory
- ❌ No "WHOLESALE" status for vehicles being sold wholesale
- ❌ No "SERVICE" status for vehicles in service/reconditioning
- ❌ No "UNAVAILABLE" status for temporarily unavailable vehicles
- ❌ Missing metadata about who reserved and when
- ❌ No automatic status transitions (e.g., RESERVED → SOLD)

**Current Usage:**
- Used in inventory management
- Filters in queries (`by_dealership_status` index)
- Public API exposes these statuses

---

### 2. Clients

**Location:** `convex/schema.ts` lines 401-405

**Current Status Union:**
```typescript
status: v.union(
  v.literal("LEAD"),
  v.literal("CUSTOMER"),
  v.literal("PREVIOUS")
)
```

**Issues:**
- ❌ No "PROSPECT" status (lead before contact)
- ❌ No "QUALIFIED_LEAD" status (lead that's been qualified)
- ❌ No "NEGOTIATING" status (active negotiation)
- ❌ No "LOST" status (lead lost to competitor)
- ❌ No "DO_NOT_CONTACT" status (requested no contact)
- ❌ Missing workflow stages between LEAD and CUSTOMER
- ❌ No automatic transition from LEAD → CUSTOMER when deal closes

**Current Usage:**
- Used in CRM/client management
- Filters for lead vs customer views
- Marketing campaign targeting

---

### 3. Deals

**Location:** `convex/schema.ts` line 483

**Current Schema:**
```typescript
status: v.string(), // ⚠️ NO TYPE SAFETY!
```

**Current Statuses Found in Code:**
- `"draft"` - When deal is first created (`deals.ts:313`)
- `"on_hold"` - Found in web UI logic
- Possibly others (no validation means any string can be used)

**Issues:**
- ❌ **CRITICAL:** No type safety - any string can be used
- ❌ No standardized status values
- ❌ No clear workflow stages
- ❌ No status for "awaiting signatures"
- ❌ No status for "documents generated"
- ❌ No status for "financing pending"
- ❌ No status for "completed/finalized"
- ❌ No status for "cancelled"
- ❌ No automatic status updates based on document/signature state
- ❌ No validation in mutations

**Critical Problem:**
The deal status is completely unvalidated, leading to:
- Inconsistent status strings across the app
- No way to query by standardized status
- Bugs when checking deal state
- Poor UX (no standard status badges/colors)

---

## 🎨 Proposed Status Systems

### 1. Vehicles - Enhanced Status System

```typescript
// convex/schema.ts
vehicleStatus: v.union(
  // Available for sale
  v.literal("AVAILABLE"),        // Ready to sell
  v.literal("FEATURED"),          // Featured on lot/website

  // In process
  v.literal("IN_TRANSIT"),        // Coming from auction/trade
  v.literal("IN_SERVICE"),        // Being serviced/reconditioned
  v.literal("RESERVED"),          // Customer has reserved
  v.literal("PENDING_SALE"),      // Deal pending (docs in progress)

  // Sold/Off lot
  v.literal("SOLD"),              // Deal completed
  v.literal("WHOLESALE"),         // Sold wholesale
  v.literal("TRADED"),            // Taken as trade-in

  // Other
  v.literal("UNAVAILABLE"),       // Temporarily unavailable
  v.literal("ARCHIVED")           // No longer in inventory
),

// Additional fields needed
reservedBy: v.optional(v.id("clients")),
reservedAt: v.optional(v.number()),
reservedUntil: v.optional(v.number()), // Expiration time
statusChangedAt: v.number(),
statusChangedBy: v.optional(v.id("users")),
```

**Status Flow:**
```
IN_TRANSIT → IN_SERVICE → AVAILABLE ⟷ FEATURED
                            ↓
                         RESERVED → PENDING_SALE → SOLD
                            ↓                        ↓
                      UNAVAILABLE              WHOLESALE/TRADED/ARCHIVED
```

---

### 2. Clients - Sales Funnel Status System

```typescript
// convex/schema.ts
clientStatus: v.union(
  // Lead stages
  v.literal("PROSPECT"),          // New lead, not yet contacted
  v.literal("CONTACTED"),         // Initial contact made
  v.literal("QUALIFIED"),         // Qualified as serious buyer
  v.literal("NEGOTIATING"),       // Active price negotiation

  // Customer stages
  v.literal("CUSTOMER"),          // Active customer (deal in progress or closed)
  v.literal("REPEAT_CUSTOMER"),   // Multiple purchases

  // Inactive/Lost
  v.literal("LOST"),              // Lost to competitor
  v.literal("NOT_INTERESTED"),    // Not interested at this time
  v.literal("DO_NOT_CONTACT"),    // Requested no contact
  v.literal("PREVIOUS"),          // Former customer (inactive)
),

// Additional fields needed
statusChangedAt: v.number(),
statusChangedBy: v.optional(v.id("users")),
lostReason: v.optional(v.string()), // Why lead was lost
leadSource: v.optional(v.string()), // Where lead came from
lastContactedAt: v.optional(v.number()),
nextFollowUpAt: v.optional(v.number()),
```

**Status Flow:**
```
PROSPECT → CONTACTED → QUALIFIED → NEGOTIATING → CUSTOMER → REPEAT_CUSTOMER
             ↓            ↓           ↓              ↓
         NOT_INTERESTED  LOST     LOST          PREVIOUS
             ↓
        DO_NOT_CONTACT
```

---

### 3. Deals - Complete Workflow Status System

```typescript
// convex/schema.ts
dealStatus: v.union(
  // Initial stages
  v.literal("DRAFT"),             // Deal being created
  v.literal("PENDING_APPROVAL"),  // Awaiting manager approval
  v.literal("APPROVED"),          // Approved, ready for docs

  // Documentation stages
  v.literal("DOCS_GENERATING"),   // Documents being generated
  v.literal("DOCS_READY"),        // Documents ready for signatures
  v.literal("AWAITING_SIGNATURES"), // Waiting for all parties to sign
  v.literal("PARTIALLY_SIGNED"),  // Some parties signed

  // Financing stages (if applicable)
  v.literal("FINANCING_PENDING"), // Awaiting financing approval
  v.literal("FINANCING_APPROVED"), // Financing approved
  v.literal("FINANCING_DECLINED"), // Financing declined

  // Completion stages
  v.literal("COMPLETED"),         // Deal fully executed
  v.literal("DELIVERED"),         // Vehicle delivered to customer
  v.literal("FINALIZED"),         // All paperwork complete, archived

  // Problem stages
  v.literal("ON_HOLD"),           // Temporarily paused
  v.literal("CANCELLED"),         // Deal cancelled
  v.literal("VOID"),              // Deal voided (legal reasons)
),

// Additional fields needed
statusChangedAt: v.number(),
statusChangedBy: v.optional(v.id("users")),
statusHistory: v.optional(v.array(
  v.object({
    previousStatus: v.string(),
    newStatus: v.string(),
    changedAt: v.number(),
    changedBy: v.id("users"),
    reason: v.optional(v.string()),
  })
)),
approvedBy: v.optional(v.id("users")),
approvedAt: v.optional(v.number()),
cancelledBy: v.optional(v.id("users")),
cancelledAt: v.optional(v.number()),
cancellationReason: v.optional(v.string()),
```

**Status Flow:**
```
DRAFT → PENDING_APPROVAL → APPROVED → DOCS_GENERATING → DOCS_READY
           ↓                 ↓              ↓
       CANCELLED        ON_HOLD      AWAITING_SIGNATURES → PARTIALLY_SIGNED
                                           ↓                       ↓
                                    [If financing:]          FINANCING_PENDING
                                    FINANCING_APPROVED    or FINANCING_DECLINED
                                           ↓                       ↓
                                      COMPLETED           CANCELLED/ON_HOLD
                                           ↓
                                      DELIVERED → FINALIZED
                                           ↓
                                      VOID (if needed)
```

---

## 🔧 Implementation Plan

### Phase 1: Schema Updates (BREAKING CHANGES)

**Files to Modify:**
1. `convex/schema.ts`
   - Add status enums/constants
   - Update vehicle status union (add new statuses)
   - Update client status union (add new statuses)
   - **FIX:** Change deal `status: v.string()` to proper union
   - Add new fields for status tracking (changedAt, changedBy, history)

**Migration Considerations:**
- Existing vehicles with "AVAILABLE" remain "AVAILABLE" ✅
- Existing vehicles with "RESERVED" remain "RESERVED" ✅
- Existing clients with "LEAD" remain "LEAD" ✅
- Existing deals with "draft" remain "DRAFT" (uppercase) ⚠️ Case change
- Existing deals with unknown statuses → default to "DRAFT" ⚠️ Data migration needed

---

### Phase 2: Convex Function Updates

**Files to Modify:**

1. **`convex/deals.ts`**
   - Update `createDeal` mutation to use proper enum
   - Update `updateDealStatus` mutation with validation
   - Add status transition validation (can't go from COMPLETED → DRAFT)
   - Add automatic status updates:
     - When all signatures collected → COMPLETED
     - When documents generated → DOCS_READY
   - Add status history tracking

2. **`convex/inventory.ts`**
   - Update vehicle status filters
   - Add automatic status transitions:
     - When deal created with vehicle → PENDING_SALE
     - When deal completed → SOLD
   - Add reservation expiration logic
   - Add status change mutations with validation

3. **`convex/clients.ts`**
   - Update client status filters
   - Add automatic status transitions:
     - When deal created → CUSTOMER
     - When deal completed → CUSTOMER
   - Add lead nurturing status updates
   - Add status change mutations

4. **`convex/documents/deal_generator.ts`**
   - Auto-update deal status when docs generated
   - Change status to DOCS_READY when all docs created

5. **`convex/documentPacks.ts`**
   - Auto-update deal status based on signature collection
   - PARTIALLY_SIGNED when some signatures collected
   - COMPLETED when all signatures collected

---

### Phase 3: Web UI Updates

**Files to Modify:**

1. **`apps/web/src/app/(dashboard)/deals/`**
   - Update status badge colors/labels
   - Update filters to use new statuses
   - Update status dropdown options
   - Add status transition buttons (Approve, Cancel, Complete, etc.)
   - Add status history timeline view

2. **`apps/web/src/app/(dashboard)/inventory/`**
   - Update status filters (add new statuses)
   - Update status badge UI
   - Add bulk status update actions
   - Add reservation UI (who reserved, expires when)

3. **`apps/web/src/app/(dashboard)/clients/`**
   - Update status filters (add sales funnel view)
   - Add sales funnel visualization
   - Add status transition buttons
   - Add lead nurturing workflows

4. **`apps/web/src/components/`**
   - Create `StatusBadge` component with proper colors
   - Create `StatusTimeline` component for history
   - Create `StatusTransitionButtons` component

---

### Phase 4: Desktop App Updates

**Files to Modify:**

1. **`apps/desktop/src/routes/deals/`**
   - Same updates as web UI
   - Ensure status transitions work offline
   - Sync status changes when online

2. **`apps/desktop/src/routes/index.tsx` (inventory)**
   - Update status filters
   - Update status UI

---

### Phase 5: Status Utilities & Constants

**New Files to Create:**

1. **`convex/lib/statuses.ts`**
```typescript
// Status enums and utilities
export const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  FEATURED: "FEATURED",
  IN_TRANSIT: "IN_TRANSIT",
  IN_SERVICE: "IN_SERVICE",
  RESERVED: "RESERVED",
  PENDING_SALE: "PENDING_SALE",
  SOLD: "SOLD",
  WHOLESALE: "WHOLESALE",
  TRADED: "TRADED",
  UNAVAILABLE: "UNAVAILABLE",
  ARCHIVED: "ARCHIVED",
} as const;

export const ClientStatus = {
  PROSPECT: "PROSPECT",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  NEGOTIATING: "NEGOTIATING",
  CUSTOMER: "CUSTOMER",
  REPEAT_CUSTOMER: "REPEAT_CUSTOMER",
  LOST: "LOST",
  NOT_INTERESTED: "NOT_INTERESTED",
  DO_NOT_CONTACT: "DO_NOT_CONTACT",
  PREVIOUS: "PREVIOUS",
} as const;

export const DealStatus = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  DOCS_GENERATING: "DOCS_GENERATING",
  DOCS_READY: "DOCS_READY",
  AWAITING_SIGNATURES: "AWAITING_SIGNATURES",
  PARTIALLY_SIGNED: "PARTIALLY_SIGNED",
  FINANCING_PENDING: "FINANCING_PENDING",
  FINANCING_APPROVED: "FINANCING_APPROVED",
  FINANCING_DECLINED: "FINANCING_DECLINED",
  COMPLETED: "COMPLETED",
  DELIVERED: "DELIVERED",
  FINALIZED: "FINALIZED",
  ON_HOLD: "ON_HOLD",
  CANCELLED: "CANCELLED",
  VOID: "VOID",
} as const;

// Status transition validation
export function canTransitionDealStatus(
  from: string,
  to: string
): boolean {
  // Define valid transitions...
}

// Status display utilities
export function getDealStatusColor(status: string): string {
  // Return tailwind color class...
}

export function getDealStatusLabel(status: string): string {
  // Return human-readable label...
}
```

2. **`apps/web/src/lib/status-utils.ts`**
```typescript
// Frontend status utilities
// Colors, labels, icons for each status
```

---

## 📋 Data Migration Strategy

### Migration Script Needed

**File:** `scripts/migrate-statuses.ts`

```typescript
// Convex data migration script
// 1. Update all deal statuses from lowercase to uppercase
// 2. Map any unknown statuses to "DRAFT"
// 3. Update vehicle statuses if needed
// 4. Update client statuses if needed
// 5. Add statusChangedAt timestamps to all records
```

**Steps:**
1. Backup current database
2. Run migration script
3. Verify all statuses are valid
4. Deploy schema changes
5. Deploy code changes

---

## 🎨 UI/UX Improvements

### Status Badge Colors

**Vehicles:**
- AVAILABLE: Green
- FEATURED: Blue
- IN_TRANSIT: Yellow
- IN_SERVICE: Orange
- RESERVED: Purple
- PENDING_SALE: Blue
- SOLD: Gray
- WHOLESALE/TRADED: Gray
- UNAVAILABLE: Red

**Clients:**
- PROSPECT: Light Blue
- CONTACTED: Blue
- QUALIFIED: Green
- NEGOTIATING: Orange
- CUSTOMER: Purple
- REPEAT_CUSTOMER: Gold
- LOST: Red
- NOT_INTERESTED: Gray
- DO_NOT_CONTACT: Dark Gray
- PREVIOUS: Light Gray

**Deals:**
- DRAFT: Gray
- PENDING_APPROVAL: Yellow
- APPROVED: Light Green
- DOCS_GENERATING/DOCS_READY: Blue
- AWAITING_SIGNATURES/PARTIALLY_SIGNED: Purple
- FINANCING_PENDING: Orange
- FINANCING_APPROVED: Green
- FINANCING_DECLINED: Red
- COMPLETED: Dark Green
- DELIVERED: Blue
- FINALIZED: Gray
- ON_HOLD: Yellow
- CANCELLED/VOID: Red

---

## ⚠️ Breaking Changes & Risks

### Breaking Changes

1. **Deal status field type change** - `v.string()` → `v.union(...)`
   - ⚠️ Any existing deals with lowercase "draft" → "DRAFT"
   - ⚠️ Any unknown statuses will break
   - **Mitigation:** Data migration script before deploy

2. **New required fields** - `statusChangedAt`, `statusChangedBy`
   - ⚠️ Existing records don't have these fields
   - **Mitigation:** Make fields optional initially, backfill with migration

3. **Client status changes** - New statuses added
   - ⚠️ Existing "LEAD" should map to which new status?
   - **Mitigation:** Keep "LEAD" compatibility, map to "CONTACTED" or keep as is

4. **Vehicle status changes** - New statuses added
   - ✅ Mostly backward compatible (existing statuses kept)
   - Minor: UI will need updates to show new statuses

### Risks

1. **Data Consistency** - If migration fails partway through
   - **Mitigation:** Use transaction-like approach, test thoroughly

2. **Frontend/Backend Mismatch** - If schema deploys before frontend
   - **Mitigation:** Deploy schema first (backward compatible), then frontend

3. **Performance** - Status history adds data to records
   - **Mitigation:** Make statusHistory optional, only use when needed

---

## 🧪 Testing Plan

### Unit Tests Needed

1. Status transition validation functions
2. Status color/label utilities
3. Automatic status update logic

### Integration Tests Needed

1. Deal creation → correct initial status
2. Document generation → status updates to DOCS_READY
3. Signature collection → status updates to COMPLETED
4. Vehicle reservation → status updates to RESERVED
5. Deal completion → vehicle status updates to SOLD
6. Deal completion → client status updates to CUSTOMER

### Manual Testing Checklist

- [ ] Create new deal → status is DRAFT
- [ ] Approve deal → status changes to APPROVED
- [ ] Generate documents → status changes to DOCS_READY
- [ ] Collect signatures → status changes to COMPLETED
- [ ] Cancel deal → status changes to CANCELLED
- [ ] Reserve vehicle → status changes to RESERVED
- [ ] Complete deal → vehicle status changes to SOLD
- [ ] Create lead → status is PROSPECT
- [ ] Contact lead → status can change to CONTACTED
- [ ] Close deal with lead → status changes to CUSTOMER
- [ ] View status history → shows all transitions

---

## 📝 Documentation Updates Needed

1. **API Documentation**
   - Document all status enums
   - Document valid status transitions
   - Document automatic status updates

2. **User Guide**
   - Explain deal workflow stages
   - Explain vehicle status meanings
   - Explain client sales funnel

3. **Developer Guide**
   - How to add new statuses
   - How to add status transitions
   - Status validation patterns

---

## 📊 Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Schema** | Update schema, add enums | 1 day |
| **Phase 2: Convex** | Update mutations, add validation, status transitions | 3-4 days |
| **Phase 3: Web UI** | Update filters, badges, status transition UI | 3-4 days |
| **Phase 4: Desktop** | Update desktop app UI | 2-3 days |
| **Phase 5: Utilities** | Create status utility libraries | 1 day |
| **Migration** | Write and test data migration script | 2 days |
| **Testing** | Unit tests, integration tests, manual testing | 2-3 days |
| **Documentation** | API docs, user guide, developer guide | 1-2 days |

**Total Estimated Time:** 15-20 days for complete implementation

---

## 🚀 Recommended Approach

### Option A: Incremental Rollout (Recommended)

1. **Week 1:** Fix deals status system (most critical)
   - Change `v.string()` to proper union
   - Add basic status validation
   - Update UI to show new statuses

2. **Week 2:** Enhance vehicle statuses
   - Add new vehicle statuses
   - Add reservation logic
   - Update UI

3. **Week 3:** Enhance client statuses
   - Add sales funnel statuses
   - Add status transitions
   - Update UI with funnel view

4. **Week 4:** Add advanced features
   - Status history tracking
   - Automatic status transitions
   - Workflow automation

### Option B: Big Bang (Not Recommended)

- Implement all changes at once
- Higher risk
- Longer testing period
- More deployment complexity

---

## ❓ Questions for Clarification

Before starting implementation, please clarify:

1. **Deal Statuses:**
   - Do you need financing-related statuses? (FINANCING_PENDING, etc.)
   - Should we have separate "DELIVERED" and "COMPLETED" statuses?
   - What statuses are most important for your workflow?

2. **Vehicle Statuses:**
   - Do you wholesale vehicles? (need WHOLESALE status?)
   - Do you accept trade-ins as inventory? (need TRADED status?)
   - Do you need IN_TRANSIT status for auction purchases?

3. **Client Statuses:**
   - How detailed should the sales funnel be?
   - Do you want DO_NOT_CONTACT status for compliance?
   - Should REPEAT_CUSTOMER be separate from CUSTOMER?

4. **Status History:**
   - Do you need full status change history? (audit trail)
   - How long should history be kept?

5. **Automatic Transitions:**
   - Should deal status auto-update when docs generated?
   - Should vehicle status auto-update when deal completes?
   - Should client status auto-update when deal closes?

6. **Backward Compatibility:**
   - Are there existing integrations using current statuses?
   - Can we break the API or need versioning?

---

## 🎯 Next Steps

Once you review this plan and provide clarifications:

1. ✅ Finalize status enum values based on your feedback
2. ✅ Create data migration script
3. ✅ Update schema with proper unions
4. ✅ Implement status validation
5. ✅ Update Convex functions
6. ✅ Update UI components
7. ✅ Write tests
8. ✅ Deploy incrementally

**Ready to proceed when you approve the plan!** 🚀

---

**Plan Version:** 1.0
**Last Updated:** 2025-11-05
**Status:** Awaiting approval & clarifications
