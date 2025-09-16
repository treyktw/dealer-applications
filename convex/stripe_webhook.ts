import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

interface StripeSubscription extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

export const handleStripeWebhook = internalAction({
  args: {
    signature: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const event = stripe.webhooks.constructEvent(
        args.payload,
        args.signature,
        webhookSecret
      );

      console.log("Processing webhook event:", event.type, "at", new Date().toISOString());

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log("Checkout session completed:", session.id);

          if (session.mode !== "subscription") {
            console.log("Not a subscription checkout, skipping");
            break;
          }

          const subscriptionId = session.subscription as string;
          const dealershipId = session.metadata?.dealershipId;
          const subscriptionRecordId = session.metadata?.subscriptionRecordId;

          console.log("Checkout completed:", {
            sessionId: session.id,
            subscriptionId,
            dealershipId,
            subscriptionRecordId,
          });

          if (!dealershipId) {
            console.error("No dealership ID in session metadata");
            throw new Error("No dealership ID in session metadata");
          }

          if (!subscriptionId) {
            console.error("No subscription ID in completed session");
            throw new Error("No subscription ID in completed session");
          }

          // Get the subscription from Stripe
          const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as StripeSubscription;

          console.log("Retrieved Stripe subscription:", {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
          });

          // Update the subscription record
          await ctx.runMutation(internal.subscriptions.updateSubscriptionAfterCheckout, {
            dealershipId: dealershipId as Id<"dealerships">,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start * 1000, // Convert to milliseconds
            currentPeriodEnd: subscription.current_period_end * 1000, // Convert to milliseconds
            subscriptionRecordId: subscriptionRecordId as Id<"subscriptions">,
          });

          // Update the subscription metadata in Stripe to ensure future webhooks work
          if (dealershipId && subscriptionRecordId) {
            try {
              await stripe.subscriptions.update(subscriptionId, {
                metadata: {
                  dealershipId,
                  subscriptionRecordId,
                },
              });
              console.log("Updated Stripe subscription metadata");
            } catch (metadataError) {
              console.error("Failed to update Stripe subscription metadata:", metadataError);
              // Don't throw here as the main operation succeeded
            }
          }

          console.log("Checkout session processing completed successfully");
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as StripeSubscription;
          const dealershipId = subscription.metadata?.dealershipId;

          console.log("Subscription updated:", {
            id: subscription.id,
            status: subscription.status,
            dealershipId,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
          });

          if (!dealershipId) {
            console.log("No dealership ID in subscription metadata, attempting to find by Stripe subscription ID");
            
            // Try to find the subscription by Stripe subscription ID
            const allSubscriptions = await ctx.runQuery(internal.subscriptions.findByStripeSubscriptionId, {
              stripeSubscriptionId: subscription.id,
            });
            
            if (allSubscriptions) {
              await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                dealershipId: allSubscriptions.dealershipId,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start * 1000,
                currentPeriodEnd: subscription.current_period_end * 1000,
              });
              // console.log("Updated subscription using found dealership ID");
            } else {
              console.log("Could not find subscription record, skipping update");
            }
            break;
          }

          // Update the subscription record
          await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
            dealershipId: dealershipId as Id<"dealerships">,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start * 1000,
            currentPeriodEnd: subscription.current_period_end * 1000,
          });

          console.log("Subscription update processing completed successfully");
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as StripeSubscription;
          const dealershipId = subscription.metadata?.dealershipId;

          console.log("Subscription deleted:", {
            id: subscription.id,
            dealershipId,
          });

          if (!dealershipId) {
            console.log("No dealership ID in subscription metadata, attempting to find by Stripe subscription ID");
            
            // Try to find the subscription by Stripe subscription ID
            const allSubscriptions = await ctx.runQuery(internal.subscriptions.findByStripeSubscriptionId, {
              stripeSubscriptionId: subscription.id,
            });
            
            if (allSubscriptions) {
              await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                dealershipId: allSubscriptions.dealershipId,
                stripeSubscriptionId: subscription.id,
                status: "cancelled",
                currentPeriodStart: subscription.current_period_start * 1000,
                currentPeriodEnd: subscription.current_period_end * 1000,
              });
              // console.log("Updated subscription status to cancelled using found dealership ID");
            } else {
              console.log("Could not find subscription record for deletion, skipping");
            }
            break;
          }

          // Update the subscription record
          await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
            dealershipId: dealershipId as Id<"dealerships">,
            stripeSubscriptionId: subscription.id,
            status: "cancelled",
            currentPeriodStart: subscription.current_period_start * 1000,
            currentPeriodEnd: subscription.current_period_end * 1000,
          });

          console.log("Subscription deletion processing completed successfully");
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice & { subscription: string };
          if (invoice.subscription) {
            console.log("Payment succeeded for subscription:", invoice.subscription);
            
            // Get the subscription to update status
            try {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as unknown as StripeSubscription;
              const dealershipId = subscription.metadata?.dealershipId;
              
              if (dealershipId) {
                await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                  dealershipId: dealershipId as Id<"dealerships">,
                  stripeSubscriptionId: subscription.id,
                  status: subscription.status,
                  currentPeriodStart: subscription.current_period_start * 1000,
                  currentPeriodEnd: subscription.current_period_end * 1000,
                });
                console.log("Updated subscription after successful payment");
              }
            } catch (error) {
              console.error("Error handling payment success:", error);
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice & { subscription: string };
          if (invoice.subscription) {
            console.log("Payment failed for subscription:", invoice.subscription);
            
            // Get the subscription to update status
            try {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as unknown as StripeSubscription;
              const dealershipId = subscription.metadata?.dealershipId;
              
              if (dealershipId) {
                await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                  dealershipId: dealershipId as Id<"dealerships">,
                  stripeSubscriptionId: subscription.id,
                  status: subscription.status, // This might be 'past_due' or similar
                  currentPeriodStart: subscription.current_period_start * 1000,
                  currentPeriodEnd: subscription.current_period_end * 1000,
                });
                console.log("Updated subscription after failed payment");
              }
            } catch (error) {
              console.error("Error handling payment failure:", error);
            }
          }
          break;
        }

        default:
          console.log("Unhandled webhook event type:", event.type);
      }

      return { success: true };
    } catch (error) {
      console.error("Error processing webhook:", error);
      throw error;
    }
  },
});