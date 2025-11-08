/**
 * Unified Auth Hook
 * Works with both LicenseAuth and Dealership Auth contexts
 * Automatically detects which one is available
 */

import { useContext } from "react";
import { getCachedAppMode } from "@/lib/mode-detection";
import { AuthContext } from "./AuthContext";
import { LicenseAuthContext } from "./LicenseAuthContext";

interface UnifiedAuth {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    dealershipId?: string;
    licenseKey?: string;
    tier?: "single" | "team" | "enterprise";
  } | null;
  session: {
    token?: string;
    licenseKey?: string;
    machineId?: string;
    expiresAt?: number;
  } | null;
  logout?: () => Promise<void>;
}

export function useUnifiedAuth(): UnifiedAuth {
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";

  // Use useContext directly - it returns undefined if not in provider (doesn't throw)
  // This allows us to check which provider is available without conditional hook calls
  // Both hooks are called unconditionally, which satisfies React's rules
  const licenseAuthContext = useContext(LicenseAuthContext);
  const dealershipAuthContext = useContext(AuthContext);
  
  // Determine which auth to use based on what's available and mode
  const licenseAuth = licenseAuthContext;
  const dealershipAuth = dealershipAuthContext;

  // Use the appropriate auth based on mode
  if (isStandalone && licenseAuth) {
    return {
      isLoading: licenseAuth.isLoading,
      isAuthenticated: licenseAuth.isAuthenticated,
      user: licenseAuth.user ? {
        id: licenseAuth.user.id,
        email: licenseAuth.user.email || "",
        name: licenseAuth.user.name || licenseAuth.user.email,
        licenseKey: licenseAuth.user.licenseKey,
        tier: licenseAuth.user.tier,
        dealershipId: licenseAuth.user.dealershipId,
      } : null,
      session: licenseAuth.session ? {
        licenseKey: licenseAuth.session.licenseKey,
        machineId: licenseAuth.session.machineId,
        expiresAt: licenseAuth.session.expiresAt,
      } : null,
      logout: licenseAuth.logout,
    };
  }

  // Default to dealership auth
  if (dealershipAuth) {
    return {
      isLoading: dealershipAuth.isLoading,
      isAuthenticated: dealershipAuth.isAuthenticated,
      user: dealershipAuth.user ? {
        id: dealershipAuth.user.id,
        email: dealershipAuth.user.email,
        name: dealershipAuth.user.name,
        role: dealershipAuth.user.role,
        dealershipId: dealershipAuth.user.dealershipId,
      } : null,
      session: dealershipAuth.session ? {
        token: dealershipAuth.session.token,
        expiresAt: dealershipAuth.session.expiresAt,
      } : null,
      logout: dealershipAuth.logout,
    };
  }

  // Fallback if neither is available
  return {
    isLoading: true,
    isAuthenticated: false,
    user: null,
    session: null,
    logout: undefined,
  };
}

