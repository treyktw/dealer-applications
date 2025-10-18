// app/desktop-callback/page.tsx - Refactored with stable callbacks and guards
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle');

  // Freeze state on mount
  const [frozenState] = useState(() => searchParams.get('state'));
  
  // Single-flight guards
  const tokenGenerationInFlight = useRef(false);
  const tokenGenerated = useRef(false);
  const deepLinkAttempted = useRef(false);

  // STABLE CALLBACK: Attempt deep link
  const attemptDeepLink = useCallback((token: string, state: string) => {
    if (deepLinkAttempted.current) {
      console.log('⚠️ Deep link already attempted, skipping');
      return;
    }

    try {
      const deepLink = `dealer-sign://auth/callback?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`;
      console.log('🔗 Attempting deep link:', deepLink.substring(0, 80) + '...');
      
      // Critical line - triggers browser to ask "Open DealerPro Desktop?"
      window.location.href = deepLink;
      
      deepLinkAttempted.current = true;
      console.log('✅ Deep link triggered - browser should prompt to open app');
      
      // Clean up URL to prevent re-triggering on refresh
      window.history.replaceState(null, '', '/desktop-callback?done=1');
    } catch (err) {
      console.error('❌ Failed to trigger deep link:', err);
    }
  }, []);

  // STABLE CALLBACK: Generate JWT
  const generateJWT = useCallback(async () => {
    // Guard: prevent concurrent or duplicate generation
    if (tokenGenerationInFlight.current || tokenGenerated.current) {
      console.log('⚠️ Token generation already in progress or completed');
      return;
    }

    // Validate all preconditions BEFORE starting
    if (!isLoaded) {
      console.log('⏳ Waiting for Clerk to load...');
      return;
    }
    
    if (!isSignedIn || !user) {
      console.error('❌ Not authenticated');
      setError('Not authenticated. Please sign in first.');
      return;
    }

    if (!frozenState) {
      console.error('❌ Missing state parameter');
      setError('Invalid request - missing state parameter');
      return;
    }

    // All checks passed - proceed with generation
    tokenGenerationInFlight.current = true;
    setStatus('generating');

    try {
      console.log('🔐 Generating JWT with desktop-app template...');
      console.log('  User:', user.primaryEmailAddress?.emailAddress);
      console.log('  State:', frozenState.substring(0, 10) + '...');
      
      // Get JWT token from Clerk using the desktop-app template
      const token = await getToken({ template: 'desktop-app' });
      
      if (!token) {
        throw new Error('Failed to generate authentication token');
      }

      console.log('✅ JWT generated successfully');
      console.log('  Token length:', token.length);
      console.log('  Token preview:', token.substring(0, 30) + '...');
      
      setJwt(token);
      tokenGenerated.current = true;
      setStatus('success');

      // Automatically attempt deep link once
      console.log('📱 Auto-triggering deep link...');
      attemptDeepLink(token, frozenState);
      
    } catch (err) {
      console.error('❌ JWT generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate token');
      setStatus('idle');
    } finally {
      tokenGenerationInFlight.current = false;
    }
  }, [isLoaded, isSignedIn, user, frozenState, getToken, attemptDeepLink]);

  // EFFECT: Trigger JWT generation when ready
  // Uses a "transition watcher" pattern - only runs when we go from not-ready to ready
  const wasReady = useRef(false);
  useEffect(() => {
    const ready = isLoaded && isSignedIn && !!user && !!frozenState;
    
    // Only act on false → true transition
    if (ready && !wasReady.current) {
      console.log('✅ All conditions met, generating JWT...');
      wasReady.current = true;
      generateJWT();
    }
  }, [isLoaded, isSignedIn, user, frozenState, generateJWT]);

  // EFFECT: Reset guards on unmount (for dev hot reload)
  useEffect(() => {
    return () => {
      console.log('🔌 Callback page unmounting, resetting guards');
      tokenGenerationInFlight.current = false;
      tokenGenerated.current = false;
      deepLinkAttempted.current = false;
      wasReady.current = false;
    };
  }, []);

  // STABLE CALLBACK: Copy token
  const copyToken = useCallback(() => {
    if (jwt) {
      navigator.clipboard.writeText(jwt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [jwt]);

  // STABLE CALLBACK: Manual retry deep link
  const retryDeepLink = useCallback(() => {
    if (jwt && frozenState) {
      // Reset the guard to allow retry
      deepLinkAttempted.current = false;
      attemptDeepLink(jwt, frozenState);
    }
  }, [jwt, frozenState, attemptDeepLink]);

  // Error state
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

  // Loading state
  if (!jwt || status === 'generating') {
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
            <p className="text-sm text-gray-500 mt-4">
              This should only take a moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
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
                  Your browser should have prompted you to &quot;Open DealerPro Desktop&quot;. 
                  If you clicked <strong>Open</strong>, you&apos;re all set!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Didn&apos;t See a Prompt?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Click the button below to try again, or check if DealerPro Desktop is already open.
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