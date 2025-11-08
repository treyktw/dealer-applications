/**
 * License-Based Authentication Context
 * Alternative auth system that uses license keys instead of Clerk
 * For standalone desktop app operation
 */

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexMutation, convexQuery, setConvexAuth } from "@/lib/convex";
import { api } from "@dealer/convex";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

// Types
interface LicenseUser {
  id: string;
  email: string;
  licenseKey: string;
  tier: "single" | "team" | "enterprise";
  dealershipId?: string;
  maxActivations: number;
  name?: string;
  businessName?: string;
}

interface LicenseSession {
  licenseKey: string;
  machineId: string;
  expiresAt?: number;
  isActive: boolean;
}

interface LicenseAuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: LicenseUser | null;
  session: LicenseSession | null;

  activateLicense: (licenseKey: string) => Promise<void>;
  deactivateLicense: () => Promise<void>;
  validateLicense: () => Promise<boolean>;
  checkLicenseStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const LicenseAuthContext = createContext<LicenseAuthContextType | undefined>(
  undefined
);

export function LicenseAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [machineId, setMachineId] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");

  // Load machine info on mount
  useEffect(() => {
    async function loadMachineInfo() {
      try {
        const id = await invoke<string>("get_machine_id");
        const plat = await invoke<string>("get_platform");
        const version = await invoke<string>("get_app_version");

        setMachineId(id);
        setPlatform(plat);
        setAppVersion(version);
      } catch (error) {
        console.error("Failed to get machine info:", error);
        // Fallback
        setMachineId(crypto.randomUUID());
        setPlatform(navigator.platform);
        setAppVersion("0.1.0");
      }
    }

    loadMachineInfo();
  }, []);

  // Load stored session token first (preferred method)
  const { data: storedSessionToken, isLoading: sessionTokenLoading } = useQuery({
    queryKey: ["stored-session-token"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("standalone_session_token");
        console.log("🔍 Checking for stored session token:", token ? "Found" : "Not found");
        return token;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    refetchOnMount: true,
  });

  // Validate session token if available
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["standalone-session", storedSessionToken],
    queryFn: async () => {
      if (!storedSessionToken) {
        return null;
      }

      try {
        console.log("🔍 Validating standalone session token...");
        const result = await convexQuery(api.api.standaloneAuth.validateStandaloneSession, {
          token: storedSessionToken,
        });

        if (result) {
          console.log("✅ Standalone session validated for user:", result.user.email);
          setConvexAuth(storedSessionToken);
          return result;
        } else {
          console.log("❌ Standalone session validation failed");
          // Clear invalid session
          localStorage.removeItem("standalone_session_token");
          localStorage.removeItem("standalone_user_id");
          return null;
        }
      } catch (error) {
        console.error("Session validation error:", error);
        localStorage.removeItem("standalone_session_token");
        localStorage.removeItem("standalone_user_id");
        return null;
      }
    },
    enabled: !!storedSessionToken && !sessionTokenLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // After login, check if user has a license and auto-activate it
  const { data: userLicenseCheck } = useQuery({
    queryKey: ["user-license-check", sessionData?.user?.email],
    queryFn: async () => {
      if (!sessionData?.user?.email) {
        return null;
      }

      try {
        const result = await convexQuery(api.api.standaloneAuth.checkUserHasLicense, {
          email: sessionData.user.email,
        });
        return result;
      } catch (error) {
        console.error("License check error:", error);
        return null;
      }
    },
    enabled: !!sessionData?.user?.email && !!machineId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Activate license mutation (used for both auto and manual activation)
  const activateLicenseMutation = useMutation({
    mutationFn: async ({ licenseKey }: { licenseKey: string }) => {
      if (!machineId || !platform || !appVersion) {
        throw new Error("Machine info not loaded");
      }

      const hostname = await invoke<string>("get_hostname").catch(() => "Unknown");

      const result = await convexMutation(api.api.licenses.activateLicense, {
        licenseKey,
        machineId,
        platform,
        appVersion,
        hostname,
      });
      
      // Store license key locally
      if (result.success) {
        await invoke("store_license", { licenseKey });
        
        // If activation returned a session token, update it
        if (result.sessionToken && result.userId) {
          localStorage.setItem("standalone_session_token", result.sessionToken);
          localStorage.setItem("standalone_user_id", result.userId);
          queryClient.setQueryData(["stored-session-token"], result.sessionToken);
          queryClient.invalidateQueries({ queryKey: ["standalone-session"] });
        }
      }

      return result;
    },
    onError: (error) => {
      console.error("Activate license error:", error);
      toast.error(`Activation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
  });

  // Track if we've already attempted auto-activation to prevent loops (using ref to persist across renders)
  const hasAttemptedAutoActivationRef = useRef<string | null>(null);
  const isActivatingRef = useRef(false);

  // Auto-activate license when detected (only once per license key)
  useEffect(() => {
    if (!userLicenseCheck?.hasLicense || !userLicenseCheck.licenseKey) {
      return;
    }

    if (!machineId) {
      return; // Wait for machine ID
    }

    const licenseKey = userLicenseCheck.licenseKey;

    // Prevent re-activation if we've already attempted this license key
    if (hasAttemptedAutoActivationRef.current === licenseKey) {
      return;
    }

    // Prevent re-activation if already in progress
    if (isActivatingRef.current) {
      return;
    }

    // Mark that we're attempting activation for this license key
    hasAttemptedAutoActivationRef.current = licenseKey;
    isActivatingRef.current = true;

    // Check if license is already stored locally
    invoke<string>("get_stored_license")
      .then((storedKey) => {
        if (storedKey === licenseKey) {
          console.log("✅ License already stored locally");
          isActivatingRef.current = false;
          return;
        }

        // Auto-activate the license
        console.log("🔑 Auto-activating license for logged-in user:", licenseKey.substring(0, 12) + "...");
        activateLicenseMutation.mutate(
          { licenseKey },
          {
            onSuccess: () => {
              console.log("✅ Auto-activation successful");
              isActivatingRef.current = false;
            },
            onError: () => {
              // Reset on error so user can retry
              hasAttemptedAutoActivationRef.current = null;
              isActivatingRef.current = false;
            },
          }
        );
      })
      .catch(() => {
        // No stored license, proceed with activation
        console.log("🔑 Auto-activating license for logged-in user:", licenseKey.substring(0, 12) + "...");
        activateLicenseMutation.mutate(
          { licenseKey },
          {
            onSuccess: () => {
              console.log("✅ Auto-activation successful");
              isActivatingRef.current = false;
            },
            onError: () => {
              // Reset on error so user can retry
              hasAttemptedAutoActivationRef.current = null;
              isActivatingRef.current = false;
            },
          }
        );
      });
  }, [userLicenseCheck?.hasLicense, userLicenseCheck?.licenseKey, machineId, activateLicenseMutation.mutate]);

  // Use session data only (no license fallback)
  const authData: {
    user: LicenseUser;
    session: LicenseSession;
  } | null = sessionData
    ? {
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email || "",
          licenseKey: sessionData.user.licenseKey || "",
          tier: "single" as const,
          maxActivations: 1,
          dealershipId: undefined,
          name: sessionData.user.name || sessionData.user.email || "",
          businessName: sessionData.user.businessName,
        },
        session: {
          licenseKey: sessionData.session.licenseKey,
          machineId: sessionData.session.machineId,
          expiresAt: sessionData.session.expiresAt,
          isActive: true,
        },
      }
    : null;

  // Deactivate license mutation
  const deactivateLicenseMutation = useMutation({
    mutationFn: async () => {
      const storedLicenseKey = await invoke<string>("get_stored_license").catch(() => null);
      if (!storedLicenseKey || !machineId) {
        throw new Error("No active license");
      }

      return await convexMutation(api.api.licenses.deactivateLicense, {
        licenseKey: storedLicenseKey,
        machineId,
      });
    },
    onSuccess: async () => {
      // Remove stored license
      try {
        await invoke("remove_stored_license");
      } catch (error) {
        console.error("Failed to remove license:", error);
      }

      // Clear session
      localStorage.removeItem("standalone_session_token");
      localStorage.removeItem("standalone_user_id");
      queryClient.setQueryData(["stored-session-token"], null);
      queryClient.setQueryData(["stored-license"], null);
      setConvexAuth(null);
      queryClient.invalidateQueries({ queryKey: ["standalone-session"] });

      toast.success("License deactivated", {
        description: "You can now activate on a different device.",
      });
    },
  });

  // Validate license (manual check)
  const validateLicense = useCallback(async (): Promise<boolean> => {
    if (!machineId) return false;

    try {
      const storedLicenseKey = await invoke<string>("get_stored_license").catch(() => null);
      if (!storedLicenseKey) return false;

      const result = await convexQuery(api.api.licenses.validateLicense, {
        licenseKey: storedLicenseKey,
        machineId,
      });

      return result.valid;
    } catch (error) {
      console.error("Validation error:", error);
      return false;
    }
  }, [machineId]);

  // Check license status (refresh)
  const checkLicenseStatus = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["standalone-session"] });
    queryClient.invalidateQueries({ queryKey: ["user-license-check"] });
  }, [queryClient]);

  // Periodic session check (every 5 minutes)
  useEffect(() => {
    if (!authData?.session?.isActive) return;

    const interval = setInterval(() => {
      checkLicenseStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [authData?.session?.isActive, checkLicenseStatus]);

  const logout = useCallback(async () => {
    console.log("🚪 [LOGOUT] Starting logout process...");
    
    // Check what exists before logout
    const sessionTokenBefore = localStorage.getItem("standalone_session_token");
    const userIdBefore = localStorage.getItem("standalone_user_id");
    const storedLicenseBefore = await invoke<string>("get_stored_license").catch(() => null);
    
    const currentIsAuthenticated = !!authData?.session?.isActive;
    
    console.log("🔍 [LOGOUT] Before logout:", {
      hasSessionToken: !!sessionTokenBefore,
      sessionTokenLength: sessionTokenBefore?.length || 0,
      hasUserId: !!userIdBefore,
      userId: userIdBefore,
      hasStoredLicense: !!storedLicenseBefore,
      licenseKey: storedLicenseBefore ? storedLicenseBefore.substring(0, 12) + "..." : null,
      isAuthenticated: currentIsAuthenticated,
      hasUser: !!authData?.user,
      userEmail: authData?.user?.email,
    });

    try {
      // Remove session tokens
      console.log("🗑️ [LOGOUT] Removing session tokens from localStorage...");
      localStorage.removeItem("standalone_session_token");
      localStorage.removeItem("standalone_user_id");
      
      // Verify removal
      const sessionTokenAfter = localStorage.getItem("standalone_session_token");
      const userIdAfter = localStorage.getItem("standalone_user_id");
      
      console.log("✅ [LOGOUT] Token removal verification:", {
        sessionTokenRemoved: !sessionTokenAfter,
        userIdRemoved: !userIdAfter,
        sessionTokenStillExists: !!sessionTokenAfter,
        userIdStillExists: !!userIdAfter,
      });
      
      if (sessionTokenAfter || userIdAfter) {
        console.error("❌ [LOGOUT] WARNING: Tokens still exist after removal attempt!");
      }
    } catch (error) {
      console.error("❌ [LOGOUT] Failed to clear session tokens:", error);
    }

    // Reset activation refs
    console.log("🔄 [LOGOUT] Resetting activation refs...");
    hasAttemptedAutoActivationRef.current = null;
    isActivatingRef.current = false;

    // Clear Convex auth
    console.log("🔐 [LOGOUT] Clearing Convex auth...");
    setConvexAuth(null);

    // Clear query cache
    console.log("🗄️ [LOGOUT] Clearing query cache...");
    queryClient.setQueryData(["stored-session-token"], null);
    
    // Invalidate queries
    console.log("🔄 [LOGOUT] Invalidating queries...");
    await queryClient.invalidateQueries({ queryKey: ["standalone-session"] });
    await queryClient.invalidateQueries({ queryKey: ["user-license-check"] });
    await queryClient.invalidateQueries({ queryKey: ["license-validation"] });
    
    // Verify final state
    const sessionTokenFinal = localStorage.getItem("standalone_session_token");
    const userIdFinal = localStorage.getItem("standalone_user_id");
    const cachedToken = queryClient.getQueryData(["stored-session-token"]);
    
    console.log("✅ [LOGOUT] Final state verification:", {
      localStorageSessionToken: !!sessionTokenFinal,
      localStorageUserId: !!userIdFinal,
      queryCacheToken: !!cachedToken,
      allCleared: !sessionTokenFinal && !userIdFinal && !cachedToken,
    });

    if (sessionTokenFinal || userIdFinal || cachedToken) {
      console.error("❌ [LOGOUT] WARNING: Some data still exists after logout!");
    } else {
      console.log("✅ [LOGOUT] All session data successfully cleared");
    }

    toast.success("Signed out");
    console.log("🎉 [LOGOUT] Logout process completed");
  }, [queryClient, authData]);

  const isLoading = sessionTokenLoading || sessionLoading || !machineId;
  const isAuthenticated = !!authData?.session?.isActive;

  const value: LicenseAuthContextType = {
    isLoading,
    isAuthenticated,
    user: authData?.user || null,
    session: authData?.session || null,

    activateLicense: async (licenseKey: string) => {
      await activateLicenseMutation.mutateAsync({ licenseKey });
    },
    deactivateLicense: async () => {
      await deactivateLicenseMutation.mutateAsync();
    },
    validateLicense,
    checkLicenseStatus,
    logout,
  };

  return (
    <LicenseAuthContext.Provider value={value}>
      {children}
    </LicenseAuthContext.Provider>
  );
}

export function useLicenseAuth() {
  const context = useContext(LicenseAuthContext);
  if (context === undefined) {
    throw new Error("useLicenseAuth must be used within a LicenseAuthProvider");
  }
  return context;
}
