// app/desktop-sso/page.tsx - Initiates desktop authentication flow
'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';

export default function DesktopSSOPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const state = searchParams.get('state');

  useEffect(() => {
    // Validate state parameter exists (CSRF protection)
    if (!state) {
      setError('Invalid authentication request - missing state parameter');
      return;
    }

    // Once Clerk is loaded and user is signed in, redirect to callback
    if (isLoaded && isSignedIn && user) {
      console.log('✅ User authenticated, redirecting to callback...');
      
      // Check if user has desktop access
      const publicMetadata = user.publicMetadata as {
        dealersoftwareAccess?: boolean;
        accountActive?: boolean;
      };

      if (!publicMetadata.dealersoftwareAccess) {
        setError('Desktop app access not enabled for your account');
        return;
      }

      if (!publicMetadata.accountActive) {
        setError('Your account is not active');
        return;
      }

      // Redirect to callback page which will generate JWT
      router.push(`/desktop-callback?state=${encodeURIComponent(state)}`);
    } else if (isLoaded && !isSignedIn) {
      // User not signed in, redirect to sign-in page
      console.log('❌ User not signed in, redirecting to sign-in...');
      const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/desktop-sso?state=${state}`)}`;
      router.push(signInUrl);
    }
  }, [isLoaded, isSignedIn, user, state, router]);

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