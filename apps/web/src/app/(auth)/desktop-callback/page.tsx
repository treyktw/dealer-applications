// app/desktop-callback/page.tsx - Generates JWT and triggers deep link back to desktop
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Copy, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

export default function DesktopCallbackPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  
  const [jwt, setJwt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLinkAttempted, setAutoLinkAttempted] = useState(false);

  const state = searchParams.get('state');

  const attemptDeepLink = useCallback((token: string, state: string) => {
    try {
      const deepLink = `dealer-sign://auth/callback?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`;
      console.log('🔗 Attempting deep link:', deepLink);
      
      // Try to trigger deep link
      window.location.href = deepLink;
      
      console.log('✅ Deep link triggered - browser will prompt to open app');
    } catch (err) {
      console.error('❌ Failed to trigger deep link:', err);
    }
  }, []);

  const generateJWT = useCallback(async () => {
    if (!isLoaded) return;
    
    if (!isSignedIn || !user) {
      setError('Not authenticated. Please sign in first.');
      return;
    }

    if (!state) {
      setError('Invalid request - missing state parameter');
      return;
    }

    try {
      // Get JWT token from Clerk using the desktop-app template
      console.log('🔐 Generating JWT with desktop-app template...');
      const token = await getToken({ template: 'desktop-app' });
      
      if (!token) {
        throw new Error('Failed to generate authentication token');
      }

      console.log('✅ JWT generated successfully');
      setJwt(token);

      // Automatically attempt deep link
      if (!autoLinkAttempted) {
        setAutoLinkAttempted(true);
        attemptDeepLink(token, state);
      }
    } catch (err) {
      console.error('❌ JWT generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate token');
    }
  }, [isLoaded, isSignedIn, user, state, getToken, autoLinkAttempted, attemptDeepLink]);

  useEffect(() => {
    generateJWT();
  }, [generateJWT]);

  const copyToken = useCallback(() => {
    if (jwt) {
      navigator.clipboard.writeText(jwt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [jwt]);

  const retryDeepLink = useCallback(() => {
    if (jwt && state) {
      attemptDeepLink(jwt, state);
    }
  }, [jwt, state, attemptDeepLink]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Please close this window and try again from the desktop app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!jwt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Preparing Authentication...
            </h1>
            <p className="text-gray-600">
              Generating secure token for desktop app
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Authentication Successful!
          </h1>
          <p className="text-gray-600 text-center mb-8">
            You can now return to DealerPro Desktop
          </p>

          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Browser Prompt</p>
                <p className="text-sm text-gray-600 mt-1">
                  Your browser should prompt you to &quot;Open DealerPro Desktop&quot;. Click <strong>Open</strong> or <strong>Allow</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Manual Return (if needed)</p>
                <p className="text-sm text-gray-600 mt-1">
                  If the prompt didn&apos;t appear, click the button below to try again.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={retryDeepLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open in DealerPro Desktop
            </button>

            <button
              type="button"
              onClick={copyToken}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Token (Manual Fallback)
                </>
              )}
            </button>
          </div>

          {/* Token Display (collapsed by default) */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Show authentication token (advanced)
            </summary>
            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs font-mono text-gray-600 break-all">
                {jwt}
              </p>
            </div>
          </details>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              🔒 This token will expire in 5 minutes. Do not share it with anyone.
              You can close this window after returning to the desktop app.
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Having trouble?{' '}
            <a
              href="mailto:support@dealerpro.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}