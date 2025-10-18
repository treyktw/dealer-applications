// src/routes/login.tsx - Beautiful login matching web app
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { DevModeLogin } from "@/components/auth/DevModelogin";
import { LinkHandler, } from "@/components/link-handler";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});


function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, initiateLogin } = useAuth();

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-zinc-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image/Background */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-12 flex-col justify-between overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <img
            src="/ds-hero.jpg"
            alt="Hero"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Logo/Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div>
              <h1 className="text-xl font-bold text-white">
                UniversalAutoBrokers
              </h1>
              <p className="text-sm text-zinc-400">DealerAdmin Platform</p>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-5xl font-bold text-white mb-4 leading-tight">
              Welcome to
              <br />
              DealerAdmin
            </h2>
            <p className="text-xl text-zinc-300 max-w-md">
              Streamline your dealership operations with our comprehensive
              management platform
            </p>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="flex items-center gap-2 text-zinc-300">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Document Management"
              >
                <title>Document Management</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm">Document Management</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Deal Tracking"
              >
                <title>Deal Tracking</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm">Deal Tracking</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="E-Signatures"
              >
                <title>E-Signatures</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm">E-Signatures</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Secure Storage"
              >
                <title>Secure Storage</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm">Secure Storage</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-zinc-400">
          © {new Date().getFullYear()} UniversalAutoBrokers. All rights
          reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              UniversalAutoBrokers
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              DealerAdmin Platform
            </p>
          </div>

          {/* Welcome Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Sign in to access your dealership dashboard
            </p>
          </div>

          {/* Sign In Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Sign in to Dealer
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Welcome back! Please sign in to continue
              </p>
            </div>

            {/* Sign In Button */}
            <Button
              onClick={handleLogin}
              size="lg"
              className="w-full h-12 text-base font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 transition-all"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Continue
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">
                  or
                </span>
              </div>
            </div>

            {/* Google Sign In (visual only, uses same flow) */}
            <Button
              onClick={handleLogin}
              variant="outline"
              size="lg"
              className="w-full h-12 text-base font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                aria-label="Google"
              >
                <title>Google</title>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Footer Info */}
            <div className="pt-4 text-center space-y-2">
              <p className="text-xs text-zinc-500">
                Don't have an account?{" "}
                <LinkHandler
                  href="https://dealer.universalautobrokers.net/sign-up"
                  className="text-zinc-900 dark:text-white font-medium hover:underline"
                >
                  Sign up
                </LinkHandler>
              </p>

              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-zinc-500">
                <LinkHandler
                  href="https://universalautobrokers.net/contact"
                  className="text-zinc-900 dark:text-white font-medium hover:underline"
                >
                  Contact Admin
                </LinkHandler>
                <span>•</span>
                <LinkHandler
                  href="https://universalautobrokers.net/request-demo"
                  className="text-zinc-900 dark:text-white font-medium hover:underline"
                >
                  Request Demo
                </LinkHandler>
              </div>
            </div>

            {/* Security Badge */}
            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span>Secured by</span>
              <div className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Clerk"
                >
                  <title>Clerk</title>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                Clerk
              </div>
              {import.meta.env.DEV && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                  Development mode
                </span>
              )}
            </div>
          </div>

          {/* Dev Mode Login Component */}
          {import.meta.env.DEV && <DevModeLogin />}
        </div>
      </div>
    </div>
  );
}
