/**
 * Account Setup Component
 * Shown after successful subscription payment to complete account creation
 */

import { useState, useId } from "react";
import { useMutation } from "convex/react";
import { api } from "@dealer/convex";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Key, ArrowRight } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "@tanstack/react-router";

interface AccountSetupProps {
  email: string;
  onComplete: () => void;
}

export function AccountSetup({ email }: AccountSetupProps) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

  const emailId = useId();
  const nameId = useId();
  const businessNameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const navigate = useNavigate();
  const completeAccountSetup = useMutation(api.api.standaloneAuth.completeAccountSetup);
  const activateLicense = useMutation(api.api.licenses.activateLicense);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await completeAccountSetup({
        email,
        password,
        name: name.trim(),
        businessName: businessName.trim() || undefined,
      });

      if (result.success && result.sessionToken && result.user.licenseKey) {
        console.log("✅ Account setup complete:", result);
        
        setLicenseKey(result.user.licenseKey);
        
        // Get machine info for license activation
        const machineId = await invoke<string>("get_machine_id");
        const platform = await invoke<string>("get_platform");
        const appVersion = await invoke<string>("get_app_version");
        const hostname = await invoke<string>("get_hostname").catch(() => "Unknown");

        console.log("🔑 Auto-activating license:", result.user.licenseKey);

        // Auto-activate the license
        await activateLicense({
          licenseKey: result.user.licenseKey,
          machineId,
          platform,
          appVersion,
          hostname,
        });

        // Store license key securely
        await invoke("store_license", { licenseKey: result.user.licenseKey });
        
        console.log("✅ License activated and stored");
        
        setSuccess(true);
        
        // Don't auto-redirect - let user manually continue
      } else {
        setError("Failed to complete account setup. Please try again.");
      }
    } catch (err) {
      console.error("Account setup error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete account setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold">All Set!</h2>
              <p className="text-muted-foreground">
                Your account has been created and your license has been activated.
              </p>
              {licenseKey && (
                <div className="w-full p-4 bg-muted rounded-lg border-2 border-primary/20">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Key className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Your License Key</p>
                  </div>
                  <p className="font-mono text-sm text-center break-all font-semibold text-primary">{licenseKey}</p>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Your license has been automatically activated and stored securely on this device.
                    <br />
                    Save this key for your records.
                  </p>
                </div>
              )}
              <Button
                onClick={() => navigate({ to: "/" })}
                size="lg"
                className="w-full"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Account Setup</CardTitle>
          <CardDescription>
            Your subscription is active! Please create your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id={emailId}
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This email was used for your subscription
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id={nameId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (Optional)</Label>
              <Input
                id={businessNameId}
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="My Business"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id={passwordId}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={loading}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id={confirmPasswordId}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !name || !password || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}