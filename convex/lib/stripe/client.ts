// convex/lib/stripe/client.ts
// Centralized Stripe client configuration

import Stripe from "stripe";

// Validate required environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

if (!webhookSecret) {
  console.warn("⚠️ STRIPE_WEBHOOK_SECRET not set - webhooks will not work");
}

/**
 * Stripe API client
 * Configured with latest API version and proper error handling
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000, // 30 seconds
});

/**
 * Get Stripe client (for use in actions)
 */
export async function getStripeClient(): Promise<Stripe> {
  return stripe;
}

/**
 * Webhook secret for signature verification
 */
export const STRIPE_WEBHOOK_SECRET = webhookSecret;

/**
 * Test if Stripe is properly configured
 */
export async function testStripeConnection(): Promise<boolean> {
  try {
    // Try to retrieve account info
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Stripe connected: ${account.id} (${account.business_profile?.name || 'No name'})`);
    return true;
  } catch (error) {
    console.error("❌ Stripe connection failed:", error);
    return false;
  }
}
