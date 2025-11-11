# Polar Setup Guide for Standalone Desktop App

This guide walks you through setting up Polar.sh for monetizing your standalone desktop application with license keys and one-time purchases.

## What is Polar?

Polar (polar.sh) is a merchant of record (MOR) platform designed for developers. It handles:
- Payment processing (credit cards, PayPal, etc.)
- Tax calculations and remittance globally
- License key generation and management
- Webhooks for purchase notifications
- Customer management

## Why Polar for Desktop Apps?

1. **License Keys**: Built-in license key system perfect for desktop software
2. **One-Time Purchases**: Sell perpetual licenses (vs subscriptions)
3. **Global Payments**: Handles international payments and taxes
4. **Developer-Friendly**: Simple API and webhook system
5. **Lower Fees**: Competitive pricing compared to alternatives

## Phase 1: Account Setup

### Step 1: Create Your Polar Account

1. Go to https://polar.sh
2. Click "Sign Up" or "Get Started"
3. Sign up with GitHub (recommended) or email
4. Complete the verification process

### Step 2: Configure Your Organization

1. Navigate to Settings → Organization
2. Fill in:
   - **Organization Name**: Your business/product name
   - **Business Email**: Contact email for customers
   - **Website**: Your product website
   - **Description**: Brief description of your product
3. Save changes

### Step 3: Set Up Payment Details

1. Go to Settings → Payments
2. Connect your payout account:
   - **Stripe Connect**: For receiving payments
   - **Country**: Your business location
   - **Bank Account**: Where you'll receive funds
3. Complete Stripe onboarding (KYC verification may be required)

### Step 4: Configure Tax Settings

