# Real-Time Sync Improvement Plan

**Date:** 2025-11-05
**Branch:** `claude/codebase-analysis-improvements-011CUp8fA1VYjZDVhW5jSUJr`
**Status:** 📋 **PLANNING PHASE** (No code execution yet)

---

## 🎯 Objective

Ensure seamless real-time synchronization between the desktop app and web app, particularly for critical actions like:
- Deal status changes (signed, finalized, cancelled)
- Document uploads and signature collection
- Vehicle status updates
- Client status updates

**User Requirement:** "When the deal is signed or finalized from the desktop it should reflect that in the web app as well and we need to refine that in the desktop app as well"

---

## 📊 Current State Analysis

### How Convex Real-Time Works

Convex provides **built-in real-time subscriptions**:
- Web app and desktop app both connect to Convex
- When data changes, Convex automatically pushes updates to all connected clients
- Uses WebSocket connections for instant updates

**This means real-time sync SHOULD already work!**

### Potential Issues

If desktop → web sync is not working, the problem is likely one of these:

1. **Desktop app not calling mutations properly**
   - Desktop might be updating local state but not calling Convex mutations
   - Desktop might have stale Convex client connection

2. **Web app not subscribing to the right queries**
   - Web app might not be using `useQuery` for deal status
   - Web app might be using cached data instead of live queries

3. **Desktop app offline mode**
   - Desktop might queue mutations while offline
   - Mutations might not be syncing when coming back online

4. **Status update logic missing**
   - Desktop might not have complete status transition functions
   - Desktop might not be updating all related records (deal + vehicle + client)

---

## 🔍 Investigation Plan

### Step 1: Verify Desktop App Convex Integration

**Files to Check:**
1. `apps/desktop/src/lib/convex.ts` - Convex client setup
2. `apps/desktop/src/routes/deals/` - Deal status update logic
3. `apps/desktop/src/lib/printing.ts` - Document printing/signing logic

**Questions to Answer:**
- ✅ Is desktop using `useMutation` correctly?
- ✅ Are mutations being called on status changes?
- ✅ Is there error handling if mutations fail?
- ✅ Are there any local-only state updates that bypass Convex?

### Step 2: Verify Web App Subscriptions

**Files to Check:**
1. `apps/web/src/app/(dashboard)/deals/` - Deal list and detail pages
2. `apps/web/src/hooks/` - Custom hooks for deal queries

**Questions to Answer:**
- ✅ Is web using `useQuery` (not `useAction`) for deal data?
- ✅ Are queries set up to auto-refresh on data changes?
- ✅ Is there any polling or manual refresh logic that might interfere?

### Step 3: Check Status Update Functions

**Files to Check:**
1. `convex/deals.ts` - Deal mutation functions
2. `convex/documentPacks.ts` - Document and signature functions

**Questions to Answer:**
- ✅ Do status update mutations exist?
- ✅ Do they update ALL related records (deal, vehicle, client)?
- ✅ Are there automatic status transitions?

---

## 🚀 Proposed Solutions

### Solution 1: Ensure Desktop Uses Mutations for All Status Changes

**Problem:** Desktop might be updating local state without calling Convex

**Fix:** Audit all status change locations in desktop app

**Files to Modify:**
```typescript
// apps/desktop/src/routes/deals/[id]/index.tsx (or similar)

// ❌ BAD: Local state update only
const handleMarkSigned = () => {
  setDeal({ ...deal, status: "COMPLETED" }); // Only updates local state!
};

// ✅ GOOD: Call Convex mutation
const updateDealStatus = useMutation(api.deals.updateDealStatus);

const handleMarkSigned = async () => {
  try {
    await updateDealStatus({
      dealId: deal._id,
      newStatus: "COMPLETED",
      reason: "All parties signed",
    });
    toast.success("Deal marked as completed");
    // No need to update local state - Convex will push update automatically
  } catch (error) {
    toast.error("Failed to update deal status");
  }
};
```

---

### Solution 2: Create Comprehensive Status Update Functions

**Problem:** Status updates might not be updating all related records

**Fix:** Create unified status update mutations that update deal, vehicle, and client

**Files to Create/Modify:**

**1. `convex/deals.ts` - Enhanced status update mutation**

