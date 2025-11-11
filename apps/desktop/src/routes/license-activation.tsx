import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LicenseActivation } from '@/components/LicenseActivation';
import { LicenseAutoActivation } from '@/components/LicenseAutoActivation';
import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '@/components/auth/useUnifiedAuth';

export const Route = createFileRoute('/license-activation')({
  component: LicenseActivationRoute,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || undefined,
    };
  },
});

function LicenseActivationRoute() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const auth = useUnifiedAuth();
  const [showManualActivation, setShowManualActivation] = useState(false);
  const [autoActivationComplete, setAutoActivationComplete] = useState(false);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      console.log("✅ User already authenticated, redirecting to dashboard");
      navigate({ to: "/" });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  // Check if we should try auto-activation
  useEffect(() => {
    // If we have an email, try auto-activation first
    // Otherwise, show manual activation immediately
    if (!email) {
      // Check localStorage for email
      const pendingEmail = localStorage.getItem("pending_checkout_email");
      if (!pendingEmail) {
        setShowManualActivation(true);
      }
    }
  }, [email]);

  // If no email found, show manual activation immediately
  if (showManualActivation) {
    return (
      <LicenseActivation
        onNavigate={(path) => {
          navigate({ to: path });
        }}
      />
    );
  }

  // If auto-activation completed, redirect (component handles this, but just in case)
  if (autoActivationComplete) {
    return null; // Will redirect via auto-activation component
  }

  // Try auto-activation
  return (
    <LicenseAutoActivation
      email={email}
      onComplete={() => {
        // Auto-activation component handles redirect
        setAutoActivationComplete(true);
      }}
      onNoLicense={() => {
        setShowManualActivation(true);
      }}
    />
  );
}