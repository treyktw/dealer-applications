# Document Pack Marketplace - Implementation Plan

**Date:** 2025-11-05
**Feature:** Document Pack Purchasing System
**Purpose:** Allow dealers to purchase pre-made document templates from the platform

---

## 🎯 Overview

Create a marketplace where dealers can purchase professionally crafted document packs instead of creating their own manual templates. Documents are stored in Convex (not S3) and can be customized per dealer while using the same base templates.

---

## 📊 Data Architecture

### New Tables

#### 1. `document_pack_templates` (Master Templates)
```typescript
{
  _id: Id<"document_pack_templates">,
  name: string,                    // "California Cash Sale Pack"
  description: string,              // "Complete documents for CA cash sales"
  jurisdiction: string,             // "california" | "texas" | "federal"
  packType: string,                 // "cash_sale" | "finance" | "lease"
  price: number,                    // Price in cents (e.g., 9900 = $99.00)
  stripeProductId?: string,         // Stripe product ID
  stripePriceId?: string,          // Stripe price ID

  // Documents in this pack (stored in Convex)
  documents: [{
    type: string,                   // "bill_of_sale" | "odometer_disclosure"
    name: string,                   // "Bill of Sale"
    templateContent: string,        // HTML/PDF template content
    fillableFields: string[],       // ["buyerName", "vehicleVIN", etc.]
    required: boolean,
    order: number,                  // Display order
  }],

  // Metadata
  isActive: boolean,
  version: number,                  // Template version
  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,          // Master admin who created it

  // Sales tracking
  totalPurchases: number,
  totalRevenue: number,
}
```

#### 2. `dealer_document_pack_purchases` (Dealer Ownership)
```typescript
{
  _id: Id<"dealer_document_pack_purchases">,
  dealershipId: Id<"dealerships">,
  packTemplateId: Id<"document_pack_templates">,

  // Purchase info
  purchaseDate: number,
  purchasedBy: Id<"users">,        // User who made the purchase
  amountPaid: number,               // Amount in cents

  // Stripe info
  stripeCheckoutSessionId?: string,
  stripePaymentIntentId?: string,

  // Status
  status: "active" | "refunded" | "cancelled",

  // Usage tracking
  timesUsed: number,               // How many deals used this pack
  lastUsedAt?: number,

  // Customization (optional - for future)
  customizations?: {
    // Dealers can customize certain aspects
    logoOverride?: string,
    colorScheme?: string,
  },

  createdAt: number,
  updatedAt: number,
}
```

#### 3. Update existing `deals` table
```typescript
// Add to existing deals schema:
{
  // ... existing fields ...
  documentPackUsed?: Id<"dealer_document_pack_purchases">,  // Which pack was used
  documentPackVersion?: number,                              // Version used (for audit)
}
```

---

## 🔄 User Flows

### Flow 1: Master Admin Creates Document Pack

1. Master admin navigates to "Document Pack Management"
2. Clicks "Create New Pack"
3. Fills in:
   - Name, description
   - Jurisdiction, pack type
   - Price
4. Adds documents to pack:
   - Uploads/pastes template content
   - Defines fillable fields
   - Sets document order
5. Clicks "Create Pack"
6. System:
   - Creates Stripe product and price
   - Stores pack in `document_pack_templates`
   - Makes pack available in marketplace

### Flow 2: Dealer Purchases Document Pack

1. Dealer navigates to "Document Pack Marketplace"
2. Browses available packs (filtered by jurisdiction)
3. Clicks "Preview Pack" to see included documents
4. Clicks "Purchase for $X"
5. System:
   - Creates Stripe Checkout Session
   - Redirects to Stripe checkout
6. Dealer completes payment
7. Stripe webhook received:
   - Creates record in `dealer_document_pack_purchases`
   - Sends confirmation email
8. Dealer redirected back to app with success message

### Flow 3: Dealer Uses Purchased Pack

1. Dealer creates a new deal
2. Navigates to "Generate Documents"
3. System checks:
   - Does dealer own any packs for this jurisdiction/type?
   - If yes: Show "Use [Pack Name]" option
   - If no: Show "Use Manual Templates" or "Purchase Pack"
4. Dealer selects pack
5. System generates documents using pack templates
6. Documents are customized with deal data (buyer name, VIN, etc.)
7. Documents ready for signing

---

## 🛠️ Technical Implementation

### Phase 1: Schema & Convex Functions

**Files to Create/Modify:**