```typescript
// convex/deals.ts

export const updateDealStatus = mutation({
  args: {
    dealId: v.id("deals"),
    newStatus: v.string(), // Will be enum after status refactoring
    reason: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new Error("Deal not found");

    const previousStatus = deal.status;

    // Validate status transition
    const canTransition = validateStatusTransition(previousStatus, args.newStatus);
    if (!canTransition) {
      throw new Error(`Cannot transition from ${previousStatus} to ${args.newStatus}`);
    }

    // Update deal status
    await ctx.db.patch(args.dealId, {
      status: args.newStatus,
      statusChangedAt: Date.now(),
      statusChangedBy: args.userId,
      // Add to status history
      statusHistory: [
        ...(deal.statusHistory || []),
        {
          previousStatus,
          newStatus: args.newStatus,
          changedAt: Date.now(),
          changedBy: args.userId,
          reason: args.reason,
        },
      ],
    });

    // AUTO-UPDATE RELATED RECORDS

    // If deal is completed → update vehicle to SOLD
    if (args.newStatus === "COMPLETED" && deal.vehicleId) {
      const vehicle = await ctx.db
        .query("vehicles")
        .withIndex("by_vehicle_id", (q) => q.eq("id", deal.vehicleId!))
        .first();

      if (vehicle) {
        await ctx.db.patch(vehicle._id, {
          status: "SOLD",
          statusChangedAt: Date.now(),
          statusChangedBy: args.userId,
          clientId: deal.clientId, // Link to buyer
        });
      }
    }

    // If deal is completed → update client to CUSTOMER
    if (args.newStatus === "COMPLETED" && deal.clientId) {
      const client = await ctx.db
        .query("clients")
        .filter((q) => q.eq(q.field("client_id"), deal.clientId!))
        .first();

      if (client && client.status === "LEAD") {
        await ctx.db.patch(client._id, {
          status: "CUSTOMER",
          statusChangedAt: Date.now(),
          statusChangedBy: args.userId,
        });
      }
    }

    // If deal is cancelled → update vehicle back to AVAILABLE
    if (args.newStatus === "CANCELLED" && deal.vehicleId) {
      const vehicle = await ctx.db
        .query("vehicles")
        .withIndex("by_vehicle_id", (q) => q.eq("id", deal.vehicleId!))
        .first();

      if (vehicle && vehicle.status === "PENDING") {
        await ctx.db.patch(vehicle._id, {
          status: "AVAILABLE",
          statusChangedAt: Date.now(),
          statusChangedBy: args.userId,
          clientId: undefined, // Remove client link
        });
      }
    }

    return {
      success: true,
      previousStatus,
      newStatus: args.newStatus,
    };
  },
});
```

**2. `convex/documentPacks.ts` - Auto-update deal status when signatures collected**

```typescript
// convex/documentPacks.ts

export const markDocumentSigned = mutation({
  args: {
    documentPackId: v.id("document_packs"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const docPack = await ctx.db.get(args.documentPackId);
    if (!docPack) throw new Error("Document pack not found");

    // Mark as all signed
    await ctx.db.patch(args.documentPackId, {
      allPartiesSigned: true,
      physicalSignatureDate: Date.now(),
      physicalSignatureNotes: "Signed via desktop app",
    });

    // AUTO-UPDATE DEAL STATUS
    if (docPack.dealId) {
      const deal = await ctx.db.get(docPack.dealId);
      if (deal && deal.status === "AWAITING_SIGNATURES") {
        // Call the updateDealStatus function to trigger cascading updates
        await ctx.runMutation(api.deals.updateDealStatus, {
          dealId: deal._id,
          newStatus: "COMPLETED",
          reason: "All documents signed",
          userId: args.userId,
        });
      }
    }

    return { success: true };
  },
});
```

---

### Solution 3: Desktop App - Ensure Mutations Are Called

**Files to Modify:**

**1. Desktop Deal Detail Page**

