// src/routes/login.tsx
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    if (!context.auth?.isLoaded) {
      return;
    }

    if (context.auth?.isSignedIn) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    if (isSignedIn) {
      navigate({ to: "/" });
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image (2/3 of screen) */}
      <div className="hidden lg:flex lg:w-2/3 relative">
        <img
          src="/ds-hero.jpg"
          alt="Luxury car"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />

        {/* Optional: Add branding on the image */}
        <div className="relative z-10 flex items-end p-12">
          <div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Dealer Management
            </h1>
            <p className="text-xl text-white/80">
              Streamline your dealership operations
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form (1/3 of screen) */}
      <div className="w-full lg:w-1/3 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 relative">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        {/* Login Form Container */}
        <div className="w-full max-w-md px-8">
          <div className="w-full">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img src="/logo.png" alt="Dealer Software" className="w-50 h-50" />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to your account to continue
              </p>
            </div>

            {/* Login Form with updated styling */}
            <div className="space-y-6">
              <LoginForm />
            </div>

            {/* Footer */}
            <p className="text-center text-gray-600 dark:text-gray-400 mt-8 text-sm">
              Don't have an account?{" "}
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Contact your administrator
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile view - Show image as background */}
      <div className="lg:hidden absolute inset-0 -z-10">
        <img
          src="/ds-hero.jpg"
          alt="Luxury car"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
    </div>
  );
}
