/**
 * Subscription Listener Hook
 * Uses Convex websocket connection to detect when a user's subscription becomes active
 * Automatically updates in real-time when subscription status changes
 * Used after redirecting to Stripe checkout
 */

import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@dealer/convex";
import { invoke } from "@tauri-apps/api/core";

export function useSubscriptionListener(onSubscriptionDetected?: (email: string) => void) {
  const [checkingEmail, setCheckingEmail] = useState<string | null>(null);
  const [hasHandled, setHasHandled] = useState(false);
  const [machineId, setMachineId] = useState<string>("");
  const handledRef = useRef(false);

  // Get pending checkout email from localStorage
  useEffect(() => {
    const pendingEmail = localStorage.getItem("pending_checkout_email");
    if (pendingEmail) {
      setCheckingEmail(pendingEmail);
    }
  }, []);

  // Get machine ID
  useEffect(() => {
    async function getMachineId() {
      try {
        const id = await invoke<string>("get_machine_id");
        setMachineId(id);
      } catch (err) {
        console.error("Failed to get machine ID:", err);
        setMachineId(crypto.randomUUID());
      }
    }
    getMachineId();
  }, []);

  // Watch subscription status by email (websocket-based, automatically updates)
  const subscriptionStatus = useQuery(
    api.api.standaloneAuth.watchSubscriptionStatusByEmail,
    checkingEmail ? { email: checkingEmail } : "skip"
  );

  // Auto-login when subscription becomes active and user has password
  useEffect(() => {
    if (hasHandled || handledRef.current) return;
    if (!checkingEmail || !subscriptionStatus || !machineId) return;
    if (!subscriptionStatus.found) return;

    // Check if subscription just became active
    const isSubscriptionActive = subscriptionStatus.subscriptionActive;
    const hasPassword = subscriptionStatus.hasPassword;

    console.log("📊 [SUBSCRIPTION-LISTENER] Status:", {
      found: subscriptionStatus.found,
      subscriptionActive: isSubscriptionActive,
      hasPassword,
      subscriptionStatus: subscriptionStatus.subscriptionStatus,
    });

    // If subscription is active and user has password, auto-login
    if (isSubscriptionActive && hasPassword && subscriptionStatus.userId) {
      console.log("✅ [SUBSCRIPTION-LISTENER] Subscription active with password - attempting auto-login");
      
      handledRef.current = true;
      setHasHandled(true);

      // We need the password to login, but we don't have it
      // So we'll navigate to login page with email pre-filled
      // Or we could use account setup flow if password is empty
      // Actually, if they have a password, they should login manually
      // But if they just completed checkout, they might not have set password yet
      
      // Clear pending email
      localStorage.removeItem("pending_checkout_email");
      localStorage.removeItem("pending_checkout_session");

      // Navigate to login with email pre-filled
      if (onSubscriptionDetected) {
        console.log("🚀 [SUBSCRIPTION-LISTENER] Triggering callback for login");
        onSubscriptionDetected(checkingEmail);
      }
      return;
    }

    // If subscription is active but no password, navigate to account setup
    if (isSubscriptionActive && !hasPassword) {
      console.log("✅ [SUBSCRIPTION-LISTENER] Subscription active but no password - navigating to account setup");
      
      handledRef.current = true;
      setHasHandled(true);

      // Clear pending email
      localStorage.removeItem("pending_checkout_email");
      localStorage.removeItem("pending_checkout_session");

      // Navigate to account setup
      if (onSubscriptionDetected) {
        console.log("🚀 [SUBSCRIPTION-LISTENER] Triggering callback for account setup");
        onSubscriptionDetected(checkingEmail);
      }
      return;
    }
  }, [subscriptionStatus, checkingEmail, machineId, hasHandled, onSubscriptionDetected]);

  return {
    isWaiting: !!checkingEmail && !hasHandled,
    email: checkingEmail,
    subscriptionStatus: subscriptionStatus?.subscriptionActive ? "active" : subscriptionStatus?.subscriptionStatus || "pending",
    hasPassword: subscriptionStatus?.hasPassword || false,
    found: subscriptionStatus?.found || false,
  };
}