/**
 * Subscription Checkout Component
 * Collects email before redirecting to Stripe checkout
 */

import { useState, useEffect, useId } from "react";
import { useAction } from "convex/react";
import { api } from "@dealer/convex";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, AlertCircle, Loader2, ShoppingCart, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useSubscriptionListener } from "../hooks/useSubscriptionListener";
import { formatPrice, PRICING_CONFIG } from "../lib/pricing";
import { useNavigate } from "@tanstack/react-router";

interface SubscriptionCheckoutProps {
  onSuccess?: () => void;
}

export function SubscriptionCheckout({ onSuccess }: SubscriptionCheckoutProps) {
  const [email, setEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState<"monthly" | "annual" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const emailId = useId();
  const navigate = useNavigate();

  const createCheckout = useAction(api.api.standaloneSubscriptions.createSubscriptionCheckout);
  
  // Handle navigation when subscription is detected
  const handleSubscriptionDetected = async (email: string) => {
    console.log("🎯 Subscription detected for:", email);
    
    try {
      // Check if user already has a password (existing account)
      // If they do, they don't need account setup - just redirect to home
      // The LicenseAuthContext will auto-activate the license
      const { convexQuery } = await import("@/lib/convex");
      const result = await convexQuery(api.api.standaloneAuth.checkAccountSetupNeeded, { email }) as { needsSetup: boolean; user?: { email: string } } | null | undefined;
      
      if (result?.needsSetup) {
        // User needs account setup (no password)
        console.log("🎯 User needs account setup, navigating to account setup page");
        navigate({ 
          to: "/account-setup",
          search: { email }
        });
      } else {
        // User already has password - license will be auto-activated by LicenseAuthContext
        console.log("🎯 User already has account, redirecting to home (license will auto-activate)");
        navigate({ to: "/" });
      }
    } catch (err) {
      console.error("Error checking account setup status:", err);
      // Fallback to account setup
      navigate({ 
        to: "/account-setup",
        search: { email }
      });
    }
  };
  
  // Listen for subscription completion
  const { isWaiting, email: waitingEmail } = useSubscriptionListener(handleSubscriptionDetected);

  // Load pending email on mount
  useEffect(() => {
    const pendingEmail = localStorage.getItem("pending_checkout_email");
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Show waiting state if we're listening for a subscription
  if (isWaiting && waitingEmail) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h2 className="text-2xl font-bold">Waiting for Payment</h2>
              <p className="text-muted-foreground">
                Complete your purchase in the browser, then return here.
              </p>
              <p className="text-sm text-muted-foreground">
                Checking for: {waitingEmail}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("pending_checkout_email");
                  localStorage.removeItem("pending_checkout_session");
                  window.location.reload();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCheckout = async (tier: "monthly" | "annual") => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");
    setSelectedTier(tier);

    try {
      // Store email temporarily to track the checkout
      localStorage.setItem("pending_checkout_email", email.trim().toLowerCase());
      
      // Create Stripe checkout session with the email
      const result = await createCheckout({
        subscriptionTier: tier,
        customerEmail: email.trim().toLowerCase(),
        successUrl: window.location.origin + "/checkout-success",
        cancelUrl: window.location.href,
      });

      // Store session ID to track completion
      if (result.sessionId) {
        localStorage.setItem("pending_checkout_session", result.sessionId);
      }

      // Open Stripe checkout in browser
      if (result.url) {
        await invoke("open_url", { url: result.url });
        
        // Show instructions
        setError(""); // Clear any errors
        alert("Stripe checkout opened in your browser. Complete your payment there, then return to this app.");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Start your subscription to unlock all features
          </p>
        </div>

        {/* Email Input */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Enter Your Email</CardTitle>
            <CardDescription>
              We'll use this email for your account and receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id={emailId}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <Card className="relative border-2 hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Monthly</span>
                <span className="text-2xl font-bold">
                  {formatPrice(PRICING_CONFIG.subscriptions.monthly.price)}
                  <span className="text-sm text-muted-foreground">/mo</span>
                </span>
              </CardTitle>
              <CardDescription>
                {PRICING_CONFIG.subscriptions.monthly.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {PRICING_CONFIG.subscriptions.monthly.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleCheckout("monthly")}
                disabled={loading || !email || !validateEmail(email)}
              >
                {loading && selectedTier === "monthly" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Checkout...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Subscribe Monthly
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Annual Plan */}
          <Card className="relative border-2 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                BEST VALUE
              </span>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Annual</span>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatPrice(PRICING_CONFIG.subscriptions.annual.price)}
                    <span className="text-sm text-muted-foreground">/yr</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-through">
                    {formatPrice(PRICING_CONFIG.subscriptions.monthly.price * 12)}
                  </div>
                  <div className="text-xs text-green-600 font-semibold">
                    Save {formatPrice(PRICING_CONFIG.subscriptions.monthly.price * 12 - PRICING_CONFIG.subscriptions.annual.price, "USD")}
                  </div>
                </div>
              </CardTitle>
              <CardDescription>
                {PRICING_CONFIG.subscriptions.annual.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {PRICING_CONFIG.subscriptions.annual.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleCheckout("annual")}
                disabled={loading || !email || !validateEmail(email)}
              >
                {loading && selectedTier === "annual" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Checkout...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Subscribe Annual
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-2 max-w-2xl mx-auto">
          <p>• Secure payment processing by Stripe</p>
          <p>• Cancel anytime - no questions asked</p>
          <p>• 30-day money-back guarantee</p>
        </div>
      </div>
    </div>
  );
}