1. `convex/schema.ts`
   - Add `document_pack_templates` table
   - Add `dealer_document_pack_purchases` table
   - Update `deals` table

2. `convex/documentPackTemplates.ts` (NEW)
   - `create` - Master admin creates pack
   - `update` - Master admin updates pack
   - `delete` - Master admin deletes pack
   - `list` - List all packs (with filters)
   - `getById` - Get pack details
   - `seedInitialPacks` - Seed predefined packs

3. `convex/dealerDocumentPackPurchases.ts` (NEW)
   - `listAvailablePacks` - Dealer browsing marketplace
   - `getOwnedPacks` - Get dealer's purchased packs
   - `createCheckoutSession` - Create Stripe checkout
   - `recordPurchase` - Called by webhook after payment
   - `checkOwnership` - Check if dealer owns a pack

4. `convex/documentGeneration.ts` (NEW or update existing)
   - `generateFromPack` - Generate documents using purchased pack
   - `previewPackDocuments` - Preview pack before purchase

5. `convex/stripe_webhook.ts` (UPDATE)
   - Add handler for `checkout.session.completed` for pack purchases

---

### Phase 2: Stripe Integration

**Steps:**

1. Create Stripe products for each pack (can be done via webhook or admin UI)
2. Create prices for each product
3. Handle checkout sessions
4. Process webhooks for successful purchases

**Example Stripe Product Structure:**
```json
{
  "name": "California Cash Sale Document Pack",
  "description": "Complete set of documents for cash sales in California",
  "metadata": {
    "packTemplateId": "abc123",
    "jurisdiction": "california",
    "packType": "cash_sale"
  }
}
```

---

### Phase 3: Master Admin UI

**New Pages/Components:**

1. `/master-admin/document-packs` (List view)
   - Table of all packs
   - Columns: Name, Jurisdiction, Type, Price, Purchases, Revenue, Status
   - Actions: Edit, Deactivate, View Purchases

2. `/master-admin/document-packs/new` (Create pack)
   - Form for pack details
   - Document editor/uploader
   - Preview feature
   - Publish button

3. `/master-admin/document-packs/[id]/edit` (Edit pack)
   - Same as create, but pre-filled
   - Version management
   - Publish updates

4. `/master-admin/document-packs/[id]/purchases` (View purchases)
   - List of dealers who purchased
   - Purchase date, amount, usage stats

5. Component: `DocumentPackForm`
   - Reusable form for create/edit
   - Document builder interface
   - Field mapping UI

---

### Phase 4: Dealer Marketplace UI

**New Pages/Components:**

1. `/settings/document-packs` or `/marketplace/document-packs` (Browse)
   - Grid/list of available packs
   - Filters: Jurisdiction, Type, Price
   - Cards showing:
     - Pack name, description
     - Included documents count
     - Price
     - Preview/Purchase buttons

2. `/marketplace/document-packs/[id]` (Pack detail/preview)
   - Full pack details
   - List of included documents
   - Sample preview of templates
   - Purchase button

3. `/settings/my-document-packs` (Owned packs)
   - List of purchased packs
   - Usage statistics
   - Download/export options

4. Component: `DocumentPackCard`
   - Card for displaying pack in marketplace
   - Shows key info and CTA

5. Component: `DocumentPackPurchaseButton`
   - Handles Stripe checkout
   - Shows loading states
   - Success/error handling

---

### Phase 5: Deal Document Generation Integration

**Update existing document generation:**

1. When dealer generates documents for a deal:
   - Check if they own pack for this jurisdiction/type
   - Show option to use pack OR manual templates
   - If pack selected:
     - Load pack templates
     - Fill in deal data
     - Generate documents
   - Track usage in `dealer_document_pack_purchases.timesUsed`

2. Document generation UI updates:
   - Add pack selector dropdown
   - Show pack preview before generation
   - Indicate if pack is owned vs. needs purchase

---

## 💰 Pricing Model

**Suggested Pricing:**

| Pack Type | Price | Included Documents |
|-----------|-------|-------------------|
| Basic Cash Sale | $49 | 3-4 essential docs |
| Complete Cash Sale | $99 | 7-8 comprehensive docs |
| Finance Pack | $149 | 10+ finance docs |
| Complete Suite | $249 | All documents (cash + finance + lease) |

**Revenue Share:**
- Platform keeps 100% of pack sales
- One-time purchase per dealership
- Lifetime access to pack
- Free updates to pack templates

---

## 🔐 Access Control

