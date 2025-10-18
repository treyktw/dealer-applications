// src/lib/auth/AuthContext.tsx - Desktop Auth with Clerk JWT
import type React from 'react';
import { createContext, useContext, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { convexAction, convexMutation, convexQuery, setConvexAuth } from '@/lib/convex';
import { api } from '@dealer/convex';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

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
  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  
  // Actions
  initiateLogin: () => Promise<{ authUrl: string; state: string }>;
  handleAuthCallback: (token: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure storage helpers using Tauri
const STORAGE_KEY = 'dealer_auth_token';
const STATE_KEY = 'oauth_state';

async function getStoredToken(): Promise<string | null> {
  try {
    console.log('🔐 Getting stored token from keyring...');
    const token = await invoke<string | null>('retrieve_secure', { key: STORAGE_KEY });
    console.log('🔐 Token retrieved:', token ? 'Found' : 'Not found');
    return token;
  } catch (error) {
    console.error('❌ Failed to get stored token:', error);
    return null;
  }
}

async function storeToken(token: string): Promise<void> {
  try {
    console.log('💾 Storing token in keyring...');
    await invoke('store_secure', { key: STORAGE_KEY, value: token });
    
    // Add delay to ensure keyring write completes
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Verify storage
    const verify = await invoke<string | null>('retrieve_secure', { key: STORAGE_KEY });
    if (!verify || verify !== token) {
      throw new Error('Token verification failed after storage');
    }
    
    console.log('✅ Token stored and verified in keyring');
  } catch (error) {
    console.error('❌ Failed to store token:', error);
    throw error;
  }
}

async function removeToken(): Promise<void> {
  try {
    console.log('🗑️  Removing token from keyring...');
    await invoke('remove_secure', { key: STORAGE_KEY });
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ Token removed from keyring');
  } catch (error) {
    console.error('❌ Failed to remove token:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Load token from secure storage on mount
  const { data: storedToken, isLoading: tokenLoading } = useQuery({
    queryKey: ['stored-token'],
    queryFn: async () => {
      console.log('🔄 Loading token from storage...');
      const token = await getStoredToken();
      if (token) {
        setConvexAuth(token);
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
        console.log('⚠️  No stored token, skipping validation');
        return null;
      }
      
      console.log('🔍 Validating session with Convex...');
      
      try {
        // Use the desktopAuth.validateSession query
        const result = await convexQuery(api.api.desktopAuth.validateSession, {
          token: storedToken,
        });
        
        if (result) {
          console.log('✅ Session valid:', result.user.email);
          setConvexAuth(storedToken);
          return result;
        } else {
          console.log('❌ Session invalid or expired');
          await removeToken();
          queryClient.setQueryData(['stored-token'], null);
          setConvexAuth(null);
          return null;
        }
      } catch (error) {
        console.error('❌ Session validation error:', error);
        await removeToken();
        queryClient.setQueryData(['stored-token'], null);
        setConvexAuth(null);
        return null;
      }
    },
    enabled: !!storedToken && !tokenLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Mutation to handle auth callback
  const handleAuthCallbackMutation = useMutation({
    mutationFn: async ({ clerkJwt, state }: { clerkJwt: string; state: string }) => {
      console.log('🔄 Processing Clerk JWT...');
      
      // Call Convex to validate JWT and create session
      const result = await convexAction(api.api.desktopAuth.validateDesktopAuth, {
        clerkJwt,
        state,
      });
      
      return result;
    },
    onSuccess: async (data) => {
      console.log('✅ Auth successful:', data.user.email);
      
      // Store session token in keyring
      try {
        await storeToken(data.session.token);
        console.log('✅ Token stored successfully');
      } catch (error) {
        console.error('❌ Failed to store token:', error);
        toast.error('Failed to save session', {
          description: 'Please try logging in again.',
        });
        throw error;
      }
      
      // Update React Query cache
      queryClient.setQueryData(['stored-token'], data.session.token);
      setConvexAuth(data.session.token);
      
      // Invalidate session query to refetch
      queryClient.invalidateQueries({ queryKey: ['auth-session'] });
      
      toast.success('Welcome back!', {
        description: `Signed in as ${data.user.email}`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ Auth callback failed:', error);
      toast.error('Authentication failed', {
        description: error.message || 'Please try again.',
      });
    },
  });

  // Handle auth callback from deep link
  const handleAuthCallback = useCallback(async (event: Event) => {
    const customEvent = event as CustomEvent<{ token: string; state: string }>;
    const { token, state } = customEvent.detail;
    
    console.log('🔐 Auth callback received from deep link');
    
    // Verify state matches (CSRF protection)
    const storedState = sessionStorage.getItem(STATE_KEY);
    if (!storedState || storedState !== state) {
      console.error('❌ State mismatch - potential CSRF attack');
      toast.error('Authentication failed', {
        description: 'Security check failed. Please try again.',
      });
      return;
    }
    
    console.log('✅ State verified');
    sessionStorage.removeItem(STATE_KEY);
    
    // Process the Clerk JWT
    await handleAuthCallbackMutation.mutateAsync({ clerkJwt: token, state });
  }, [handleAuthCallbackMutation]);

  const handleAuthError = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ error: string }>;
    console.error('❌ Auth callback error:', customEvent.detail.error);
    toast.error('Authentication failed', {
      description: customEvent.detail.error,
    });
  }, []);

  // Set up event listeners with proper dependencies
  useEffect(() => {
    window.addEventListener('auth-callback', handleAuthCallback);
    window.addEventListener('auth-callback-error', handleAuthError);
    
    return () => {
      window.removeEventListener('auth-callback', handleAuthCallback);
      window.removeEventListener('auth-callback-error', handleAuthError);
    };
  }, [handleAuthCallback, handleAuthError]);

  // Initiate login - opens browser
  const initiateLogin = async (): Promise<{ authUrl: string; state: string }> => {
    console.log('🚀 Initiating login...');
    
    // Generate CSRF state token
    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);
    
    // Production web URL
    // const webUrl = "https://dealer.universalautobrokers.net";
    // For development: "http://localhost:3000"
    const webUrl = "http://localhost:3000";
    const authUrl = `${webUrl}/desktop-sso?state=${state}`;
    
    console.log('🌐 Auth URL:', authUrl);
    
    // Open in system browser
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(authUrl);
      console.log('✅ Browser opened');
      
      toast.success('Complete sign-in in your browser', {
        description: 'You\'ll be redirected back automatically.',
        duration: 5000,
      });
    } catch (error) {
      console.error('❌ Failed to open browser:', error);
      toast.error('Failed to open browser', {
        description: 'Please try again.',
      });
      throw error;
    }
    
    return { authUrl, state };
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!storedToken) return;
      console.log('🚪 Logging out...');
      return await convexMutation(api.api.desktopAuth.logout, { token: storedToken });
    },
    onSuccess: async () => {
      console.log('✅ Logout successful');
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
      console.log('🚪 Logging out from all devices...');
      return await convexMutation(api.api.desktopAuth.logoutAllDevices, { token: storedToken });
    },
    onSuccess: async () => {
      console.log('✅ Logged out from all devices');
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
      console.log('🔄 Refreshing session...');
      return await convexMutation(api.api.desktopAuth.refreshSession, { token: storedToken });
    },
    retry: false,
    onSuccess: () => {
      console.log('✅ Session refreshed');
      queryClient.invalidateQueries({ queryKey: ['auth-session'] });
      toast.success('Session extended');
    },
    onError: async (error: Error) => {
      console.error('❌ Session refresh failed:', error);
      
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

  console.log('🔐 Auth state:', {
    tokenLoading,
    sessionLoading,
    hasToken: !!storedToken,
    hasSessionData: !!sessionData,
    isLoading,
    isAuthenticated: !!sessionData?.user,
  });

  const value: AuthContextType = {
    isLoading,
    isAuthenticated: !!sessionData?.user,
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