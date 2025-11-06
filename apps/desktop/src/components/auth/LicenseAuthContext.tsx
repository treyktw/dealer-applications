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
}

const LicenseAuthContext = createContext<LicenseAuthContextType | undefined>(
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

  // Load stored license key
  const { data: storedLicenseKey, isLoading: keyLoading } = useQuery({
    queryKey: ["stored-license"],
    queryFn: async () => {
      try {
        const key = await invoke<string>("get_stored_license");
        return key;
      } catch (error) {
        return null;
      }
    },
    staleTime: Infinity,
    refetchOnMount: true,
  });

  // Validate license with Convex
  const { data: licenseData, isLoading: licenseLoading } = useQuery({
    queryKey: ["license-validation", storedLicenseKey, machineId],
    queryFn: async () => {
      if (!storedLicenseKey || !machineId) {
        return null;
      }

      try {
        const result = await convexQuery(api.api.licenses.validateLicense, {
          licenseKey: storedLicenseKey,
          machineId,
        });

        if (result.valid) {
          // Set auth for Convex queries
          setConvexAuth(storedLicenseKey);

          // Get full license info
          const licenseInfo = await convexQuery(api.api.licenses.getLicenseInfo, {
            licenseKey: storedLicenseKey,
          });

          return {
            user: {
              id: storedLicenseKey,
              email: "", // Will be filled from license info if available
              licenseKey: storedLicenseKey,
              tier: licenseInfo?.tier || "single",
              maxActivations: licenseInfo?.maxActivations || 1,
            },
            session: {
              licenseKey: storedLicenseKey,
              machineId,
              expiresAt: licenseInfo?.expiresAt,
              isActive: true,
            },
          };
        } else {
          // Invalid license - clear stored key
          await invoke("remove_stored_license");
          queryClient.setQueryData(["stored-license"], null);
          setConvexAuth(null);
          return null;
        }
      } catch (error) {
        console.error("License validation error:", error);
        return null;
      }
    },
    enabled: !!storedLicenseKey && !!machineId && !keyLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Activate license mutation
  const activateLicenseMutation = useMutation({
    mutationFn: async ({ licenseKey }: { licenseKey: string }) => {
      if (!machineId || !platform || !appVersion) {
        throw new Error("Machine info not loaded");
      }

      const hostname = await invoke<string>("get_hostname").catch(() => "Unknown");

      // Activate via Convex
      const result = await convexMutation(api.api.licenses.activateLicense, {
        licenseKey,
        machineId,
        platform,
        appVersion,
        hostname,
      });

      return { licenseKey, result };
    },
    onSuccess: async ({ licenseKey }) => {
      // Store license key securely
      try {
        await invoke("store_license", { licenseKey });
      } catch (error) {
        console.error("Failed to store license:", error);
      }

      // Update query cache
      queryClient.setQueryData(["stored-license"], licenseKey);
      queryClient.invalidateQueries({ queryKey: ["license-validation"] });

      toast.success("License activated!", {
        description: "Your license has been activated successfully.",
      });
    },
    onError: (error: Error) => {
      toast.error("Activation failed", {
        description: error.message || "Please check your license key and try again.",
      });
    },
  });

  // Deactivate license mutation
  const deactivateLicenseMutation = useMutation({
    mutationFn: async () => {
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

      queryClient.setQueryData(["stored-license"], null);
      setConvexAuth(null);
      queryClient.clear();

      toast.success("License deactivated", {
        description: "You can now activate on a different device.",
      });
    },
  });

  // Validate license (manual check)
  const validateLicense = useCallback(async (): Promise<boolean> => {
    if (!storedLicenseKey || !machineId) return false;

    try {
      const result = await convexQuery(api.api.licenses.validateLicense, {
        licenseKey: storedLicenseKey,
        machineId,
      });

      return result.valid;
    } catch (error) {
      console.error("Validation error:", error);
      return false;
    }
  }, [storedLicenseKey, machineId]);

  // Check license status (refresh)
  const checkLicenseStatus = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["license-validation"] });

    // Update heartbeat
    if (storedLicenseKey && machineId) {
      try {
        await convexMutation(api.api.licenses.updateHeartbeat, {
          licenseKey: storedLicenseKey,
          machineId,
        });
      } catch (error) {
        console.error("Heartbeat update failed:", error);
      }
    }
  }, [storedLicenseKey, machineId, queryClient]);

  // Periodic license check (every 5 minutes)
  useEffect(() => {
    if (!licenseData?.session.isActive) return;

    const interval = setInterval(() => {
      checkLicenseStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [licenseData?.session.isActive, checkLicenseStatus]);

  const isLoading = keyLoading || (!!storedLicenseKey && licenseLoading) || !machineId;
  const isAuthenticated = !!licenseData?.session.isActive;

  const value: LicenseAuthContextType = {
    isLoading,
    isAuthenticated,
    user: licenseData?.user || null,
    session: licenseData?.session || null,

    activateLicense: async (licenseKey: string) => {
      await activateLicenseMutation.mutateAsync({ licenseKey });
    },
    deactivateLicense: async () => {
      await deactivateLicenseMutation.mutateAsync();
    },
    validateLicense,
    checkLicenseStatus,
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
