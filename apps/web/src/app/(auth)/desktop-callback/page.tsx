// app/desktop-callback/page.tsx - Refactored with stable callbacks and guards
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Copy, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DesktopCallbackPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  
  const [jwt, setJwt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle');
  
  // Dev mode check
  const isDevMode = process.env.NODE_ENV !== 'production';

  // Freeze state on mount
  const [frozenState] = useState(() => searchParams.get('state'));
  
  // Single-flight guards
  const tokenGenerationInFlight = useRef(false);
  const tokenGenerated = useRef(false);
  const deepLinkAttempted = useRef(false);
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);

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
      
      // Start auto-close timer (1 minute)
      autoCloseTimer.current = setTimeout(() => {
        console.log('⏰ Auto-closing page after 1 minute');
        window.close();
      }, 60000);
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
      
      // Clear auto-close timer
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
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
      // Clear existing timer
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
      
      // Reset the guard to allow retry
      deepLinkAttempted.current = false;
      attemptDeepLink(jwt, frozenState);
    }
  }, [jwt, frozenState, attemptDeepLink]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Please close this window and try again from the desktop app.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (!jwt || status === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <CardTitle>Preparing Authentication...</CardTitle>
            <CardDescription>
              Generating secure token for desktop app
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              This should only take a moment
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="max-w-lg w-full space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Authentication Successful!</CardTitle>
            <CardDescription>
              You can now return to DealerPro Desktop
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">Browser Prompt</p>
                  <p className="text-sm text-muted-foreground">
                    Your browser should have prompted you to &quot;Open DealerPro Desktop&quot;. 
                    If you clicked <strong>Open</strong>, you&apos;re all set!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">Didn&apos;t See a Prompt?</p>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to try again, or check if DealerPro Desktop is already open.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={retryDeepLink}
                className="w-full"
                size="lg"
              >
                <ExternalLink className="size-4" />
                Open in DealerPro Desktop
              </Button>

              {/* Dev-only copy token button */}
              {isDevMode && (
                <Button
                  onClick={copyToken}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="size-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy Token (Dev Mode)
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Token Display (dev mode only, collapsed by default) */}
            {isDevMode && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Show authentication token (dev mode only)
                </summary>
                <div className="mt-3 p-3 bg-muted rounded-md border">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {jwt}
                  </p>
                </div>
              </details>
            )}

            {/* Security Notice */}
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                This token will expire in 5 minutes. Do not share it with anyone.
                This window will auto-close in 1 minute or you can close it manually.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Having trouble?{' '}
            <a
              href="mailto:support@dealerpro.com"
              className="text-primary hover:text-primary/90 font-medium underline-offset-4 hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}