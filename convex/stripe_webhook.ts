import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import type Stripe from "stripe";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { stripe, STRIPE_WEBHOOK_SECRET } from "./lib/stripe";
// import { mapStripeStatus } from "./lib/stripe/status";
// import { parsePriceId } from "./lib/stripe/products";

if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const webhookSecret = STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = internalAction({
  args: {
    signature: v.string(),
    payload: v.string(),
  },
  handler: async (
    ctx: ActionCtx,
    args: { signature: string; payload: string }
  ): Promise<{ success: boolean; duplicate?: boolean; processedAt?: string }> => {
    try {
      const event = await stripe.webhooks.constructEventAsync(
        args.payload,
        args.signature,
        webhookSecret
      );

      console.log("Processing webhook event:", event.type, "at", new Date().toISOString());

      // IDEMPOTENCY CHECK: Prevent duplicate processing
      const alreadyProcessed = (await ctx.runQuery(
        internal.webhooks.checkProcessed,
        {
        eventId: event.id,
        source: "stripe",
        }
      )) as unknown as { processed: boolean; event?: { processedAt?: number | string } | null };

      if (alreadyProcessed.processed) {
        console.log(`⚠️ Event ${event.id} already processed, skipping duplicate`);
        return {
          success: true,
          duplicate: true,
          processedAt: alreadyProcessed.event?.processedAt ? String(alreadyProcessed.event.processedAt) : undefined,
        };
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log("Checkout session completed:", session.id);

          // Handle document pack purchases
          if (session.metadata?.type === "document_pack_purchase") {
            console.log("Document pack purchase detected");

            const packId = session.metadata.packId;
            const dealershipId = session.metadata.dealershipId;
            const userId = session.metadata.userId;

            if (!packId || !dealershipId || !userId) {
              console.error("Missing metadata for document pack purchase");
              throw new Error("Missing metadata for document pack purchase");
            }

            // Record the purchase
            await ctx.runMutation(internal.dealerDocumentPackPurchases.recordPurchase, {
              dealershipId: dealershipId as Id<"dealerships">,
              packTemplateId: packId as Id<"document_pack_templates">,
              userId: userId as Id<"users">,
              amountPaid: session.amount_total || 0,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string | undefined,
              stripeCustomerId: session.customer as string | undefined,
            });

            console.log("Document pack purchase recorded successfully");
            break;
          }

          // Handle subscription checkouts
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
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

          console.log("Retrieved Stripe subscription:", {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            currentPeriodStart: subscription.start_date,
          });


          // Update the subscription record
          await ctx.runMutation(internal.subscriptions.updateSubscriptionAfterCheckout, {
            dealershipId: dealershipId as Id<"dealerships">,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            currentPeriodStart: subscription.start_date * 1000, // Convert to milliseconds
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

        case "customer.subscription.created": {
          const subscription = event.data.object as Stripe.Subscription;
          const dealershipId = subscription.metadata?.dealershipId;

          console.log("Subscription created:", {
            id: subscription.id,
            status: subscription.status,
            dealershipId,
            currentPeriodStart: subscription.start_date,
            hasMetadata: !!subscription.metadata,
          });

          if (!subscription.days_until_due) {
            console.error("No days until due in subscription");

          }

          if (!dealershipId) {
            console.log("No dealership ID in subscription metadata, attempting to find by Stripe subscription ID");
            
            // Try to find the subscription by Stripe subscription ID
            const existingSubscription = await ctx.runQuery(internal.subscriptions.findByStripeSubscriptionId, {
              stripeSubscriptionId: subscription.id,
            });
            
            if (existingSubscription) {
              await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                dealershipId: existingSubscription.dealershipId,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                currentPeriodStart: subscription.start_date * 1000,
              });
              console.log("Updated existing subscription record after creation");
            } else {
              console.log("No existing subscription record found, skipping update");
            }
            break;
          }

          // Update the subscription record
          await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
            dealershipId: dealershipId as Id<"dealerships">,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.start_date * 1000,
          });

          console.log("Subscription creation processing completed successfully");
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const dealershipId = subscription.metadata?.dealershipId;

          console.log("Subscription updated:", {
            id: subscription.id,
            status: subscription.status,
            dealershipId,
            currentPeriodStart: subscription.start_date,
            hasMetadata: !!subscription.metadata,
          });

          if (!subscription.days_until_due) {
            console.error("No days until due in subscription");

          }

          if (!dealershipId) {
            console.log("No dealership ID in subscription metadata, attempting to find by Stripe subscription ID");
            
            // Try to find the subscription by Stripe subscription ID
            const existingSubscription = await ctx.runQuery(internal.subscriptions.findByStripeSubscriptionId, {
              stripeSubscriptionId: subscription.id,
            });
            
            if (existingSubscription) {
              await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                dealershipId: existingSubscription.dealershipId,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                currentPeriodStart: subscription.start_date * 1000,
              });
              console.log("Updated subscription using found dealership ID");
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
            currentPeriodStart: subscription.start_date * 1000,
          });

          console.log("Subscription update processing completed successfully");
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const dealershipId = subscription.metadata?.dealershipId;

          console.log("Subscription deleted:", {
            id: subscription.id,
            dealershipId,
          });

          if (!subscription.days_until_due) {
            console.error("No days until due in subscription");

          }

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
                currentPeriodStart: subscription.start_date * 1000,
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
            currentPeriodStart: subscription.start_date * 1000,
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
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as Stripe.Subscription;
              const dealershipId = subscription.metadata?.dealershipId;
              
              console.log("Invoice payment succeeded - subscription details:", {
                id: subscription.id,
                status: subscription.status,
                dealershipId,
                hasMetadata: !!subscription.metadata,
              });

              if (!subscription.days_until_due) {
                console.error("No days until due in subscription");
    
              }

              if (dealershipId) {
                await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                  dealershipId: dealershipId as Id<"dealerships">,
                  stripeSubscriptionId: subscription.id,
                  status: subscription.status,
                  currentPeriodStart: subscription.start_date * 1000,
                });
                console.log("Updated subscription after successful payment");
              } else {
                console.log("No dealership ID in subscription metadata, attempting to find by Stripe subscription ID");
                
                // Try to find the subscription by Stripe subscription ID
                const existingSubscription = await ctx.runQuery(internal.subscriptions.findByStripeSubscriptionId, {
                  stripeSubscriptionId: subscription.id,
                });
                
                if (existingSubscription) {
                  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                    dealershipId: existingSubscription.dealershipId,
                    stripeSubscriptionId: subscription.id,
                    status: subscription.status,
                    currentPeriodStart: subscription.start_date * 1000,
                  });
                  console.log("Updated subscription using found dealership ID");
                } else {
                  console.log("Could not find subscription record, skipping update");
                }
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
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as Stripe.Subscription;
              const dealershipId = subscription.metadata?.dealershipId;
              
              if (!subscription.days_until_due) {
                console.error("No days until due in subscription");
    
              }

              if (dealershipId) {
                await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
                  dealershipId: dealershipId as Id<"dealerships">,
                  stripeSubscriptionId: subscription.id,
                  status: subscription.status, // This might be 'past_due' or similar
                  currentPeriodStart: subscription.start_date * 1000,
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

      // Mark event as successfully processed
      await ctx.runMutation(internal.webhooks.markProcessed, {
        eventId: event.id,
        type: event.type,
        source: "stripe",
        success: true,
        metadata: {
          processedAt: new Date().toISOString(),
        },
      });

      console.log(`✅ Successfully processed event ${event.id}`);

      return { success: true };
    } catch (error) {
      console.error("Error processing webhook:", error);

      // Try to mark event as failed (best effort)
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const err = error as { event?: { id?: string; type?: string } };
        await ctx.runMutation(internal.webhooks.markProcessed, {
          eventId: err.event?.id ?? "unknown",
          type: err.event?.type ?? "unknown",
          source: "stripe",
          success: false,
          error: errorMessage,
        });
      } catch (markError) {
        console.error("Failed to mark webhook as failed:", markError);
      }

      throw error;
    }
  },
});