**Master Admin:**
- Full CRUD on `document_pack_templates`
- View all purchases across all dealers
- Set pricing
- Activate/deactivate packs
- Seed initial packs

**Dealer Admin:**
- Browse marketplace
- Purchase packs
- View owned packs
- Use packs in deals

**Dealer Staff:**
- View owned packs
- Use packs in deals
- Cannot purchase (requires admin)

---

## 📝 Seeding Initial Packs

**Function: `seedDocumentPacks`**

```typescript
// convex/documentPackTemplates.ts

export const seedInitialPacks = mutation({
  args: {},
  handler: async (ctx) => {
    // Master admin only
    const user = await getMasterAdmin(ctx);

    const californiaPackId = await ctx.db.insert("document_pack_templates", {
      name: "California Cash Sale Pack",
      description: "Complete set of documents for cash vehicle sales in California, compliant with DMV regulations.",
      jurisdiction: "california",
      packType: "cash_sale",
      price: 9900, // $99.00
      documents: [
        {
          type: "bill_of_sale",
          name: "Bill of Sale (REG 135)",
          templateContent: "<!-- HTML template content here -->",
          fillableFields: ["buyerName", "sellerName", "vehicleYear", "vehicleMake", "vehicleModel", "vin", "salePrice", "saleDate"],
          required: true,
          order: 1,
        },
        {
          type: "odometer_disclosure",
          name: "Odometer Disclosure Statement",
          templateContent: "<!-- HTML template content here -->",
          fillableFields: ["buyerName", "sellerName", "vin", "odometer", "date"],
          required: true,
          order: 2,
        },
        // ... more documents
      ],
      isActive: true,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user._id,
      totalPurchases: 0,
      totalRevenue: 0,
    });

    // Create Stripe product and price
    // (Can be done here or separately)

    return { success: true, packId: californiaPackId };
  },
});
```

---

## 🧪 Testing Checklist

### Master Admin Tests
- [ ] Create new document pack
- [ ] Edit existing pack
- [ ] Deactivate pack
- [ ] Seed initial packs
- [ ] View all purchases
- [ ] View revenue analytics

### Dealer Tests
- [ ] Browse marketplace
- [ ] Filter packs by jurisdiction
- [ ] Preview pack before purchase
- [ ] Purchase pack with Stripe
- [ ] View owned packs
- [ ] Use pack in deal generation
- [ ] Cannot purchase same pack twice

### Stripe Tests
- [ ] Checkout session created
- [ ] Payment successful webhook handled
- [ ] Purchase recorded in database
- [ ] Refund handling
- [ ] Failed payment handling

### Document Generation Tests
- [ ] Generate documents from purchased pack
- [ ] Fill fields correctly
- [ ] Track usage count
- [ ] Fall back to manual templates if no pack

---

## 📈 Future Enhancements

1. **Pack Subscriptions**
   - Monthly fee for access to all packs
   - Auto-updates

2. **Custom Pack Builder**
   - Dealers can create packs from individual docs
   - Mix and match

3. **Pack Marketplace**
   - Dealers can sell their custom packs
   - Revenue sharing

4. **Multi-Language Packs**
   - Spanish translations
   - Other languages

5. **Industry-Specific Packs**
   - Commercial vehicles
   - Motorcycles
   - RVs

---

## 🚀 Implementation Order

1. ✅ **Phase 1: Schema & Core Functions** (2-3 hours)
   - Add tables to schema
   - Create CRUD functions
   - Seed initial packs

2. ✅ **Phase 2: Stripe Integration** (1-2 hours)
   - Checkout session creation
   - Webhook handling
   - Purchase recording

3. ✅ **Phase 3: Master Admin UI** (3-4 hours)
   - Pack management pages
   - Create/edit forms
   - Analytics dashboard

4. ✅ **Phase 4: Dealer Marketplace** (2-3 hours)
   - Browse packs UI
   - Purchase flow
   - Owned packs view

5. ✅ **Phase 5: Integration** (2-3 hours)
   - Connect to deal generation
   - Testing
   - Documentation

**Total Estimated Time:** 10-15 hours

---

## 💡 Key Benefits

**For Platform:**
- New revenue stream
- Recurring value for dealers
- Differentiation from competitors

**For Dealers:**
- Professional, compliant documents
- No need to create templates
- Automatic updates
- Time savings

**For End Users (Buyers):**
- Consistent, professional documentation
- Compliant with regulations
- Better experience

---

**Status:** Ready to implement
**Next Step:** Begin Phase 1 - Schema & Core Functions
