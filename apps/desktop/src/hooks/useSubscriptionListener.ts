/**
 * Subscription Listener Hook
 * Polls Convex to detect when a user's subscription becomes active
 * Used after redirecting to Stripe checkout
 */

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@dealer/convex";

export function useSubscriptionListener(onSubscriptionDetected?: (email: string) => void) {
  const [checkingEmail, setCheckingEmail] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Get pending checkout email from localStorage
  useEffect(() => {
    const pendingEmail = localStorage.getItem("pending_checkout_email");
    if (pendingEmail) {
      setCheckingEmail(pendingEmail);
    }
  }, []);

  // Check if account needs setup (subscription complete but no password)
  // Convex queries are reactive - they automatically update when data changes
  const accountSetupCheck = useQuery(
    api.api.standaloneAuth.checkAccountSetupNeeded,
    checkingEmail ? { email: checkingEmail } : "skip"
  );

  // When we detect the user needs account setup, trigger navigation callback
  useEffect(() => {
    if (hasNavigated) return; // Prevent multiple navigations
    
    console.log("📊 Account setup check result:", accountSetupCheck);
    
    if (accountSetupCheck?.needsSetup && accountSetupCheck.user) {
      console.log("✅ Subscription detected! User needs account setup:", accountSetupCheck.user);
      
      // Clear pending email
      localStorage.removeItem("pending_checkout_email");
      localStorage.removeItem("pending_checkout_session");
      
      // Mark as navigated to prevent duplicate calls
      setHasNavigated(true);
      
      // Call navigation callback if provided
      if (onSubscriptionDetected) {
        console.log("🚀 Triggering navigation callback...");
        onSubscriptionDetected(accountSetupCheck.user.email);
      } else {
        // Fallback to window.location if no callback provided
        console.log("🚀 Navigating to account setup page (fallback)...");
        window.location.href = `/account-setup?email=${encodeURIComponent(accountSetupCheck.user.email)}`;
      }
    }
  }, [accountSetupCheck, hasNavigated, onSubscriptionDetected]);

  return {
    isWaiting: !!checkingEmail && !hasNavigated,
    email: checkingEmail,
    accountSetupNeeded: accountSetupCheck?.needsSetup || false,
  };
}