/**
 * License Activation Component
 * Handles license key validation and activation for the desktop app
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@dealer/convex";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, AlertCircle, Key, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface LicenseActivationProps {
  onSuccess?: () => void;
}

export function LicenseActivation({ onSuccess }: LicenseActivationProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [machineId, setMachineId] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const activateLicense = useMutation(api.licenses.activateLicense);

  // Get machine info on mount
  useEffect(() => {
    async function getMachineInfo() {
      try {
        // These would be Tauri commands you'd implement in Rust
        const id = await invoke<string>("get_machine_id");
        const plat = await invoke<string>("get_platform");
        const version = await invoke<string>("get_app_version");
        const hostname = await invoke<string>("get_hostname").catch(() => "Unknown");

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

      // Activate via Convex
      const result = await activateLicense({
        licenseKey: licenseKey.trim().toUpperCase(),
        machineId,
        platform,
        appVersion,
        hostname,
      });

      // Store license key securely using Tauri's secure storage
      try {
        await invoke("store_license", { licenseKey: licenseKey.trim().toUpperCase() });
      } catch (storeError) {
        console.error("Failed to store license locally:", storeError);
        // Continue anyway as license is activated on server
      }

      setSuccess(true);

      // Notify parent component
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err: any) {
      console.error("Activation error:", err);
      setError(err.message || "Failed to activate license. Please try again.");
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
              id="license"
              type="text"
              placeholder="DEALER-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(formatLicenseKey(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              disabled={loading || success}
              className="font-mono text-center"
              maxLength={19}
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
                License activated successfully! Redirecting...
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
                // Open purchase page
                invoke("open_url", {
                  url: "https://polar.sh/your-org/products/dealer-software",
                });
              }}
            >
              Purchase License
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>• Single License: 1 device</p>
            <p>• Team License: 5 devices</p>
            <p>• Enterprise: Unlimited devices</p>
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
        const key = await invoke<string>("get_stored_license");
        setLicenseKey(key);
      } catch (err) {
        console.error("No license found:", err);
      }
    }

    loadLicense();
  }, []);

  const licenseInfo = useQuery(
    api.licenses.getLicenseInfo,
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
            {licenseInfo.activations.map((activation, index) => (
              <div
                key={index}
                className="text-sm p-2 bg-muted rounded flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{activation.hostname || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {activation.platform} • v{activation.appVersion}
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
