// convex/http.ts - Updated with External API Routes
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Stripe webhook handler (existing)
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
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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
  } catch (err: any) {
    console.error("Webhook processing error:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }
});

// Health check endpoint
const healthCheck = httpAction(async (ctx, request) => {
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

// API status endpoint
const apiStatus = httpAction(async (ctx, request) => {
  return new Response(JSON.stringify({
    message: "Dealership API is running",
    endpoints: [
      "GET /api/vehicles/{dealershipId}",
      "GET /api/vehicle/{dealershipId}/{vehicleId}", 
      "GET /api/dealership/{dealershipId}",
      "GET /api/search/{dealershipId}?q=search_term"
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

// Create and export the HTTP router
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
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

// External API routes for dealer websites
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

// CORS preflight for all API routes
http.route({
  path: "/api/{path+}",
  method: "OPTIONS",
  handler: handleOptions,
});

// Catch-all for undefined API routes
http.route({
  path: "/api/{path+}",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
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