1. Go to Settings → Tax
2. Set your tax registration:
   - **Tax ID/VAT Number** (if applicable)
   - **Tax nexus locations** (where you're registered to collect tax)
3. Polar automatically calculates and collects tax based on customer location

## Phase 2: Create Your Product

### Step 1: Create a Product

1. Navigate to Products
2. Click "Create Product"
3. Fill in product details:

```
Product Name: Dealer Software License
Description: Perpetual license for Dealer Software desktop application
Type: Digital Product
```

### Step 2: Set Up Pricing

Configure your pricing structure. Here are recommended tiers:

**Option 1: Single License**
```
Price: $497 one-time
- Single license key
- Lifetime updates
- Email support
```

**Option 2: Multiple Tiers**
```
Tier 1 - Single License: $497
- 1 license key
- Lifetime updates
- Email support

Tier 2 - Team License: $997
- 5 license keys
- Lifetime updates
- Priority support
- Free upgrades

Tier 3 - Enterprise: $2,497
- Unlimited licenses
- Lifetime updates
- Priority support
- Dedicated account manager
- Custom integrations
```

### Step 3: Enable License Keys

1. In your product settings, enable "License Keys"
2. Configure license key format:
   ```
   Format: DEALER-XXXX-XXXX-XXXX
   Prefix: DEALER
   Length: 19 characters
   ```

3. Set activation limits:
   - **Single License**: 1 activation
   - **Team License**: 5 activations
   - **Enterprise**: Unlimited activations

### Step 4: Set Up Benefits

Define what customers receive:

1. Add benefits to your product:
   - ✅ Desktop application access
   - ✅ Lifetime updates
   - ✅ Email support
   - ✅ Commercial use rights
   - ✅ Priority support (higher tiers)

## Phase 3: Webhook Integration

Webhooks notify your backend when purchases occur.

### Step 1: Create Webhook Endpoint

Add this to your Convex backend:

```typescript
// convex/polar.ts
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

export const webhook = httpAction(async (ctx, request) => {
  // Verify webhook signature
  const signature = request.headers.get("polar-signature");
  const body = await request.text();

  // Verify signature (Polar provides verification lib)
  const isValid = verifyPolarSignature(body, signature);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  // Handle different event types
  switch (event.type) {
    case "order.created":
      await ctx.runMutation(api.licenses.createLicense, {
        orderId: event.data.id,
        customerId: event.data.customer_id,
        customerEmail: event.data.customer_email,
        productId: event.data.product_id,
        licenseKey: event.data.license_key,
        amount: event.data.amount,
      });
      break;

    case "license_key.activated":
      await ctx.runMutation(api.licenses.activateLicense, {
        licenseKey: event.data.license_key,
        machineId: event.data.machine_id,
      });
      break;

    case "license_key.deactivated":
      await ctx.runMutation(api.licenses.deactivateLicense, {
        licenseKey: event.data.license_key,
        machineId: event.data.machine_id,
      });
      break;
  }

  return new Response("OK", { status: 200 });
});
```

### Step 2: Register Webhook in Polar

1. Go to Settings → Webhooks
2. Click "Add Webhook"
3. Configure:
   ```
   URL: https://your-convex-url.convex.cloud/polar/webhook
   Events:
     - order.created
     - license_key.activated
     - license_key.deactivated
   ```
4. Save the webhook secret for signature verification

## Phase 4: License Management System

### Create License Schema

```typescript
// convex/schema.ts
export default defineSchema({
  licenses: defineTable({
    orderId: v.string(),
    licenseKey: v.string(),
    customerEmail: v.string(),
    customerId: v.string(),
    productId: v.string(),
    tier: v.union(v.literal("single"), v.literal("team"), v.literal("enterprise")),
    maxActivations: v.number(),
    activations: v.array(
      v.object({
        machineId: v.string(),
        activatedAt: v.number(),
        lastSeen: v.number(),
        platform: v.string(),
        appVersion: v.string(),
      })
    ),
    isActive: v.boolean(),
    issuedAt: v.number(),
    expiresAt: v.optional(v.number()), // null for perpetual
    amount: v.number(),
    dealershipId: v.optional(v.id("dealerships")),
  })
    .index("by_license_key", ["licenseKey"])
    .index("by_customer", ["customerEmail"])
    .index("by_dealership", ["dealershipId"]),
});
```

### License Validation Functions

```typescript
// convex/licenses.ts
export const validateLicense = query({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) {
      return { valid: false, reason: "License not found" };
    }

    if (!license.isActive) {
      return { valid: false, reason: "License deactivated" };
    }

    // Check if already activated on this machine
    const existingActivation = license.activations.find(
      (a) => a.machineId === args.machineId
    );

    if (existingActivation) {
      return { valid: true, license };
    }

    // Check activation limit
    if (license.activations.length >= license.maxActivations) {
      return { valid: false, reason: "Maximum activations reached" };
    }

    return { valid: true, license };
  },
});

export const activateLicense = mutation({
  args: {
    licenseKey: v.string(),
    machineId: v.string(),
    platform: v.string(),
    appVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();

    if (!license) throw new Error("License not found");

    // Check if already activated
    const existingIndex = license.activations.findIndex(
      (a) => a.machineId === args.machineId
    );

    if (existingIndex >= 0) {
      // Update last seen
      const updated = [...license.activations];
      updated[existingIndex].lastSeen = Date.now();
      await ctx.db.patch(license._id, { activations: updated });
      return { success: true, message: "License already activated" };
    }

    // Check limit
    if (license.activations.length >= license.maxActivations) {
      throw new Error("Maximum activations reached");
    }

    // Add activation
    await ctx.db.patch(license._id, {
      activations: [
        ...license.activations,
        {
          machineId: args.machineId,
          activatedAt: Date.now(),
          lastSeen: Date.now(),
          platform: args.platform,
          appVersion: args.appVersion,
        },
      ],
    });

    return { success: true, message: "License activated" };
  },
});
```

## Phase 5: Desktop App Integration

### Create License Activation UI

```tsx
// apps/desktop/src/components/LicenseActivation.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activateLicense = useMutation(api.licenses.activateLicense);

  async function handleActivate() {
    setLoading(true);
    setError('');

    try {
      // Get machine ID from Tauri
      const machineId = await invoke('get_machine_id');
      const platform = await invoke('get_platform');
      const appVersion = await invoke('get_app_version');

      // Activate via Convex
      await activateLicense({
        licenseKey: licenseKey.trim(),
        machineId,
        platform,
        appVersion,
      });

      // Store license in secure storage
      await invoke('store_license', { licenseKey: licenseKey.trim() });

      // Redirect to app
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to activate license');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">Activate Your License</h2>
      <p className="text-muted-foreground mb-6">
        Enter the license key you received after purchase.
      </p>

      <input
        type="text"
        value={licenseKey}
        onChange={(e) => setLicenseKey(e.target.value)}
        placeholder="DEALER-XXXX-XXXX-XXXX"
        className="w-full p-3 border rounded mb-4"
      />

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      <button
        onClick={handleActivate}
        disabled={loading || !licenseKey}
        className="w-full bg-primary text-white p-3 rounded disabled:opacity-50"
      >
        {loading ? 'Activating...' : 'Activate License'}
      </button>

      <p className="text-sm text-muted-foreground mt-4">
        Don't have a license?{' '}
        <a href="https://polar.sh/your-org/products/dealer-software" className="text-primary">
          Purchase now
        </a>
      </p>
    </div>
  );
}
```

## Phase 6: Testing

### Test Purchase Flow

1. **Create Test Mode Product**:
   - Polar provides test mode for development
   - Use test credit cards

2. **Test Scenarios**:
   - ✅ Successful purchase
   - ✅ License activation
   - ✅ Activation on multiple machines
   - ✅ Activation limit reached
   - ✅ Invalid license key
   - ✅ Deactivated license

### Test Webhook Delivery

1. Use Polar's webhook testing tool
2. Send test events to your webhook endpoint
3. Verify database updates correctly

## Phase 7: Go Live

### Pre-Launch Checklist

- [ ] Polar account fully verified
- [ ] Payment method connected
- [ ] Product created and priced
- [ ] License keys enabled
- [ ] Webhook endpoint configured and tested
- [ ] Desktop app license UI complete
- [ ] Test purchases completed successfully
- [ ] Legal pages updated (terms, privacy, refund policy)
- [ ] Support email set up
- [ ] Sales page/landing page ready

### Launch Steps

1. **Switch from Test to Live Mode** in Polar dashboard
2. **Update webhook URL** to production
3. **Deploy desktop app** with license activation
4. **Announce launch** to your audience
5. **Monitor** first purchases closely

## Phase 8: Post-Launch

### Monitor Key Metrics

- Purchase conversion rate
- License activation rate
- Failed payments
- Support tickets
- Activation errors

### Customer Support

Set up processes for:
- License key issues
- Activation problems
- Refund requests
- Upgrade requests (single → team → enterprise)

### Marketing Integration

Connect Polar webhooks to:
- Email marketing (welcome sequences)
- CRM (customer records)
- Analytics (purchase tracking)

## Pricing Strategy Recommendations

### Market Research

Research similar desktop software:
- Dealership management software: $500-$5,000
- CRM systems: $300-$2,000
- Specialized business software: $400-$3,000

### Recommended Pricing

```
Single Dealership: $497
├─ Perfect for solo dealers
├─ 1 license
└─ Full features

Small Team: $997
├─ 2-5 users
├─ 5 licenses
└─ Priority support

Enterprise: $2,497
├─ Unlimited users
├─ Volume pricing
└─ Custom features
```

### Launch Pricing

Consider an introductory offer:
- **Early Bird**: 30% off for first 100 customers
- **Founding Member**: 40% off + lifetime discount on renewals
- **Limited Time**: $347 instead of $497

## Alternative: Subscription Model

If you prefer subscriptions over one-time:

```
Monthly: $49/month
├─ Pay as you go
├─ Cancel anytime
└─ Always up-to-date

Annually: $490/year (save 17%)
├─ Best value
├─ 2 months free
└─ Priority support
```

## Next Steps

1. ✅ Create Polar account
2. ✅ Set up products and pricing
3. ✅ Configure webhooks
4. ✅ Implement license system
5. ✅ Build activation UI
6. ✅ Test thoroughly
7. ✅ Launch!

## Support & Resources

- **Polar Documentation**: https://docs.polar.sh
- **Polar Discord**: Community support
- **API Reference**: https://docs.polar.sh/api
- **Webhook Reference**: https://docs.polar.sh/webhooks

## Questions?

Common questions:

**Q: Can customers transfer licenses?**
A: Yes, implement a deactivation/reactivation flow.

**Q: What about refunds?**
A: Polar handles refunds; webhook notifies you to deactivate license.

**Q: Can I offer trials?**
A: Yes, implement time-limited trial licenses.

**Q: How do upgrades work?**
A: Customer purchases new tier; issue new license key with more activations.

---

Good luck with your launch! 🚀
