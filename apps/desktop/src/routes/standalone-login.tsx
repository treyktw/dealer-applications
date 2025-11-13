/**
 * Standalone Login Page
 * Email code verification login for standalone users
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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
  validateSearch: (search: Record<string, unknown>): { email: string; redirect?: string } => {
    return {
      email: (search.email as string) || "",
      redirect: search.redirect ? (search.redirect as string) : undefined,
    };
  },
});

function StandaloneLoginPage() {
  const navigate = useNavigate();
  const auth = useUnifiedAuth();
  const queryClient = useQueryClient();
  const { email: emailFromSearch } = Route.useSearch();
  const [email, setEmail] = useState(emailFromSearch || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [showResendOption, setShowResendOption] = useState(false);
  const [machineId, setMachineId] = useState<string>("");
  const [redirectingToDealership, setRedirectingToDealership] = useState(false);
  const [showDealershipDialog, setShowDealershipDialog] = useState(false);

  const sendLoginCode = useAction(api.api.standaloneAuth.sendLoginCode);
  const verifyLoginCode = useMutation(api.api.standaloneAuth.verifyLoginCode);
  const emailInputId = useId();
  const codeInputId = useId();
  
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

  // Update email when search parameter changes
  useEffect(() => {
    if (emailFromSearch) {
      setEmail(emailFromSearch);
    }
  }, [emailFromSearch]);

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

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!machineId) {
      setError("Unable to identify machine. Please restart the app.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔍 [STANDALONE-LOGIN] Checking user type for:", email);
      
      // Check if user is a dealership user
      const { convexQuery } = await import("@/lib/convex");
      const dealershipUserCheck = await convexQuery(api.api.standaloneAuth.checkIsDealershipUser, {
        email: email.trim().toLowerCase(),
      }) as { isDealershipUser: boolean; exists: boolean; hasDealership: boolean } | null | undefined;

      if (dealershipUserCheck?.isDealershipUser) {
        console.log("⚠️ [STANDALONE-LOGIN] User is a dealership user, dialog should already be showing");
        setLoading(false);
        if (!showDealershipDialog) {
          setShowDealershipDialog(true);
        }
        return;
      }

      // Check if user is a standalone user
      const standaloneUserCheck = await convexQuery(api.api.standaloneAuth.checkIsStandaloneUser, {
        email: email.trim().toLowerCase(),
      }) as { isStandaloneUser: boolean; exists: boolean } | null | undefined;

      if (!standaloneUserCheck || !standaloneUserCheck.isStandaloneUser) {
        setLoading(false);
        setError("No account found with this email. Please subscribe to create an account.");
        return;
      }

      console.log("✅ [STANDALONE-LOGIN] User is a standalone user, sending login code...");
      
      // Send login code
      await sendLoginCode({
        email: email.trim().toLowerCase(),
      });

      setCodeSent(true);
      toast.success("Verification code sent to your email");
    } catch (err) {
      console.error("❌ [STANDALONE-LOGIN] Send code error:", err);
      
      // Parse error message for user-friendly display
      let errorMessage = "Failed to send verification code. Please try again.";
      
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        
        if (errMsg.includes("subscription") || errMsg.includes("active subscription")) {
          errorMessage = "An active subscription is required. Please subscribe to continue.";
        } else if (errMsg.includes("failed to send") || errMsg.includes("email")) {
          errorMessage = "We couldn't send the verification code to your email. Please check your email address and try again.";
        } else if (errMsg.includes("not found") || errMsg.includes("no account")) {
          errorMessage = "No account found with this email. Please subscribe to create an account.";
        } else {
          // Use the original error message if it's user-friendly
          errorMessage = err.message || errorMessage;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    if (!machineId) {
      setError("Unable to identify machine. Please restart the app.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 [STANDALONE-LOGIN] Verifying code for:", email);
      
      const result = await verifyLoginCode({
        email: email.trim().toLowerCase(),
        code: code.trim(),
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
        const { convexQuery } = await import("@/lib/convex");
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
            await invoke("store_license", { licenseKey: userLicenseCheck.licenseKey });
            console.log("✅ License key stored successfully");
          } else {
            console.log("✅ License key already stored locally and matches");
          }
        } catch (err) {
          console.error("❌ Failed to store license locally:", err);
        }
        
        // User has license - navigate to home
        navigate({ to: "/" });
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("❌ [STANDALONE-LOGIN] Verify code error:", err);
      
      // Parse error message for user-friendly display
      let errorMessage = "Invalid or expired code. Please try again.";
      let shouldOfferResend = false;
      
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        
        if (errMsg.includes("invalid or expired code") || errMsg.includes("code mismatch")) {
          errorMessage = "The code you entered is incorrect or has expired. Please check your email and try again.";
          shouldOfferResend = true;
        } else if (errMsg.includes("expired")) {
          errorMessage = "This code has expired. Please request a new code.";
          shouldOfferResend = true;
        } else if (errMsg.includes("invalid email")) {
          errorMessage = "The email address is not valid. Please check and try again.";
        } else if (errMsg.includes("subscription")) {
          errorMessage = "An active subscription is required. Please subscribe to continue.";
        } else if (errMsg.includes("failed to send")) {
          errorMessage = "We couldn't send the verification code. Please try again.";
          shouldOfferResend = true;
        } else {
          // Use the original error message if it's user-friendly, otherwise use default
          errorMessage = err.message || errorMessage;
        }
      }
      
      setError(errorMessage);
      setShowResendOption(shouldOfferResend);
      toast.error(errorMessage);
      
      // Clear the code input so user can try again
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode("");
    setCodeSent(false);
    await handleSendCode();
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
    setTimeout(() => {
      console.log("🔄 [STANDALONE-LOGIN] Redirecting to dealership login...");
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
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col justify-center items-center space-y-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <div className="flex justify-center items-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900/20">
                <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <DialogTitle className="text-lg text-center">Dealership Account Detected</DialogTitle>
            <DialogDescription className="text-sm text-center wrap-break-word">
              This email is associated with a dealership account. Dealership accounts use a different login system and don't require a password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-center wrap-break-word text-muted-foreground">
              Would you like to switch to dealership mode and use the standard login?
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
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
              <Building2 className="mr-2 w-4 h-4" />
              Yes, Switch to Dealership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-center items-center p-4 min-h-screen bg-background">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            {codeSent ? "Enter the code sent to your email" : "Enter your email to receive a verification code"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {!codeSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={emailInputId}>Email</Label>
                  <Input
                    id={emailInputId}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>

                {/* Dialog is shown when dealership user is detected (handled by useEffect) */}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSendCode}
                  disabled={loading || !email}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                  {loading ? "Sending code..." : "Send Code"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={codeInputId}>Verification Code</Label>
                  <Input
                    id={codeInputId}
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setCode(value);
                      setError("");
                      setShowResendOption(false);
                    }}
                    disabled={loading}
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="font-mono text-2xl tracking-widest text-center"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Code sent to {email}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="space-y-2">
                      <p>{error}</p>
                      {showResendOption && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCode("");
                            setCodeSent(false);
                            setError("");
                            setShowResendOption(false);
                            handleSendCode();
                          }}
                          className="mt-2 w-full"
                        >
                          Request New Code
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  className="w-full"
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="w-full"
                    size="sm"
                  >
                    Didn't receive code? Resend
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCodeSent(false);
                      setCode("");
                      setError("");
                    }}
                    disabled={loading}
                    className="w-full"
                    size="sm"
                  >
                    Use a different email
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 space-y-2 text-center">
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
