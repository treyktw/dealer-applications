/**
 * Standalone Login Page
 * Email/password login for standalone users
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@dealer/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, LogIn, AlertCircle, Building2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { setAppMode } from "@/lib/mode-detection";

export const Route = createFileRoute("/standalone-login")({
  component: StandaloneLoginPage,
});

function StandaloneLoginPage() {
  const navigate = useNavigate();
  const auth = useUnifiedAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUserType, setCheckingUserType] = useState(false);
  const [error, setError] = useState("");
  const [machineId, setMachineId] = useState<string>("");
  const [redirectingToDealership, setRedirectingToDealership] = useState(false);
  const [showDealershipDialog, setShowDealershipDialog] = useState(false);

  const login = useMutation(api.api.standaloneAuth.login);
  const emailInputId = useId();
  const passwordInputId = useId();
  
  // Check user type when email changes (debounced)
  const [emailToCheck, setEmailToCheck] = useState<string>("");
  const standaloneCheck = useQuery(
    api.api.standaloneAuth.checkIsStandaloneUser,
    emailToCheck?.includes("@") ? { email: emailToCheck } : "skip"
  );
  const dealershipCheck = useQuery(
    api.api.standaloneAuth.checkIsDealershipUser,
    emailToCheck?.includes("@") ? { email: emailToCheck } : "skip"
  );
  
  const checkingStandalone = standaloneCheck === undefined;
  const checkingDealership = dealershipCheck === undefined;

  // Get machine ID on mount
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

  // Redirect if already authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      navigate({ to: "/" });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  // Debounce email checking
  useEffect(() => {
    if (!email.trim() || !email.includes("@")) {
      setEmailToCheck("");
      return;
    }

    const timer = setTimeout(() => {
      setEmailToCheck(email.trim().toLowerCase());
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  // Show dialog when dealership user is detected (while typing)
  useEffect(() => {
    if (checkingDealership || checkingStandalone || redirectingToDealership || showDealershipDialog) return;
    
    // Show dialog immediately when dealership user is detected
    if (dealershipCheck?.isDealershipUser && !standaloneCheck?.isStandaloneUser) {
      console.log("🔍 [STANDALONE-LOGIN] Detected dealership user - showing dialog");
      setShowDealershipDialog(true);
    }
  }, [dealershipCheck, standaloneCheck, checkingDealership, checkingStandalone, redirectingToDealership, showDealershipDialog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    if (!machineId) {
      setError("Unable to identify machine. Please restart the app.");
      return;
    }

    // Check user type before attempting login
    setCheckingUserType(true);
    setError("");

    try {
      console.log("🔍 [STANDALONE-LOGIN] Checking user type for:", email);
      
      // Check if user is a dealership user
      console.log("🔍 [STANDALONE-LOGIN] Checking if user is dealership user...");
      const { convexQuery } = await import("@/lib/convex");
      const dealershipUserCheck = await convexQuery(api.api.standaloneAuth.checkIsDealershipUser, {
        email: email.trim().toLowerCase(),
      }) as { isDealershipUser: boolean; exists: boolean; hasDealership: boolean } | null | undefined;

      if (dealershipUserCheck?.isDealershipUser) {
        console.log("⚠️ [STANDALONE-LOGIN] User is a dealership user, dialog should already be showing");
        setCheckingUserType(false);
        // Dialog should already be showing from the useEffect, but ensure it's open
        if (!showDealershipDialog) {
          setShowDealershipDialog(true);
        }
        return;
      }

      // Check if user is a standalone user
      console.log("🔍 [STANDALONE-LOGIN] Checking if user is standalone user...");
      const standaloneUserCheck = await convexQuery(api.api.standaloneAuth.checkIsStandaloneUser, {
        email: email.trim().toLowerCase(),
      }) as { isStandaloneUser: boolean; exists: boolean } | null | undefined;

      if (!standaloneUserCheck || !standaloneUserCheck.isStandaloneUser) {
        setCheckingUserType(false);
        setError("No account found with this email. Please subscribe to create an account.");
        return;
      }

      console.log("✅ [STANDALONE-LOGIN] User is a standalone user, proceeding with login...");
      setCheckingUserType(false);
      setLoading(true);

      console.log("🔐 [STANDALONE-LOGIN] Attempting login for:", email);
      
      const result = await login({
        email: email.trim().toLowerCase(),
        password,
        machineId,
      });

      if (result.success && result.sessionToken) {
        console.log("✅ Login successful, storing session token");
        
        const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
        
        // SECURITY: In Tauri, always use secure storage (keyring) - never localStorage
        if (isTauri) {
          try {
            await invoke("store_session_token", { token: result.sessionToken });
            console.log("✅ [LOGIN] Token stored in secure storage (keyring)");
            
            // Store user ID in localStorage (non-sensitive metadata)
            localStorage.setItem("standalone_user_id", result.user.id);
            
            // Update react-query cache so LicenseAuthContext picks up the new token immediately
            queryClient.setQueryData(["stored-session-token"], result.sessionToken);
            queryClient.invalidateQueries({ queryKey: ["standalone-session"] });
            queryClient.invalidateQueries({ queryKey: ["user-license-check"] });
            queryClient.invalidateQueries({ queryKey: ["license-validation"] });
          } catch (error) {
            console.error("❌ [LOGIN] Failed to store in secure storage:", error);
            // Don't fallback to localStorage - force user to retry login
            throw new Error("Failed to store session securely. Please try again.");
          }
        } else {
          // Browser dev mode only: Use localStorage (NOT SECURE - dev only)
          console.warn("⚠️ [LOGIN] Browser dev mode - using localStorage (NOT SECURE, dev only)");
          localStorage.setItem("standalone_session_token", result.sessionToken);
          localStorage.setItem("standalone_user_id", result.user.id);
          console.log("✅ [LOGIN] Token stored in localStorage (dev mode only)");
          
          // Update react-query cache
          queryClient.setQueryData(["stored-session-token"], result.sessionToken);
          queryClient.invalidateQueries({ queryKey: ["standalone-session"] });
          queryClient.invalidateQueries({ queryKey: ["user-license-check"] });
          queryClient.invalidateQueries({ queryKey: ["license-validation"] });
        }
        
        toast.success("Login successful!");
        
        // Check if user has a license key
        // If not, redirect to subscription page
        const userLicenseCheck = await convexQuery(api.api.standaloneAuth.checkUserHasLicense, {
          email: email.trim().toLowerCase(),
        }) as { hasLicense: boolean; licenseKey?: string } | null | undefined;

        if (!userLicenseCheck?.hasLicense || !userLicenseCheck.licenseKey) {
          console.log("⚠️ [STANDALONE-LOGIN] User logged in but has no license, redirecting to subscription...");
          toast.info("A subscription is required to continue. Redirecting to subscription page...");
          navigate({ to: "/subscribe" });
          return;
        }

        // Check if license is stored locally
        try {
          const storedLicense = await invoke<string>("get_stored_license").catch(() => null);
          if (!storedLicense || storedLicense !== userLicenseCheck.licenseKey) {
            console.log("💾 [STANDALONE-LOGIN] Storing license key locally...");
            // Store license key locally
            await invoke("store_license", { licenseKey: userLicenseCheck.licenseKey });
            console.log("✅ License key stored successfully");
          } else {
            console.log("✅ License key already stored locally and matches");
          }
        } catch (err) {
          console.error("❌ Failed to store license locally:", err);
          // Continue anyway - license is in database, user can still use the app
        }
        
        // User has license - navigate to home
        navigate({ to: "/" });
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("❌ [STANDALONE-LOGIN] Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setCheckingUserType(false);
    }
  };

  const handleDealershipConfirm = () => {
    console.log("✅ [STANDALONE-LOGIN] User confirmed dealership account, switching mode...");
    setShowDealershipDialog(false);
    setRedirectingToDealership(true);
    
    // Clear all standalone-related cache and storage
    console.log("🧹 [STANDALONE-LOGIN] Clearing standalone cache and storage...");
    
    // Clear localStorage items
    localStorage.removeItem("standalone_session_token");
    localStorage.removeItem("standalone_user_id");
    localStorage.removeItem("pending_checkout_email");
    localStorage.removeItem("pending_checkout_session");
    
    // Clear React Query cache
    queryClient.clear();
    
    // Clear any stored license (optional - user might want to keep it)
    // We'll let the dealership mode handle its own auth
    
    // Save dealership preference
    console.log("💾 [STANDALONE-LOGIN] Saving dealership preference...");
    setAppMode("dealership");
    localStorage.setItem("has_dealership", "true");
    localStorage.setItem("app_mode", "dealership");
    localStorage.setItem("first_time_setup_complete", "true");
    
    // Verify the mode was set
    const savedMode = localStorage.getItem("app_mode");
    console.log("✅ [STANDALONE-LOGIN] App mode set to:", savedMode);
    
    toast.info("Switching to dealership mode...", {
      duration: 2000,
    });

    // Force a full page reload to ensure mode switch takes effect
    // Redirect to /login first, then the app will reload with dealership mode
    setTimeout(() => {
      console.log("🔄 [STANDALONE-LOGIN] Redirecting to dealership login...");
      // Redirect to login page - App.tsx will detect the mode and initialize correctly
      // Use replace to avoid back button issues
      window.location.replace(window.location.origin + "/login");
    }, 500);
  };

  const handleDealershipCancel = () => {
    console.log("❌ [STANDALONE-LOGIN] User cancelled dealership redirect");
    setShowDealershipDialog(false);
    setError("This email is associated with a dealership account. Please use the dealership login.");
  };

  if (auth.isLoading || redirectingToDealership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {redirectingToDealership 
                  ? "Redirecting to dealership login..." 
                  : "Loading..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showDealershipDialog} onOpenChange={setShowDealershipDialog}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4 items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">Dealership Account Detected</DialogTitle>
            <DialogDescription className="text-center text-sm break-words">
              This email is associated with a dealership account. Dealership accounts use a different login system and don't require a password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center break-words">
              Would you like to switch to dealership mode and use the standard login?
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleDealershipCancel}
              className="w-full sm:w-auto"
            >
              No, Continue with Standalone
            </Button>
            <Button
              onClick={handleDealershipConfirm}
              className="w-full sm:w-auto"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Yes, Switch to Dealership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={emailInputId}>Email</Label>
              <Input
                id={emailInputId}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || checkingUserType}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={passwordInputId}>Password</Label>
              <Input
                id={passwordInputId}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || checkingUserType}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Dialog is shown when dealership user is detected (handled by useEffect) */}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || checkingUserType || !email || !password}
              className="w-full"
              size="lg"
            >
              {(loading || checkingUserType) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {checkingUserType 
                ? "Checking account..." 
                : loading 
                  ? "Signing in..." 
                  : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/subscribe" })}
              className="w-full"
            >
              Subscribe to Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

