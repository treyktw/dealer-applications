/**
 * License Activation Component
 * Handles license key validation and activation for the desktop app
 */

import { useState, useEffect, useId } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@dealer/convex";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, AlertCircle, Key, Loader2, ShoppingCart } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useUnifiedAuth } from "./auth/useUnifiedAuth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface LicenseActivationProps {
  onSuccess?: () => void;
  onNavigate?: (path: string) => void;
}

export function LicenseActivation({ onNavigate }: LicenseActivationProps) {
  const navigate = useNavigate();
  const auth = useUnifiedAuth();
  const [licenseKey, setLicenseKey] = useState("");
  const [machineId, setMachineId] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [storedLicenseKey, setStoredLicenseKey] = useState<string | null>(null);
  const licenseId = useId();
  
  // Handle navigation - use callback if provided, otherwise use window.location
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate({ to: path });
    }
  };

  const activateLicense = useMutation(api.api.licenses.activateLicense);

  // Check for stored license key locally FIRST (doesn't require auth)
  useEffect(() => {
    async function checkStoredLicense() {
      try {
        const key = await invoke<string>("get_stored_license").catch(() => null);
        if (key) {
          setStoredLicenseKey(key);
        }
      } catch {
        // No stored license - that's okay
      }
    }
    checkStoredLicense();
  }, []);

  // Check if user already has a license key in the database (only if user is authenticated)
  const userLicenseCheck = useQuery(
    api.api.standaloneAuth.checkUserHasLicense,
    auth.user?.email ? { email: auth.user.email } : "skip"
  );

  // Get machine info on mount
  useEffect(() => {
    async function getMachineInfo() {
      try {
        // These would be Tauri commands you'd implement in Rust
        const id = await invoke<string>("get_machine_id");
        const plat = await invoke<string>("get_platform");
        const version = await invoke<string>("get_app_version");

        setMachineId(id);
        setPlatform(plat);
        setAppVersion(version);
      } catch (err) {
        console.error("Failed to get machine info:", err);
        // Fallback values
        setMachineId(crypto.randomUUID());
        setPlatform(navigator.platform);
        setAppVersion("0.1.0");
      }
    }

    getMachineInfo();
  }, []);

  // If user has a license key in database or stored locally, redirect away
  useEffect(() => {
    const hasLicenseInDb = userLicenseCheck?.hasLicense && userLicenseCheck.licenseKey;
    const hasStoredLicense = !!storedLicenseKey;

    if (hasLicenseInDb || hasStoredLicense) {
      console.log("✅ User already has a license key, redirecting...");
      // User already has a license - redirect to home
      if (onNavigate) {
        onNavigate("/");
      } else {
        navigate({ to: "/" });
      }
    }
  }, [userLicenseCheck, storedLicenseKey, onNavigate, navigate]);

  // If stored license exists, redirect immediately (don't wait for DB check)
  if (storedLicenseKey) {
    return null; // Will redirect via useEffect
  }

  // Show loading ONLY if we're waiting for a database query AND user is authenticated
  // If user is not authenticated, we don't need to wait - just show the form
  const isWaitingForDbCheck = auth.user?.email && userLicenseCheck === undefined;
  
  if (isWaitingForDbCheck) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking license status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user has license in DB, don't render the form (will redirect via useEffect)
  if (userLicenseCheck?.hasLicense) {
    return null;
  }

  async function handleActivate() {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    if (!machineId) {
      setError("Unable to identify machine. Please restart the app.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const hostname = await invoke<string>("get_hostname").catch(() => "Unknown");
      const formattedLicenseKey = licenseKey.trim().toUpperCase();

      console.log("🔑 Starting license activation:", {
        licenseKey: formattedLicenseKey.substring(0, 12) + "...",
        machineId: machineId.substring(0, 8) + "...",
        platform,
        appVersion,
      });

      // Activate via Convex
      const result = await activateLicense({
        licenseKey: formattedLicenseKey,
        machineId,
        platform,
        appVersion,
        hostname,
      });

      console.log("✅ License activation result:", {
        success: result.success,
        hasSessionToken: !!result.sessionToken,
        hasUserId: !!result.userId,
      });

      // Store license key securely using Tauri's secure storage
      try {
        console.log("💾 Attempting to store license key locally...");
        await invoke("store_license", { licenseKey: formattedLicenseKey });
        console.log("✅ License key stored successfully in Tauri secure storage");
      } catch (storeError) {
        console.error("❌ Failed to store license locally:", storeError);
        toast.error("License activated but failed to save locally. Please restart the app.");
        // Continue anyway as license is activated on server
      }

      // Store session token if provided
      if (result.sessionToken && result.userId) {
        const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
        
        // SECURITY: In Tauri, always use secure storage (keyring) - never localStorage
        if (isTauri) {
          try {
            console.log("💾 [ACTIVATION] Storing session token in secure storage...");
            await invoke("store_session_token", { token: result.sessionToken });
            // Store user ID in localStorage (non-sensitive metadata)
            localStorage.setItem("standalone_user_id", result.userId);
            console.log("✅ [ACTIVATION] Token stored in secure storage (keyring)");
          } catch (sessionError) {
            console.error("❌ [ACTIVATION] Failed to store in secure storage:", sessionError);
            throw new Error("Failed to store session securely. Please try again.");
          }
        } else {
          // Browser dev mode only: Use localStorage (NOT SECURE - dev only)
          console.warn("⚠️ [ACTIVATION] Browser dev mode - using localStorage (NOT SECURE, dev only)");
          try {
            localStorage.setItem("standalone_session_token", result.sessionToken);
            localStorage.setItem("standalone_user_id", result.userId);
            console.log("✅ [ACTIVATION] Token stored in localStorage (dev mode only)");
          } catch (e) {
            console.error("❌ [ACTIVATION] Failed to store session token:", e);
            throw new Error("Failed to store session token.");
          }
        }
      }

      setSuccess(true);
      toast.success("License activated successfully!");

      // Redirect to home page after a brief delay
      setTimeout(() => {
        console.log("🚀 Redirecting to dashboard...");
        if (onNavigate) {
          onNavigate("/");
        } else {
          navigate({ to: "/" });
        }
      }, 1500);
    } catch (err) {
      console.error("Activation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to activate license. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage, {
        description: "Please check your license key and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function formatLicenseKey(value: string) {
    // Auto-format as user types: DEALER-XXXX-XXXX-XXXX
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleaned.startsWith("DEALER")) {
      const parts = [
        "DEALER",
        cleaned.slice(6, 10),
        cleaned.slice(10, 14),
        cleaned.slice(14, 18),
      ].filter(Boolean);
      return parts.join("-");
    }

    const parts = [
      cleaned.slice(0, 4),
      cleaned.slice(4, 8),
      cleaned.slice(8, 12),
    ].filter(Boolean);

    return parts.join("-");
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Key className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Activate Your License</CardTitle>
          <CardDescription>
            Enter your license key to start using Dealer Software
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license">License Key</Label>
            <Input
              id={licenseId}
              type="text"
              placeholder="DEALER-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(formatLicenseKey(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              disabled={loading || success}
              className="font-mono text-center"
              maxLength={22}
            />
            <p className="text-xs text-muted-foreground">
              Find your license key in your purchase confirmation email
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                License activated successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleActivate}
            disabled={loading || success || !licenseKey}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Activating..." : success ? "Activated!" : "Activate License"}
          </Button>

          <div className="text-center space-y-2 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Don't have a license yet?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleNavigate("/subscribe");
              }}
              className="w-full"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Subscription Plans
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>â€¢ Monthly: $49/month</p>
            <p>â€¢ Annual: $490/year (save $98)</p>
            <p>â€¢ Cancel anytime</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * License Info Display
 * Shows current license status and activation details
 */
