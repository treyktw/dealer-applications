// src/routes/login.tsx - Desktop SSO with Clerk
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, LogIn, Shield, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, initiateLogin } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async () => {
    try {
      await initiateLogin();
    } catch (error) {
      console.error("Login initiation failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          {/* Logo/Icon */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="DealerPro Logo"
              role="img"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Title */}
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              DealerPro Desktop
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sign in to access your dealership
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sign In Button */}
          <Button
            onClick={handleLogin}
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Sign in with your account
          </Button>

          {/* How it works */}
          <div className="space-y-3 pt-4">
            <p className="text-sm font-medium text-center text-muted-foreground">
              How it works:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Click the button to open your browser
                </p>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Sign in with your email and password
                </p>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Return to the app and start working
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Secure Authentication
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your credentials are never stored in the desktop app. We use
                  enterprise-grade authentication to keep your account safe.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 space-y-2 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground text-center mb-3">
              DESKTOP FEATURES
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>7-day sessions</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Offline access</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Fast performance</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Native integration</span>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 text-center border-t">
          <p className="text-xs text-muted-foreground">
            DealerPro Desktop v2.0 • {new Date().getFullYear()}
          </p>
        </div>
      </Card>
    </div>
  );
}