```typescript
// apps/desktop/src/routes/deals/[id]/index.tsx (hypothetical)

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DealDetailPage() {
  const updateDealStatus = useMutation(api.deals.updateDealStatus);
  const markDocumentSigned = useMutation(api.documentPacks.markDocumentSigned);

  // Mark deal as signed (after printing and physical signatures)
  const handleMarkAsSigned = async () => {
    try {
      await markDocumentSigned({
        documentPackId: documentPack._id,
        userId: currentUser._id,
      });

      toast.success("Deal marked as signed - syncing to web app...");

      // Convex will automatically push update to web app via WebSocket
    } catch (error) {
      toast.error("Failed to mark as signed");
      console.error(error);
    }
  };

  // Manually finalize deal
  const handleFinalize = async () => {
    try {
      await updateDealStatus({
        dealId: deal._id,
        newStatus: "FINALIZED",
        reason: "Finalized from desktop app",
        userId: currentUser._id,
      });

      toast.success("Deal finalized - syncing to web app...");
    } catch (error) {
      toast.error("Failed to finalize deal");
      console.error(error);
    }
  };

  return (
    <div>
      {/* Deal details */}

      <Button onClick={handleMarkAsSigned}>
        Mark as Signed
      </Button>

      <Button onClick={handleFinalize}>
        Finalize Deal
      </Button>
    </div>
  );
}
```

---

### Solution 4: Web App - Ensure Using Live Queries

**Files to Check:**

**1. Web Deal List Page**

```typescript
// apps/web/src/app/(dashboard)/deals/page.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DealsPage() {
  // ✅ GOOD: Using useQuery for real-time updates
  const deals = useQuery(api.deals.getAllDeals, {
    dealershipId: currentDealership._id,
  });

  // ❌ BAD: Using useAction or fetching once
  // const deals = await fetchDeals(); // Won't get real-time updates!

  return (
    <div>
      {deals?.map(deal => (
        <DealCard key={deal._id} deal={deal} />
        // When desktop updates deal, this will automatically re-render!
      ))}
    </div>
  );
}
```

**2. Web Deal Detail Page**

```typescript
// apps/web/src/app/(dashboard)/deals/[id]/page.tsx

export default function DealDetailPage({ params }) {
  // ✅ GOOD: Using useQuery with deal ID
  const deal = useQuery(api.deals.getDealById, {
    dealId: params.id as Id<"deals">,
  });

  // Status badge will automatically update when desktop changes status!
  return (
    <div>
      <StatusBadge status={deal?.status} />
      {/* This badge will change in real-time when desktop updates the deal */}
    </div>
  );
}
```

---

### Solution 5: Add Connection Status Indicators

**Problem:** Users don't know if desktop is connected/syncing

**Fix:** Add connection status indicators

**Files to Create:**

**1. Connection Status Hook**

```typescript
// apps/desktop/src/hooks/useConvexConnection.ts

import { useConvex } from "convex/react";
import { useEffect, useState } from "react";

export function useConvexConnection() {
  const convex = useConvex();
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  useEffect(() => {
    // Monitor connection status
    const checkConnection = () => {
      // Convex client has connection status
      // Implementation depends on Convex client API
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [convex]);

  return { isConnected, lastSyncTime };
}
```

**2. Connection Status UI**

```typescript
// apps/desktop/src/components/ConnectionStatus.tsx

export function ConnectionStatus() {
  const { isConnected, lastSyncTime } = useConvexConnection();

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm text-gray-600">
        {isConnected ? 'Synced' : 'Offline'} • Last sync: {formatTime(lastSyncTime)}
      </span>
    </div>
  );
}
```

---

## 🧪 Testing Plan

### Test Scenarios

1. **Desktop → Web Sync**
   - [ ] Open deal on web app
   - [ ] Mark as signed on desktop app
   - [ ] Verify web app updates immediately (within 1-2 seconds)
   - [ ] Verify status badge changes
   - [ ] Verify vehicle status updates to SOLD

2. **Web → Desktop Sync**
   - [ ] Open deal on desktop app
   - [ ] Change status on web app
   - [ ] Verify desktop app updates immediately
   - [ ] Verify status badge changes

3. **Offline → Online Sync**
   - [ ] Disconnect desktop from internet
   - [ ] Make status changes on desktop (should queue)
   - [ ] Reconnect to internet
   - [ ] Verify changes sync to web app

4. **Multi-User Sync**
   - [ ] User A opens deal on web
   - [ ] User B opens same deal on desktop
   - [ ] User B marks as signed
   - [ ] Verify User A sees update in real-time