export function LicenseInfo() {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicense() {
      try {
        const key = await invoke<string>("get_stored_license").catch(() => null);
        if (key) {
          setLicenseKey(key);
        }
      } catch (err) {
        console.error("No license found:", err);
      }
    }

    loadLicense();
  }, []);

  const licenseInfo = useQuery(
    api.api.licenses.getLicenseInfo,
    licenseKey ? { licenseKey } : "skip"
  );

  if (!licenseKey || !licenseInfo) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">License Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">License Key</Label>
          <p className="font-mono">{licenseKey}</p>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Tier</Label>
          <p className="capitalize">{licenseInfo.tier}</p>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Activations</Label>
          <p>
            {licenseInfo.currentActivations} /{" "}
            {licenseInfo.maxActivations === -1 ? "Unlimited" : licenseInfo.maxActivations}
          </p>
        </div>

        {licenseInfo.expiresAt && (
          <div>
            <Label className="text-xs text-muted-foreground">Expires</Label>
            <p>{new Date(licenseInfo.expiresAt).toLocaleDateString()}</p>
          </div>
        )}

        <div className="pt-2">
          <Label className="text-xs text-muted-foreground mb-2 block">Active Devices</Label>
          <div className="space-y-2">
            {licenseInfo.activations.map((activation) => (
              <div
                key={activation.hostname}
                className="text-sm p-2 bg-muted rounded flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{activation.hostname || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {activation.platform} â€¢ v{activation.appVersion}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(activation.activatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}