/**
 * Stripe Webhook Handler
 * Handles subscription events for standalone users
 */

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Stripe webhook endpoint
 * URL: https://your-convex-url.convex.cloud/stripe/webhook
 */
export const webhook = httpAction(async (ctx, request) => {
  try {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature);
    if (!isValid) {
      console.error("Invalid Stripe webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log(`Stripe webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(ctx, event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(ctx, event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(ctx, event);
        break;

      case "invoice.paid":
        await handleInvoicePaid(ctx, event);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(ctx, event);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(ctx, event);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
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
 * Handle subscription created
 */
async function handleSubscriptionCreated(ctx: any, event: any) {
  const subscription = event.data.object;

  console.log(`Subscription created: ${subscription.id}`);

  // Find user by Stripe customer ID
  const user = await ctx.runQuery(internal.standaloneUsers.findByStripeCustomer, {
    stripeCustomerId: subscription.customer,
  });

  if (!user) {
    console.error(`User not found for customer: ${subscription.customer}`);
    return;
  }

  // Create subscription record
  await ctx.runMutation(internal.standaloneSubscriptions.create, {
    userId: user._id,
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    stripeProductId: subscription.items.data[0].price.product,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    planName: subscription.items.data[0].price.recurring?.interval === "year" ? "annual" : "monthly",
    amount: subscription.items.data[0].price.unit_amount || 0,
    currency: subscription.items.data[0].price.currency,
    interval: subscription.items.data[0].price.recurring?.interval || "month",
    trialStart: subscription.trial_start ? subscription.trial_start * 1000 : undefined,
    trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
  });

  // Update user subscription status
  await ctx.runMutation(internal.standaloneUsers.updateSubscriptionStatus, {
    userId: user._id,
    status: subscription.status === "trialing" ? "trial" : "active",
  });

  console.log(`Subscription created for user: ${user._id}`);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(ctx: any, event: any) {
  const subscription = event.data.object;

  console.log(`Subscription updated: ${subscription.id}`);

  await ctx.runMutation(internal.standaloneSubscriptions.update, {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
  });

  // Update user status
  const sub = await ctx.runQuery(internal.standaloneSubscriptions.findByStripeId, {
    stripeSubscriptionId: subscription.id,
  });

  if (sub) {
    let userStatus: string;
    if (subscription.status === "active") {
      userStatus = "active";
    } else if (subscription.status === "past_due") {
      userStatus = "past_due";
    } else if (subscription.status === "canceled") {
      userStatus = "cancelled";
    } else {
      userStatus = subscription.status;
    }

    await ctx.runMutation(internal.standaloneUsers.updateSubscriptionStatus, {
      userId: sub.userId,
      status: userStatus,
    });
  }

  console.log(`Subscription updated: ${subscription.id}`);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(ctx: any, event: any) {
  const subscription = event.data.object;

  console.log(`Subscription deleted: ${subscription.id}`);

  await ctx.runMutation(internal.standaloneSubscriptions.update, {
    stripeSubscriptionId: subscription.id,
    status: "cancelled",
    cancelledAt: Date.now(),
  });

  // Update user status
  const sub = await ctx.runQuery(internal.standaloneSubscriptions.findByStripeId, {
    stripeSubscriptionId: subscription.id,
  });

  if (sub) {
    await ctx.runMutation(internal.standaloneUsers.updateSubscriptionStatus, {
      userId: sub.userId,
      status: "cancelled",
    });
  }

  console.log(`Subscription cancelled for: ${subscription.id}`);
}

/**
 * Handle invoice paid
 */
async function handleInvoicePaid(ctx: any, event: any) {
  const invoice = event.data.object;

  console.log(`Invoice paid: ${invoice.id}`);

  // Ensure user subscription is active
  const sub = await ctx.runQuery(internal.standaloneSubscriptions.findByStripeId, {
    stripeSubscriptionId: invoice.subscription,
  });

  if (sub && sub.status !== "active") {
    await ctx.runMutation(internal.standaloneSubscriptions.update, {
      stripeSubscriptionId: invoice.subscription,
      status: "active",
    });

    await ctx.runMutation(internal.standaloneUsers.updateSubscriptionStatus, {
      userId: sub.userId,
      status: "active",
    });
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(ctx: any, event: any) {
  const invoice = event.data.object;

  console.log(`Invoice payment failed: ${invoice.id}`);

  const sub = await ctx.runQuery(internal.standaloneSubscriptions.findByStripeId, {
    stripeSubscriptionId: invoice.subscription,
  });

  if (sub) {
    await ctx.runMutation(internal.standaloneSubscriptions.update, {
      stripeSubscriptionId: invoice.subscription,
      status: "past_due",
    });

    await ctx.runMutation(internal.standaloneUsers.updateSubscriptionStatus, {
      userId: sub.userId,
      status: "past_due",
    });

    // TODO: Send payment failed email to user
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(ctx: any, event: any) {
  const session = event.data.object;

  console.log(`Checkout completed: ${session.id}`);

  // This is where you'd create the user if they don't exist yet
  // For now, we assume user is created before checkout
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
    console.warn("STRIPE_WEBHOOK_SECRET not set");
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  // TODO: Implement proper Stripe signature verification
  // This requires the Stripe SDK or crypto operations
  // For now, just check if signature exists

  return true; // Placeholder
}
