// app/desktop-sso/page.tsx - Refactored with stable callbacks and guards
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';

export default function DesktopSSOPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [error, setError] = useState<string | null>(null);
  
  // Freeze state on mount - don't let searchParams identity changes retrigger
  const [frozenState] = useState(() => searchParams.get('state'));
  
  // Single-navigation guard - prevents double navigation in StrictMode
  const hasNavigated = useRef(false);

  // STABLE CALLBACK: Decide and navigate
  const handleNavigation = useCallback(() => {
    // Guard: only navigate once
    if (hasNavigated.current) {
      console.log('⚠️ Navigation already attempted, skipping');
      return;
    }

    // Validate state parameter exists (CSRF protection)
    if (!frozenState) {
      console.error('❌ Missing state parameter');
      setError('Invalid authentication request - missing state parameter');
      hasNavigated.current = true; // Mark as handled
      return;
    }

    // Wait for Clerk to fully load
    if (!isLoaded) {
      console.log('⏳ Waiting for Clerk to load...');
      return;
    }

    // Check if metadata is ready (prevents premature routing)
    const metadataReady = user?.publicMetadata != null;
    
    if (!isSignedIn || !user || !metadataReady) {
      // User not signed in or metadata not ready, redirect to sign-in page
      console.log('🔐 Not authenticated, redirecting to sign-in...');
      
      const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/desktop-sso?state=${frozenState}`)}`;
      
      hasNavigated.current = true;
      router.replace(signInUrl); // Use replace to avoid polluting history
      return;
    }

    // User is signed in, check access permissions
    console.log('✅ User authenticated, checking permissions...');
    
    const publicMetadata = user.publicMetadata as {
      dealersoftwareAccess?: boolean;
      accountActive?: boolean;
    };

    if (!publicMetadata.dealersoftwareAccess) {
      console.error('❌ Desktop access not enabled');
      setError('Desktop app access not enabled for your account');
      hasNavigated.current = true;
      return;
    }

    if (!publicMetadata.accountActive) {
      console.error('❌ Account not active');
      setError('Your account is not active');
      hasNavigated.current = true;
      return;
    }

    // All checks passed - proceed to callback page
    console.log('✅ All checks passed, redirecting to callback...');
    
    hasNavigated.current = true;
    router.replace(`/desktop-callback?state=${encodeURIComponent(frozenState)}`);
    
  }, [isLoaded, isSignedIn, user, frozenState, router]);

  // EFFECT: Run navigation logic when ready
  // Only depends on the stable callback, not on volatile state
  useEffect(() => {
    console.log('🔄 SSO page effect running...');
    console.log('  isLoaded:', isLoaded);
    console.log('  isSignedIn:', isSignedIn);
    console.log('  hasNavigated:', hasNavigated.current);
    
    handleNavigation();
  }, [handleNavigation, isLoaded, isSignedIn]);

  // EFFECT: Reset navigation guard on unmount (for dev hot reload)
  useEffect(() => {
    return () => {
      console.log('🔌 SSO page unmounting, resetting guard');
      hasNavigated.current = false;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator or support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authenticating...
          </h1>
          <p className="text-gray-600 mb-8">
            Verifying your credentials for DealerPro Desktop
          </p>

          {/* Loading Spinner */}
          <div className="flex justify-center mb-8">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>

          {/* Status Messages */}
          <div className="space-y-2 text-sm text-gray-500">
            {!isLoaded && <p>🔄 Loading authentication...</p>}
            {isLoaded && !isSignedIn && <p>🔐 Redirecting to sign in...</p>}
            {isLoaded && isSignedIn && <p>✅ Authenticated! Preparing desktop access...</p>}
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              🔒 This is a secure authentication request from DealerPro Desktop. 
              Your credentials are never shared with the desktop application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}