5. **Cascading Updates**
   - [ ] Complete a deal on desktop
   - [ ] Verify deal status changes to COMPLETED
   - [ ] Verify vehicle status changes to SOLD
   - [ ] Verify client status changes to CUSTOMER
   - [ ] Verify all changes appear on web app

---

## 📋 Implementation Checklist

### Phase 1: Audit Current Implementation (1 day)
- [ ] Review desktop app Convex setup
- [ ] Review all locations where deal status is updated on desktop
- [ ] Review web app query usage (useQuery vs useAction)
- [ ] Identify any local-only state updates

### Phase 2: Fix Desktop Mutations (1-2 days)
- [ ] Replace local state updates with Convex mutations
- [ ] Add proper error handling
- [ ] Add loading states
- [ ] Add success/error toasts

### Phase 3: Enhance Status Update Functions (1-2 days)
- [ ] Update `convex/deals.ts` with comprehensive status update function
- [ ] Add status transition validation
- [ ] Add status history tracking
- [ ] Add cascading updates (deal → vehicle → client)
- [ ] Update `convex/documentPacks.ts` to auto-update deal status

### Phase 4: Verify Web App Subscriptions (0.5 day)
- [ ] Ensure all deal queries use `useQuery`
- [ ] Remove any manual refresh or polling logic
- [ ] Test real-time updates

### Phase 5: Add Connection Status UI (1 day)
- [ ] Create connection status hook
- [ ] Add connection indicator to desktop app
- [ ] Add last sync time display
- [ ] Test offline/online transitions

### Phase 6: Testing (1-2 days)
- [ ] Test desktop → web sync
- [ ] Test web → desktop sync
- [ ] Test offline → online sync
- [ ] Test multi-user scenarios
- [ ] Test cascading updates

---

## 📊 Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Audit** | Review current implementation | 1 day |
| **Phase 2: Desktop** | Fix desktop mutation calls | 1-2 days |
| **Phase 3: Convex** | Enhance status update functions | 1-2 days |
| **Phase 4: Web** | Verify web app subscriptions | 0.5 day |
| **Phase 5: UI** | Add connection status indicators | 1 day |
| **Phase 6: Testing** | Comprehensive sync testing | 1-2 days |

**Total Estimated Time:** 5.5-8.5 days for complete implementation

---

## 🎯 Quick Wins (Immediate Actions)

If real-time sync is currently broken, these are the most likely culprits:

1. **Desktop not calling mutations** (most common)
   - Search desktop code for deal status updates
   - Ensure all use `useMutation` and call the mutation
   - Remove any local-only state updates

2. **Missing status update function**
   - Add comprehensive `updateDealStatus` mutation
   - Add cascading updates

3. **Web using stale data**
   - Ensure all deal queries use `useQuery` (not fetch/action)

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't mix local state with Convex state**
   - ❌ `setDeal({ ...deal, status: "COMPLETED" })` then call mutation
   - ✅ Just call mutation, let Convex update state automatically

2. **Don't use actions for queries**
   - ❌ `const deal = await ctx.runAction(api.deals.getDeal)`
   - ✅ `const deal = useQuery(api.deals.getDeal)`

3. **Don't poll for updates**
   - ❌ `setInterval(() => refetch(), 5000)`
   - ✅ Convex automatically pushes updates via WebSocket

4. **Don't forget error handling**
   - Always wrap mutations in try/catch
   - Show user-friendly error messages

---

## 🚀 Next Steps

Once approved:
1. ✅ Audit desktop app for all deal status update locations
2. ✅ Create comprehensive `updateDealStatus` mutation with cascading updates
3. ✅ Fix desktop app to call mutations instead of local state updates
4. ✅ Verify web app uses `useQuery` for all deal data
5. ✅ Add connection status UI to desktop app
6. ✅ Test all sync scenarios

**Expected Outcome:** When a deal is signed or finalized on desktop, the web app will update instantly (within 1-2 seconds) without any manual refresh.

**Ready to proceed when you approve!** 🚀

---

**Plan Version:** 1.0
**Last Updated:** 2025-11-05
**Status:** Awaiting approval
