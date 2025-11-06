/**
 * Polar.sh Webhook Handler
 * Receives and processes webhook events from Polar for license purchases
 */

import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Polar webhook endpoint
 * URL: https://your-convex-url.convex.cloud/polar/webhook
 *
 * Configure in Polar dashboard:
 * - Events: order.created, license_key.activated, license_key.deactivated
 * - Secret: Store in environment variable POLAR_WEBHOOK_SECRET
 */
export const webhook = httpAction(async (ctx, request) => {
  try {
    // Get webhook signature
    const signature = request.headers.get("polar-signature");
    const timestamp = request.headers.get("polar-timestamp");
    const body = await request.text();

    // Verify signature
    const isValid = await verifyWebhookSignature(body, signature, timestamp);
    if (!isValid) {
      console.error("Invalid Polar webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse webhook event
    const event = JSON.parse(body);
    console.log(`Polar webhook received: ${event.type}`, event);

    // Handle different event types
    switch (event.type) {
      case "order.created":
        await handleOrderCreated(ctx, event);
        break;

      case "order.refunded":
        await handleOrderRefunded(ctx, event);
        break;

      case "license_key.activated":
        await handleLicenseActivated(ctx, event);
        break;

      case "license_key.deactivated":
        await handleLicenseDeactivated(ctx, event);
        break;

      default:
        console.log(`Unhandled Polar event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Polar webhook error:", error);
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
 * Handle order.created event
 * Creates a new license in the database
 */
async function handleOrderCreated(ctx: any, event: any) {
  const data = event.data;

  // Determine license tier from product/price
  let tier: "single" | "team" | "enterprise" = "single";

  // Parse tier from product name or metadata
  if (data.product_name) {
    const name = data.product_name.toLowerCase();
    if (name.includes("team")) {
      tier = "team";
    } else if (name.includes("enterprise")) {
      tier = "enterprise";
    }
  }

  // Or from custom metadata if you set it in Polar
  if (data.metadata?.tier) {
    tier = data.metadata.tier as any;
  }

  // Create license
  await ctx.runMutation(internal.licenses.createLicense, {
    orderId: data.id,
    customerId: data.customer_id,
    customerEmail: data.customer_email,
    productId: data.product_id,
    licenseKey: data.license_key || generateLicenseKey(),
    tier,
    amount: data.amount,
    currency: data.currency || "USD",
  });

  console.log(`License created for order ${data.id}`);

  // TODO: Send welcome email with license key
  // await sendWelcomeEmail(data.customer_email, data.license_key);
}

/**
 * Handle order.refunded event
 * Deactivates the license
 */
async function handleOrderRefunded(ctx: any, event: any) {
  const data = event.data;

  // Find license by order ID
  const license = await ctx.runQuery(api.licenses.getLicenseInfo, {
    licenseKey: data.license_key,
  });

  if (license) {
    // Revoke the license
    await ctx.runMutation(api.licenses.revokeLicense, {
      licenseKey: data.license_key,
      reason: `Order refunded: ${data.id}`,
    });

    console.log(`License revoked due to refund: ${data.license_key}`);
  }
}

/**
 * Handle license_key.activated event
 * Updates activation in database (if Polar manages activations)
 */
async function handleLicenseActivated(ctx: any, event: any) {
  const data = event.data;

  console.log(`License activated: ${data.license_key} on machine ${data.machine_id}`);

  // If you're letting Polar manage activations, sync here
  // Otherwise, activation happens via your app's mutation
}

/**
 * Handle license_key.deactivated event
 * Updates deactivation in database (if Polar manages activations)
 */
async function handleLicenseDeactivated(ctx: any, event: any) {
  const data = event.data;

  console.log(`License deactivated: ${data.license_key} from machine ${data.machine_id}`);

  // Sync deactivation if managed by Polar
}

/**
 * Verify Polar webhook signature
 * Uses HMAC SHA-256 to verify authenticity
 */
async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  // Get webhook secret from environment
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("POLAR_WEBHOOK_SECRET not set - skipping signature verification");
    return true; // Allow in development if secret not set
  }

  if (!signature || !timestamp) {
    console.error("Missing signature or timestamp");
    return false;
  }

  try {
    // Construct signed payload
    const signedPayload = `${timestamp}.${body}`;

    // Compute HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));

    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Compare signatures
    return computedSignature === signature;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

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
 * Test webhook endpoint (for development)
 * Call this to simulate a purchase and test the flow
 */
export const testWebhook = httpAction(async (ctx, request) => {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return new Response("Not available in production", { status: 403 });
  }

  const testEvent = {
    type: "order.created",
    data: {
      id: "test_order_" + Date.now(),
      customer_id: "test_customer",
      customer_email: "test@example.com",
      product_id: "test_product",
      product_name: "Dealer Software Single License",
      license_key: generateLicenseKey(),
      amount: 49700, // $497.00
      currency: "USD",
    },
  };

  await handleOrderCreated(ctx, testEvent);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Test license created",
      licenseKey: testEvent.data.license_key,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
