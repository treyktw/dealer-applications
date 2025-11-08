/**
 * Stripe Webhook Handler for License Purchases
 * @deprecated This webhook is deprecated. We now use subscriptions only.
 * License purchases are handled via subscription webhooks in stripeWebhook.ts
 * This file is kept for backward compatibility with existing one-time purchases.
 */

import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Generate a license key
 * Format: DEALER-XXXX-XXXX-XXXX
 */
function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  const segments = 3;
  const segmentLength = 4;

  let key = "DEALER";

  for (let i = 0; i < segments; i++) {
    key += "-";
    for (let j = 0; j < segmentLength; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return key;
}

/**
 * Stripe webhook endpoint for license purchases
 * URL: https://your-convex-url.convex.cloud/license/webhook
 * 
 * Configure in Stripe dashboard:
 * - Events: payment_intent.succeeded, checkout.session.completed
 * - Secret: Store in environment variable STRIPE_WEBHOOK_SECRET
 */
export const webhook = httpAction(async (ctx, request) => {
  try {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();

    if (!signature) {
      console.error("Missing Stripe signature");
      return new Response("Missing signature", { status: 401 });
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature);
    if (!isValid) {
      console.error("Invalid Stripe webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log(`Stripe license webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(ctx, event);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(ctx, event);
        break;

      case "charge.refunded":
        await handleChargeRefunded(ctx, event);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe license webhook error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Handle payment_intent.succeeded event
 * Creates a license when payment is successful
 */
async function handlePaymentIntentSucceeded(ctx: any, event: any) {
  const paymentIntent = event.data.object;
  
  // Only process if this is a license purchase (check metadata)
  if (paymentIntent.metadata?.type !== "license") {
    console.log("Skipping payment intent - not a license purchase");
    return;
  }

  // Check if license already exists for this payment intent
  const existingLicense = await ctx.runQuery(api.licenses.getLicenseByPaymentIntent, {
    paymentIntentId: paymentIntent.id,
  });

  if (existingLicense) {
    console.log(`License already exists for payment intent: ${paymentIntent.id}`);
    return;
  }

  // Get customer email from payment intent
  const customerEmail = paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail;
  if (!customerEmail) {
    console.error("No customer email in payment intent");
    return;
  }

  // Get product ID (for backward compatibility with old purchases)
  const productId = paymentIntent.metadata?.productId || paymentIntent.metadata?.stripeProductId;
  if (!productId) {
    console.error("No product ID in payment intent metadata");
    return;
  }

  // Note: We no longer support one-time license purchases
  // This handler is kept for backward compatibility only
  console.warn("One-time license purchase detected - this is deprecated. Use subscriptions instead.");

  // Generate license key
  const licenseKey = paymentIntent.metadata?.licenseKey || generateLicenseKey();

  // For backward compatibility, create a license with a default tier
  // Note: This should not be used for new purchases
  await ctx.runMutation(internal.licenses.createLicense, {
    paymentIntentId: paymentIntent.id,
    checkoutSessionId: paymentIntent.metadata?.checkoutSessionId,
    stripeCustomerId: paymentIntent.customer as string,
    customerEmail,
    stripeProductId: productId,
    stripePriceId: paymentIntent.metadata?.priceId || "",
    licenseKey,
    tier: "single", // Default for backward compatibility
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  });

  console.log(`License created for payment intent: ${paymentIntent.id} (deprecated one-time purchase)`);
}

/**
 * Handle checkout.session.completed event
 * Alternative handler for checkout-based purchases
 */
async function handleCheckoutCompleted(ctx: any, event: any) {
  const session = event.data.object;

  // Only process if this is a license purchase
  if (session.metadata?.type !== "license") {
    console.log("Skipping checkout session - not a license purchase");
    return;
  }

  // Get payment intent from session
  const paymentIntentId = session.payment_intent as string;
  if (!paymentIntentId) {
    console.error("No payment intent in checkout session");
    return;
  }

  // Check if license already exists
  const existingLicense = await ctx.runQuery(api.licenses.getLicenseByPaymentIntent, {
    paymentIntentId,
  });

  if (existingLicense) {
    console.log(`License already exists for payment intent: ${paymentIntentId}`);
    return;
  }

  // Get customer email
  const customerEmail = session.customer_email || session.metadata?.customerEmail;
  if (!customerEmail) {
    console.error("No customer email in checkout session");
    return;
  }

  // Get product/price info from line items
  const lineItem = session.display_items?.[0] || session.line_items?.data?.[0];
  const productId = lineItem?.price?.product || session.metadata?.productId;
  const priceId = lineItem?.price?.id || session.metadata?.priceId;

  if (!productId) {
    console.error("No product ID in checkout session");
    return;
  }

  // Note: We no longer support one-time license purchases
  // This handler is kept for backward compatibility only
  console.warn("One-time license purchase detected - this is deprecated. Use subscriptions instead.");

  // Generate license key
  const licenseKey = session.metadata?.licenseKey || generateLicenseKey();

  // For backward compatibility, create a license with a default tier
  // Note: This should not be used for new purchases
  await ctx.runMutation(internal.licenses.createLicense, {
    paymentIntentId,
    checkoutSessionId: session.id,
    stripeCustomerId: session.customer as string,
    customerEmail,
    stripeProductId: productId,
    stripePriceId: priceId || "",
    licenseKey,
    tier: "single", // Default for backward compatibility
    amount: session.amount_total || 0,
    currency: session.currency || "usd",
  });

  console.log(`License created for checkout session: ${session.id} (deprecated one-time purchase)`);
}

/**
 * Handle charge.refunded event
 * Deactivates the license when refunded
 */
async function handleChargeRefunded(ctx: any, event: any) {
  const charge = event.data.object;
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.error("No payment intent in refunded charge");
    return;
  }

  // Find license by payment intent
  const license = await ctx.runQuery(api.licenses.getLicenseByPaymentIntent, {
    paymentIntentId,
  });

  if (!license) {
    console.log(`License not found for payment intent: ${paymentIntentId}`);
    return;
  }

  // Revoke the license
  await ctx.runMutation(api.licenses.revokeLicense, {
    licenseKey: license.licenseKey,
    reason: `Payment refunded: ${paymentIntentId}`,
  });

  console.log(`License revoked due to refund: ${license.licenseKey}`);
}

/**
 * Verify Stripe webhook signature
 */
async function verifyStripeSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("STRIPE_WEBHOOK_SECRET not set - skipping signature verification");
    return true; // Allow in development if secret not set
  }

  if (!signature) {
    return false;
  }

  try {
    // Use Stripe's signature verification
    const { stripe } = await import("./lib/stripe/client");
    
    // Verify signature using Stripe's method
    try {
      stripe.webhooks.constructEvent(body, signature, secret);
      return true;
    } catch (err) {
      console.error("Stripe signature verification failed:", err);
      return false;
    }
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

