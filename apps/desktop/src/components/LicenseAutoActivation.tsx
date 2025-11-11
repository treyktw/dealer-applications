/**
 * License Auto-Activation Component
 * Automatically activates license if user has one associated with their account
 * Shows a loader with status messages during the process
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@dealer/convex";
import { Card, CardContent } from "./ui/card";
import { Loader2, CheckCircle2, Key, Sparkles } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface LicenseAutoActivationProps {
  email?: string;
  onComplete: () => void;
  onNoLicense: () => void;
}

type ActivationStep = 
  | "checking_email"
  | "checking_license"
  | "activating_license"
  | "storing_license"
  | "creating_session"
  | "complete"
  | "no_license";

export function LicenseAutoActivation({ email, onComplete, onNoLicense }: LicenseAutoActivationProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<ActivationStep>("checking_email");
  const [machineId, setMachineId] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");

  // Get machine info
  useEffect(() => {
    async function getMachineInfo() {
      try {
        const id = await invoke<string>("get_machine_id");
        const plat = await invoke<string>("get_platform");
        const version = await invoke<string>("get_app_version");
        setMachineId(id);
        setPlatform(plat);
        setAppVersion(version);
      } catch (err) {
        console.error("Failed to get machine info:", err);
        setMachineId(crypto.randomUUID());
        setPlatform(navigator.platform);
        setAppVersion("0.1.0");
      }
    }
    getMachineInfo();
  }, []);

  // Try to get email from various sources
  const [userEmail, setUserEmail] = useState<string | null>(email || null);

  useEffect(() => {
    if (!userEmail) {
      // Try to get from various sources:
      // 1. URL search params (from account setup or subscription listener)
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get("email");
      
      // 2. localStorage (from subscription checkout)
      const pendingEmail = localStorage.getItem("pending_checkout_email");
      
      // 3. Check if we have a session token (user might already be logged in)
      const sessionToken = localStorage.getItem("standalone_session_token");
      
      const storedEmail = urlEmail || pendingEmail;
      
      if (storedEmail) {
        console.log("📧 Found email from storage/URL:", storedEmail);
        setUserEmail(storedEmail);
      } else if (sessionToken) {
        console.log("📧 Found session token - user may already be authenticated");
        // Don't set email, let the auth context handle it
        setStep("no_license");
        setTimeout(() => {
          onNoLicense();
        }, 100);
      } else {
        console.log("📧 No email found - will show manual activation");
        setStep("no_license");
        setTimeout(() => {
          onNoLicense();
        }, 100);
      }
    }
  }, [userEmail, onNoLicense]);

  // Check if user has a license key
  const licenseCheck = useQuery(
    api.api.standaloneAuth.checkUserHasLicense,
    userEmail ? { email: userEmail } : "skip"
  );

  const activateLicense = useMutation(api.api.licenses.activateLicense);

  // Auto-activate when license is found
  useEffect(() => {
    if (!userEmail || !machineId || step !== "checking_license") return;
    if (licenseCheck === undefined) return; // Still loading

    async function autoActivate() {
      if (!licenseCheck?.hasLicense || !licenseCheck.licenseKey) {
        console.log("❌ No license found for user - falling back to manual activation");
        setStep("no_license");
        setTimeout(() => {
          onNoLicense();
        }, 500);
        return;
      }

      const licenseKey = licenseCheck.licenseKey;
      console.log("✅ Found license key for user:", licenseKey.substring(0, 12) + "...");

      try {
        setStep("activating_license");

        const hostname = await invoke<string>("get_hostname").catch(() => "Unknown");

        // Activate license
        const result = await activateLicense({
          licenseKey,
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

        setStep("storing_license");

        // Store license key
        try {
          await invoke("store_license", { licenseKey });
          console.log("✅ License key stored in Tauri secure storage");
        } catch (storeError) {
          console.error("❌ Failed to store license:", storeError);
          toast.error("License activated but failed to save locally");
        }

        // Store session token if provided
        if (result.sessionToken && result.userId) {
          setStep("creating_session");

          const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
          
          // SECURITY: In Tauri, always use secure storage (keyring) - never localStorage
          if (isTauri) {
            try {
              await invoke("store_session_token", { token: result.sessionToken });
              console.log("✅ [AUTO-ACTIVATION] Token stored in secure storage (keyring)");
              // Store user ID in localStorage (non-sensitive metadata)
              localStorage.setItem("standalone_user_id", result.userId);
            } catch (error) {
              console.error("❌ [AUTO-ACTIVATION] Failed to store in secure storage:", error);
              throw new Error("Failed to store session securely. Please try again.");
            }
          } else {
            // Browser dev mode only: Use localStorage (NOT SECURE - dev only)
            console.warn("⚠️ [AUTO-ACTIVATION] Browser dev mode - using localStorage (NOT SECURE, dev only)");
            localStorage.setItem("standalone_session_token", result.sessionToken);
            localStorage.setItem("standalone_user_id", result.userId);
            console.log("✅ [AUTO-ACTIVATION] Token stored in localStorage (dev mode only)");
          }
        }

        setStep("complete");

        toast.success("License activated successfully!");

        // Redirect after a brief moment
        setTimeout(() => {
          onComplete();
          navigate({ to: "/" });
        }, 1000);
      } catch (err) {
        console.error("❌ Auto-activation failed:", err);
        toast.error(err instanceof Error ? err.message : "Failed to activate license");
        setStep("no_license");
        setTimeout(() => {
          onNoLicense();
        }, 1000);
      }
    }

    autoActivate();
  }, [licenseCheck, userEmail, machineId, platform, appVersion, step, activateLicense, onComplete, onNoLicense, navigate]);

  // Update step based on license check status
  useEffect(() => {
    if (!userEmail) {
      setStep("checking_email");
      return;
    }

    if (licenseCheck === undefined) {
      setStep("checking_license");
    } else if (licenseCheck.hasLicense) {
      setStep("checking_license");
    } else {
      console.log("❌ No license found - will show manual activation");
      setStep("no_license");
      const timer = setTimeout(() => {
        onNoLicense();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userEmail, licenseCheck, onNoLicense]);

  // Show manual activation if no license found
  if (step === "no_license") {
    return null; // Will show manual LicenseActivation component
  }

  // Show loader with status
  const getStepIcon = () => {
    switch (step) {
      case "complete":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "activating_license":
      case "storing_license":
      case "creating_session":
        return <Key className="h-8 w-8 text-primary animate-pulse" />;
      default:
        return <Loader2 className="h-8 w-8 text-primary animate-spin" />;
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "checking_email":
        return "Checking your account information...";
      case "checking_license":
        return "Looking for your license key...";
      case "activating_license":
        return "Activating your license on this device...";
      case "storing_license":
        return "Securely storing your license...";
      case "creating_session":
        return "Setting up your session...";
      case "complete":
        return "All set! Redirecting to your dashboard...";
      default:
        return "Setting up your license...";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
              {getStepIcon()}
              {step !== "complete" && (
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Setting Up Your License</h2>
              <p className="text-muted-foreground">{getStepDescription()}</p>
            </div>

            {userEmail && (
              <div className="w-full p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Account</p>
                <p className="text-sm font-medium">{userEmail}</p>
              </div>
            )}

            {step === "checking_license" && licenseCheck?.hasLicense && (
              <div className="w-full p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-primary font-medium">
                  ✓ License found! Activating now...
                </p>
              </div>
            )}

            {step !== "complete" && (
              <div className="w-full">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{
                      width: step === "checking_email" ? "20%" :
                             step === "checking_license" ? "40%" :
                             step === "activating_license" ? "60%" :
                             step === "storing_license" ? "80%" :
                             step === "creating_session" ? "90%" : "100%"
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

