// src/lib/auth/AuthContext.tsx - Refactored with useCallback for stable handlers
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexAction, convexMutation, convexQuery, setConvexAuth } from '@/lib/convex';
import { api } from '@dealer/convex';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

// Import the logging function
import { addAuthLog } from '@/routes/login';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  dealershipId?: string;
  image?: string;
  subscriptionStatus?: string;
}

interface Session {
  token: string;
  expiresAt: number;
}

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  
  initiateLogin: () => Promise<{ authUrl: string; state: string }>;
  handleAuthCallback: (token: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure storage helpers
const STORAGE_KEY = 'dealer_auth_token';
const STATE_KEY = 'oauth_state';

async function getStoredToken(): Promise<string | null> {
  try {
    addAuthLog('🔑 Retrieving token from keyring...', 'info');
    const token = await invoke<string | null>('retrieve_secure', { key: STORAGE_KEY });
    
    if (token) {
      addAuthLog(`✅ Token found in keyring (${token.length} chars)`, 'success');
    } else {
      addAuthLog('⚠️ No token found in keyring', 'warning');
    }
    
    return token;
  } catch (error) {
    addAuthLog(`❌ Keyring retrieval error: ${error}`, 'error');
    return null;
  }
}

async function storeToken(token: string): Promise<void> {
  try {
    addAuthLog('💾 Storing token in keyring...', 'info');
    addAuthLog(`   Token length: ${token.length} chars`, 'info');
    
    await invoke('store_secure', { key: STORAGE_KEY, value: token });
    
    addAuthLog('⏳ Waiting 300ms for keyring write...', 'info');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addAuthLog('🔍 Verifying token storage...', 'info');
    const verify = await invoke<string | null>('retrieve_secure', { key: STORAGE_KEY });
    
    if (!verify) {
      addAuthLog('❌ Verification failed: Token not found after storage', 'error');
      throw new Error('Token verification failed after storage');
    }
    
    if (verify !== token) {
      addAuthLog('❌ Verification failed: Token mismatch', 'error');
      addAuthLog(`   Expected: ${token.substring(0, 20)}...`, 'error');
      addAuthLog(`   Got: ${verify.substring(0, 20)}...`, 'error');
      throw new Error('Token verification failed - mismatch');
    }
    
    addAuthLog('✅ Token stored and verified successfully', 'success');
  } catch (error) {
    addAuthLog(`❌ Token storage failed: ${error}`, 'error');
    throw error;
  }
}

async function removeToken(): Promise<void> {
  try {
    addAuthLog('🗑️ Removing token from keyring...', 'info');
    await invoke('remove_secure', { key: STORAGE_KEY });
    await new Promise(resolve => setTimeout(resolve, 100));
    addAuthLog('✅ Token removed', 'success');
  } catch (error) {
    addAuthLog(`❌ Token removal error: ${error}`, 'error');
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  // Use ref to track if listeners are registered (prevents double registration)
  const listenersRegistered = useRef(false);

  // Log provider mount (once)
  useEffect(() => {
    addAuthLog('═══ AuthProvider Mounted ═══', 'info');
    addAuthLog('🔧 Convex URL: ' + (import.meta.env.VITE_CONVEX_URL || 'NOT SET'), 'info');
  }, []);

  // Load token from secure storage on mount
  const { data: storedToken, isLoading: tokenLoading } = useQuery({
    queryKey: ['stored-token'],
    queryFn: async () => {
      addAuthLog('═══ Loading Stored Token ═══', 'info');
      const token = await getStoredToken();
      
      if (token) {
        addAuthLog('🔐 Setting token in Convex client', 'info');
        setConvexAuth(token);
      } else {
        addAuthLog('⚠️ No stored token, user needs to login', 'warning');
      }
      
      return token;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Validate session with Convex
  const {
    data: sessionData,
    isLoading: sessionLoading,
  } = useQuery({
    queryKey: ['auth-session', storedToken],
    queryFn: async () => {
      if (!storedToken) {
        addAuthLog('⏭️ Skipping session validation (no token)', 'info');
        return null;
      }
      
      addAuthLog('═══ Validating Session with Convex ═══', 'info');
      addAuthLog(`🔍 Token preview: ${storedToken.substring(0, 20)}...`, 'info');
      
      try {
        addAuthLog('📡 Calling desktopAuth.validateSession...', 'info');
        
        const result = await convexQuery(api.api.desktopAuth.validateSession, {
          token: storedToken,
        });
        
        if (result) {
          addAuthLog('✅ Session is VALID', 'success');
          addAuthLog(`   User: ${result.user.email}`, 'success');
          addAuthLog(`   Role: ${result.user.role}`, 'success');
          addAuthLog(`   Dealership: ${result.dealership?.name || 'None'}`, 'success');
          addAuthLog(`   Expires: ${new Date(result.session.expiresAt).toLocaleString()}`, 'success');
          
          setConvexAuth(storedToken);
          return result;
        } else {
          addAuthLog('❌ Session validation returned null', 'error');
          addAuthLog('🗑️ Removing invalid token', 'warning');
          
          await removeToken();
          queryClient.setQueryData(['stored-token'], null);
          setConvexAuth(null);
          return null;
        }
      } catch (error) {
        addAuthLog(`❌ Session validation ERROR: ${error}`, 'error');
        addAuthLog(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`, 'error');
        addAuthLog(`   Error message: ${error instanceof Error ? error.message : String(error)}`, 'error');
        
        await removeToken();
        queryClient.setQueryData(['stored-token'], null);
        setConvexAuth(null);
        return null;
      }
    },
    enabled: !!storedToken && !tokenLoading,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Mutation to handle auth callback
  const handleAuthCallbackMutation = useMutation({
    mutationFn: async ({ clerkJwt, state }: { clerkJwt: string; state: string }) => {
      addAuthLog('═══ validateDesktopAuth Mutation ═══', 'info');
      addAuthLog(`📡 Calling Convex with JWT (${clerkJwt.length} chars)`, 'info');
      
      try {
        const result = await convexAction(api.api.desktopAuth.validateDesktopAuth, {
          clerkJwt,
          state,
        });
        
        addAuthLog('✅ Convex returned successfully', 'success');
        addAuthLog(`   User: ${result.user.email}`, 'success');
        addAuthLog(`   Session token: ${result.session.token.substring(0, 20)}...`, 'success');
        addAuthLog(`   Expires: ${new Date(result.session.expiresAt).toLocaleString()}`, 'success');
        
        return result;
      } catch (error) {
        addAuthLog(`❌ Convex call FAILED: ${error}`, 'error');
        throw error;
      }
    },
    onSuccess: async (data) => {
      addAuthLog('═══ Auth Success Handler ═══', 'success');
      addAuthLog(`✅ User authenticated: ${data.user.email}`, 'success');
      
      // Store session token in keyring
      try {
        await storeToken(data.session.token);
      } catch (error) {
        addAuthLog(`❌ Failed to store token: ${error}`, 'error');
        toast.error('Failed to save session', {
          description: 'Please try logging in again.',
        });
        throw error;
      }
      
      // Update React Query cache
      addAuthLog('💾 Updating React Query cache...', 'info');
      queryClient.setQueryData(['stored-token'], data.session.token);
      setConvexAuth(data.session.token);
      
      // Invalidate session query to refetch
      addAuthLog('🔄 Invalidating session query...', 'info');
      queryClient.invalidateQueries({ queryKey: ['auth-session'] });
      
      addAuthLog('═══ Login Complete! ═══', 'success');
      toast.success('Welcome back!', {
        description: `Signed in as ${data.user.email}`,
      });
    },
    onError: (error: Error) => {
      addAuthLog('═══ Auth Error Handler ═══', 'error');
      addAuthLog(`❌ Error: ${error.message}`, 'error');
      
      toast.error('Authentication failed', {
        description: error.message || 'Please try again.',
      });
    },
  });

  // STABLE CALLBACK: Handle auth callback event
  // This won't be recreated on every render, only when mutation changes
  const handleAuthCallback = useCallback(async (event: Event) => {
    addAuthLog('═══════════════════════════════════', 'info');
    addAuthLog('🔗 AUTH CALLBACK EVENT RECEIVED!', 'success');
    addAuthLog('═══════════════════════════════════', 'info');
    
    const customEvent = event as CustomEvent<{ token: string; state: string }>;
    const { token, state } = customEvent.detail;
    
    addAuthLog(`📦 Token length: ${token?.length || 0}`, 'info');
    addAuthLog(`📦 State length: ${state?.length || 0}`, 'info');
    addAuthLog(`🔍 Token preview: ${token?.substring(0, 30)}...`, 'info');
    addAuthLog(`🔍 State preview: ${state?.substring(0, 20)}...`, 'info');
    
    // Verify state matches (CSRF protection)
    addAuthLog('🔐 Verifying CSRF state...', 'info');
    const storedState = sessionStorage.getItem(STATE_KEY);
    
    addAuthLog(`   Stored state: ${storedState?.substring(0, 20)}...`, 'info');
    addAuthLog(`   Received state: ${state?.substring(0, 20)}...`, 'info');
    
    if (!storedState || storedState !== state) {
      addAuthLog('❌ STATE MISMATCH - CSRF attack detected!', 'error');
      addAuthLog(`   Expected: ${storedState}`, 'error');
      addAuthLog(`   Got: ${state}`, 'error');
      
      toast.error('Authentication failed', {
        description: 'Security check failed. Please try again.',
      });
      return;
    }
    
    addAuthLog('✅ State verified successfully', 'success');
    sessionStorage.removeItem(STATE_KEY);
    
    // Process the Clerk JWT
    addAuthLog('🚀 Processing Clerk JWT...', 'info');
    await handleAuthCallbackMutation.mutateAsync({ clerkJwt: token, state });
  }, [handleAuthCallbackMutation]);

  // STABLE CALLBACK: Handle auth error event
  const handleAuthError = useCallback((event: Event) => {
    addAuthLog('═══════════════════════════════════', 'error');
    addAuthLog('❌ AUTH CALLBACK ERROR EVENT!', 'error');
    addAuthLog('═══════════════════════════════════', 'error');
    
    const customEvent = event as CustomEvent<{ error: string }>;
    addAuthLog(`Error: ${customEvent.detail.error}`, 'error');
    
    toast.error('Authentication failed', {
      description: customEvent.detail.error,
    });
  }, []);

  // EFFECT: Register event listeners ONCE with stable callbacks
  // This will only run once on mount because callbacks are stable
  useEffect(() => {
    // Prevent double registration in dev mode (React Strict Mode)
    if (listenersRegistered.current) {
      addAuthLog('⚠️ Listeners already registered, skipping', 'warning');
      return;
    }

    addAuthLog('🎧 Registering deep link event listeners', 'info');
    
    window.addEventListener('auth-callback', handleAuthCallback);
    window.addEventListener('auth-callback-error', handleAuthError);
    
    listenersRegistered.current = true;
    addAuthLog('✅ Event listeners registered', 'success');
    
    return () => {
      addAuthLog('🔌 Cleaning up auth event listeners', 'info');
      window.removeEventListener('auth-callback', handleAuthCallback);
      window.removeEventListener('auth-callback-error', handleAuthError);
      listenersRegistered.current = false;
    };
  }, [handleAuthCallback, handleAuthError]); // Only re-run if callbacks change (they won't)

  // Initiate login - opens browser
  const initiateLogin = useCallback(async (): Promise<{ authUrl: string; state: string }> => {
    addAuthLog('═══════════════════════════════════', 'info');
    addAuthLog('🚀 INITIATE LOGIN CALLED', 'info');
    addAuthLog('═══════════════════════════════════', 'info');
    
    // Generate CSRF state token
    addAuthLog('🔐 Generating CSRF state token...', 'info');
    const state = crypto.randomUUID();
    addAuthLog(`   State: ${state.substring(0, 20)}...`, 'info');
    
    sessionStorage.setItem(STATE_KEY, state);
    addAuthLog('✅ State stored in sessionStorage', 'success');
    
    // Production web URL
    const webUrl = "https://dealer.universalautobrokers.net";
    // For development: "http://localhost:3000"
    
    const authUrl = `${webUrl}/desktop-sso?state=${state}`;
    
    addAuthLog(`🌐 Auth URL: ${authUrl}`, 'info');
    
    // Open in system browser
    try {
      addAuthLog('📱 Opening system browser...', 'info');
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(authUrl);
      
      addAuthLog('✅ Browser opened successfully', 'success');
      
      toast.success('Complete sign-in in your browser', {
        description: 'You\'ll be redirected back automatically.',
        duration: 5000,
      });
    } catch (error) {
      addAuthLog(`❌ Failed to open browser: ${error}`, 'error');
      toast.error('Failed to open browser', {
        description: 'Please try again.',
      });
      throw error;
    }
    
    addAuthLog('⏳ Waiting for browser callback...', 'info');
    return { authUrl, state };
  }, []); // No dependencies, completely stable

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!storedToken) return;
      addAuthLog('═══ Logout Started ═══', 'info');
      return await convexMutation(api.api.desktopAuth.logout, { token: storedToken });
    },
    onSuccess: async () => {
      addAuthLog('✅ Logout successful', 'success');
      await removeToken();
      queryClient.setQueryData(['stored-token'], null);
      setConvexAuth(null);
      queryClient.clear();
      toast.success('Signed out successfully');
    },
  });

  // Logout all devices mutation
  const logoutAllDevicesMutation = useMutation({
    mutationFn: async () => {
      if (!storedToken) return;
      addAuthLog('═══ Logout All Devices ═══', 'info');
      return await convexMutation(api.api.desktopAuth.logoutAllDevices, { token: storedToken });
    },
    onSuccess: async () => {
      addAuthLog('✅ Logged out from all devices', 'success');
      await removeToken();
      queryClient.setQueryData(['stored-token'], null);
      setConvexAuth(null);
      queryClient.clear();
      toast.success('Signed out from all devices');
    },
  });

  // Refresh session mutation
  const refreshSessionMutation = useMutation({
    mutationFn: async () => {
      if (!storedToken) throw new Error('No session token');
      addAuthLog('═══ Refreshing Session ═══', 'info');
      return await convexMutation(api.api.desktopAuth.refreshSession, { token: storedToken });
    },
    retry: false,
    onSuccess: () => {
      addAuthLog('✅ Session refreshed', 'success');
      queryClient.invalidateQueries({ queryKey: ['auth-session'] });
      toast.success('Session extended');
    },
    onError: async (error: Error) => {
      addAuthLog(`❌ Session refresh failed: ${error.message}`, 'error');
      
      if (error?.message?.includes('expired')) {
        toast.error('Session expired', {
          description: 'Please log in again.',
        });
        await removeToken();
        queryClient.setQueryData(['stored-token'], null);
        setConvexAuth(null);
        queryClient.clear();
      }
    },
  });

  // Calculate loading state
  const isLoading = tokenLoading || (!!storedToken && sessionLoading);
  const isAuthenticated = !!sessionData?.user;

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    user: sessionData?.user || null,
    session: sessionData?.session || null,
    
    initiateLogin,
    handleAuthCallback: async (token: string, state: string) => {
      await handleAuthCallbackMutation.mutateAsync({ clerkJwt: token, state });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    logoutAllDevices: async () => {
      await logoutAllDevicesMutation.mutateAsync();
    },
    refreshSession: async () => {
      await refreshSessionMutation.mutateAsync();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}