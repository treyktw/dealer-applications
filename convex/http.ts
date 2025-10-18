// convex/http.ts - Updated with Verification Code Auth + External API Routes
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// Import external API handlers
import { 
  getVehicles, 
  getVehicle, 
  getDealership, 
  searchVehicles,
  handleOptions 
} from "./external_api";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ============================================================================
// STRIPE WEBHOOK (existing)
// ============================================================================

const stripeWebhook = httpAction(async (ctx, request) => {
  console.log("=== STRIPE WEBHOOK RECEIVED ===");
  console.log("Method:", request.method);
  console.log("URL:", request.url);

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  
  console.log("Webhook details:", {
    hasSignature: !!signature,
    bodyLength: body.length,
    timestamp: new Date().toISOString(),
  });
  
  if (!signature) {
    console.error("No signature in webhook request");
    return new Response("No signature", { status: 400 });
  }

  try {
    // Verify the webhook
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log("Webhook event verified successfully:", {
      type: event.type,
      id: event.id,
      created: event.created,
    });

    // Call your existing action to handle the logic
    await ctx.runAction(internal.stripe_webhook.handleStripeWebhook, {
      signature,
      payload: body,
    });

    console.log("Webhook processed successfully");
    return new Response("OK", { status: 200 });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Webhook processing error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
});

// ============================================================================
// HEALTH & STATUS ENDPOINTS (existing)
// ============================================================================

const healthCheck = httpAction(async (_ctx, _request) => {
  return new Response(JSON.stringify({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    },
  });
});

const apiStatus = httpAction(async (_ctx, _request) => {
  return new Response(JSON.stringify({
    message: "Dealership API is running",
    endpoints: [
      "GET /api/vehicles/{dealershipId}",
      "GET /api/vehicle/{dealershipId}/{vehicleId}", 
      "GET /api/dealership/{dealershipId}",
      "GET /api/search/{dealershipId}?q=search_term",
      "POST /auth/request-code",
      "POST /auth/verify-code"
    ],
    rateLimit: {
      vehicles: "60 requests/hour per IP",
      vehicle: "100 requests/hour per IP",
      dealership: "20 requests/hour per IP",
      search: "30 requests/hour per IP"
    },
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600"
    },
  });
});

// ============================================================================
// EMAIL AUTH ENDPOINTS (VERIFICATION CODES)
// ============================================================================

/**
 * Request verification code - public endpoint
 * POST /auth/request-code
 * Body: { email: string }
 */
const requestVerificationCodeHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({
        error: "Email is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call the requestVerificationCode action from email-auth.ts  
    const { api } = await import('./_generated/api');
    const result = await ctx.runAction(api.emailAuth.requestVerificationCode, {
      email: email.toLowerCase().trim(),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Verification code request error:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to send verification code"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * Verify code - public endpoint
 * POST /auth/verify-code
 * Body: { email: string, code: string }
 */
const verifyCodeHttp = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({
        error: "Email is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({
        error: "Code is required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call the verifyCode mutation from email-auth.ts
    const { api } = await import('./_generated/api');
    const result = await ctx.runMutation(api.emailAuth.verifyCode, {
      email: email.toLowerCase().trim(),
      code: code.trim(),
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Code verification error:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to verify code"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// HTTP ROUTER
// ============================================================================

const http = httpRouter();

// Health and status endpoints
http.route({
  path: "/health",
  method: "GET",
  handler: healthCheck,
});

http.route({
  path: "/api/status",
  method: "GET", 
  handler: apiStatus,
});

// Stripe webhook (existing)
http.route({
  path: "/stripe_webhook",
  method: "POST",
  handler: stripeWebhook,
});

// Email auth endpoints (VERIFICATION CODES)
http.route({
  path: "/auth/request-code",
  method: "POST",
  handler: requestVerificationCodeHttp,
});

http.route({
  path: "/auth/verify-code",
  method: "POST",
  handler: verifyCodeHttp,
});

// CORS preflight for auth endpoints
http.route({
  path: "/auth/{path+}",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

// External API routes for dealer websites (existing)
http.route({
  path: "/api/vehicles/{dealershipId}",
  method: "GET",
  handler: getVehicles,
});

http.route({
  path: "/api/vehicle/{dealershipId}/{vehicleId}",
  method: "GET", 
  handler: getVehicle,
});

http.route({
  path: "/api/dealership/{dealershipId}",
  method: "GET",
  handler: getDealership,
});

http.route({
  path: "/api/search/{dealershipId}",
  method: "GET",
  handler: searchVehicles,
});

// CORS preflight for all API routes (existing)
http.route({
  path: "/api/{path+}",
  method: "OPTIONS",
  handler: handleOptions,
});

// Catch-all for undefined API routes (existing)
http.route({
  path: "/api/{path+}",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(JSON.stringify({
      error: "API endpoint not found",
      availableEndpoints: [
        "GET /api/vehicles/{dealershipId}",
        "GET /api/vehicle/{dealershipId}/{vehicleId}",
        "GET /api/dealership/{dealershipId}",
        "GET /api/search/{dealershipId}?q=term"
      ],
      documentation: "Visit /api/status for more information"
    }), {
      status: 404,
      headers: {
        "Content-Type": "application/json"
      },
    });
  }),
});

export default http;