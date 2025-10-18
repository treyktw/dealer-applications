// src/routes/login.tsx - Split Screen Debug Version
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, LogIn, Shield, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { DeepLinkTester } from "@/components/deeplink-tester";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

// Global log store that both AuthContext and this component can write to
if (!(window as any).__authLogs) {
  (window as any).__authLogs = [];
}

export function addAuthLog(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const log = {
    timestamp,
    message,
    type,
    id: Date.now() + Math.random(),
  };
  
  (window as any).__authLogs.push(log);
  
  // Also log to console with emoji
  const emoji = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type];
  
  console.log(`${emoji} [${timestamp}] ${message}`);
  
  // Trigger update event
  window.dispatchEvent(new CustomEvent('auth-log-update'));
}

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, initiateLogin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  // Listen for log updates
  useEffect(() => {
    const updateLogs = () => {
      setLogs([...(window as any).__authLogs]);
    };
    
    window.addEventListener('auth-log-update', updateLogs);
    updateLogs(); // Initial load
    
    return () => {
      window.removeEventListener('auth-log-update', updateLogs);
    };
  }, []);

  // Log component mount
  useEffect(() => {
    addAuthLog('Login page mounted', 'info');
    addAuthLog(`Auth state: authenticated=${isAuthenticated}, loading=${isLoading}`, 'info');
  }, [isAuthenticated, isLoading]);

  // Log auth state changes
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      addAuthLog('User is authenticated, redirecting to dashboard...', 'success');
      navigate({ to: "/" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async () => {
    addAuthLog('─── Sign In Button Clicked ───', 'info');
    try {
      addAuthLog('Calling initiateLogin()...', 'info');
      await initiateLogin();
      addAuthLog('initiateLogin() completed', 'success');
    } catch (error) {
      addAuthLog(`Login initiation failed: ${error}`, 'error');
      console.error("Login initiation failed:", error);
    }
  };

  const clearLogs = () => {
    (window as any).__authLogs = [];
    setLogs([]);
    addAuthLog('Logs cleared', 'info');
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
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Left Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          {/* Deep Link Tester - Debug Tool */}
          <DeepLinkTester />
          
          {/* Main Login Card */}
          <Card className="w-full shadow-2xl border-0">
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
      </div>

      {/* Right Side - Live Logs */}
      <div className="w-1/2 p-6 flex flex-col">
        <div className="bg-gray-900 rounded-lg shadow-2xl flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <h3 className="text-white font-mono text-sm font-bold">
                Authentication Logs
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-mono">
                {logs.length} events
              </span>
              <button
                type="button"
                onClick={clearLogs}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-mono"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
              >
                {showLogs ? <X className="w-4 h-4" /> : '📋'}
              </button>
            </div>
          </div>

          {/* Logs Content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <div>No logs yet. Click "Sign in" to start.</div>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex gap-2 py-1 px-2 rounded ${
                    log.type === 'error'
                      ? 'bg-red-900/20 text-red-300'
                      : log.type === 'success'
                      ? 'bg-green-900/20 text-green-300'
                      : log.type === 'warning'
                      ? 'bg-yellow-900/20 text-yellow-300'
                      : 'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500 flex-shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span
                    className={`flex-shrink-0 ${
                      log.type === 'error'
                        ? 'text-red-400'
                        : log.type === 'success'
                        ? 'text-green-400'
                        : log.type === 'warning'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {log.type === 'error'
                      ? '❌'
                      : log.type === 'success'
                      ? '✅'
                      : log.type === 'warning'
                      ? '⚠️'
                      : 'ℹ️'}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Auto-scroll indicator */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 text-center">
            <span className="text-gray-500 text-xs font-mono">
              Auto-scrolling • Press Ctrl+C to copy logs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}