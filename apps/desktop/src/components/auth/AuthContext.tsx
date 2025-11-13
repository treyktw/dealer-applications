// src/lib/auth/AuthContext.tsx - Fixed with Hybrid Secure Storage
import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  convexAction,
  convexMutation,
  convexQuery,
  setConvexAuth,
} from "@/lib/convex";
import { api } from "@dealer/convex";
import { toast } from "sonner";

// Import hybrid secure storage
import { storeToken, getStoredToken, removeToken } from "@/lib/storage";


// Types
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  dealershipId?: string;
  image?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
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
  token: string | null; // Expose the access token

  initiateLogin: () => Promise<{ authUrl: string; state: string }>;
  handleAuthCallback: (token: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// CSRF state storage
const STATE_KEY = "oauth_state";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Use ref to track if listeners are registered (prevents double registration)
  const listenersRegistered = useRef(false);

  // Helper function to clear auth state immediately
  const clearAuthState = useCallback(async () => {
    // Clear token first
    await removeToken();
    // Clear Convex auth immediately
    setConvexAuth(null);
    // Cancel all running queries
    queryClient.cancelQueries();
    // Clear all query data
    queryClient.clear();
    // Reset specific query data
    queryClient.setQueryData(["stored-token"], null);
    queryClient.setQueryData(["auth-session"], null);
  }, [queryClient]);

  // Load token from hybrid secure storage on mount
  const { data: storedToken, isLoading: tokenLoading } = useQuery({
    queryKey: ["stored-token"],
    queryFn: async () => {
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
    notifyOnChangeProps: ["data", "isLoading"], // Ensure reactivity
  });

  // Validate session with Convex
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-session", storedToken],
    queryFn: async () => {
      if (!storedToken) {
        return null;
      }

      try {
        const result = await convexQuery(api.api.desktopAuth.validateSession, {
          accessToken: storedToken,
        });

        if (result) {
          setConvexAuth(storedToken);
          console.log("🔍 Session validated:", {
            email: result.user?.email,
            userId: result.user?.id,
            dealershipId: result.user?.dealershipId,
            subscriptionStatus: result.user?.subscriptionStatus,
            subscriptionPlan: result.user?.subscriptionPlan,
            dealership: result.dealership,
          });
          
          // Ensure dealershipId is a string
          if (result.user?.dealershipId) {
            result.user.dealershipId = String(result.user.dealershipId);
          }
          
          // Ensure dealership id is a string
          if (result.dealership?.id) {
            result.dealership.id = String(result.dealership.id);
          }
          
          return result;
        } else {
          console.log("🔍 Session validation failed - clearing token");
          await clearAuthState();
          return null;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("🔍 Session validation error:", errorMessage);
        
        // Check if session is revoked or invalid
        if (
          errorMessage.includes("revoked") ||
          errorMessage.includes("Invalid or expired session") ||
          errorMessage.includes("Session not found")
        ) {
          console.log("🔍 Session revoked or invalid - clearing auth state");
          await clearAuthState();
          return null;
        }
        
        // For other errors, still clear the token
        await removeToken();
        queryClient.setQueryData(["stored-token"], null);
        setConvexAuth(null);
        return null;
      }
    },
    enabled: !!storedToken && !tokenLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes (was too long before)
    retry: false,
    notifyOnChangeProps: ["data", "isLoading"], // Ensure reactivity
  });

  // Mutation to handle auth callback
  const handleAuthCallbackMutation = useMutation({
    mutationFn: async ({
      clerkJwt,
      state,
    }: {
      clerkJwt: string;
      state: string;
    }) => {
      try {
        const result = await convexAction(
          api.api.desktopAuth.validateDesktopAuth,
          {
            clerkJwt,
            state,
          }
        );

        return result;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: async (data) => {
      // The backend returns accessToken, not token
      const accessToken = data.session.accessToken;
      
      if (!accessToken) {
        console.error("❌ No accessToken in session response");
        toast.error("Authentication failed", {
          description: "Invalid session response",
        });
        return;
      }

      try {
        await storeToken(accessToken);
      } catch (error) {
        console.error("❌ Failed to store token:", error);
        throw error;
      }

      // Set Convex auth immediately
      setConvexAuth(accessToken);
      
      // Set the token in the query cache - this will trigger the session query to refetch automatically
      // because the session query depends on storedToken in its query key
      queryClient.setQueryData(["stored-token"], accessToken);
      
      // REQUIREMENT: Must have dealership and subscription - validateDesktopAuth already checks this
      if (!data.user.dealershipId) {
        console.error("❌ No dealershipId in auth response");
        throw new Error("No dealership associated with account");
      }
      
      if (!data.dealership) {
        console.error("❌ No dealership data in auth response");
        throw new Error("Dealership data missing");
      }
      
      if (!data.user.subscriptionStatus || !data.user.subscriptionPlan) {
        console.error("❌ No subscription data in auth response");
        throw new Error("Subscription data missing");
      }

      // Set session data with the exact structure that validateSession returns
      // This ensures immediate reactivity - components will see the auth state change instantly
      const sessionData = {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          dealershipId: String(data.user.dealershipId), // Convert to string, required
          image: data.user.image,
          subscriptionStatus: data.user.subscriptionStatus, // Required
          subscriptionPlan: (data.user as { subscriptionPlan?: string }).subscriptionPlan, // Required
        },
        session: {
          id: data.session.sessionId, // Using sessionId as id for compatibility
          sessionId: data.session.sessionId,
          expiresAt: data.session.expiresAt,
          accessTokenExpiresAt: data.session.expiresAt,
        },
        dealership: {
          id: String(data.dealership.id), // Required, not null
          name: data.dealership.name,
        },
      };
      
      console.log("✅ Setting session data:", {
        userId: sessionData.user.id,
        email: sessionData.user.email,
        dealershipId: sessionData.user.dealershipId,
        subscriptionStatus: sessionData.user.subscriptionStatus,
        subscriptionPlan: sessionData.user.subscriptionPlan,
        dealership: sessionData.dealership,
      });
      
      queryClient.setQueryData(["auth-session", accessToken], sessionData);
      
      // Force a refetch in the background to ensure we have the latest data
      // This won't block the UI update since we've already set the data
      queryClient.refetchQueries({ 
        queryKey: ["auth-session", accessToken],
        exact: true 
      }).catch((err) => {
        console.warn("Background refetch failed (non-critical):", err);
      });

      console.log("✅ Authentication successful, session activated");

      toast.success("Welcome back!", {
        description: `Signed in as ${data.user.email}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Authentication failed", {
        description: error.message || "Please try again.",
      });
    },
  });

  // STABLE CALLBACK: Handle auth callback event
  const handleAuthCallback = useCallback(
    async (event: Event) => {
      const customEvent = event as CustomEvent<{
        token: string;
        state: string;
      }>;
      const { token, state } = customEvent.detail;

      // Verify state matches (CSRF protection)
      const storedState = sessionStorage.getItem(STATE_KEY);

      if (!storedState || storedState !== state) {
        toast.error("Authentication failed", {
          description: "Security check failed. Please try again.",
        });
        return;
      }

      sessionStorage.removeItem(STATE_KEY);
      await handleAuthCallbackMutation.mutateAsync({ clerkJwt: token, state });
    },
    [handleAuthCallbackMutation]
  );

  // STABLE CALLBACK: Handle auth error event
  const handleAuthError = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ error: string }>;

    toast.error("Authentication failed", {
      description: customEvent.detail.error,
    });
  }, []);

  // EFFECT: Register event listeners ONCE with stable callbacks
  useEffect(() => {
    // Prevent double registration in dev mode (React Strict Mode)
    if (listenersRegistered.current) {
      return;
    }

    window.addEventListener("auth-callback", handleAuthCallback);
    window.addEventListener("auth-callback-error", handleAuthError);

    listenersRegistered.current = true;

    return () => {
      window.removeEventListener("auth-callback", handleAuthCallback);
      window.removeEventListener("auth-callback-error", handleAuthError);
      listenersRegistered.current = false;
    };
  }, [handleAuthCallback, handleAuthError]);

  // Initiate login - opens browser
  const initiateLogin = useCallback(async (): Promise<{
    authUrl: string;
    state: string;
  }> => {
    // Generate CSRF state token
    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);

    // Determine web URL based on environment
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "development";
    const webUrl = isDevelopment
      ? "http://localhost:3000"
      : "https://dealer.universalautobrokers.net";
    const authUrl = `${webUrl}/desktop-sso?state=${state}`;

    // Open in system browser
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(authUrl);

      toast.success("Complete sign-in in your browser", {
        description: "You'll be redirected back automatically.",
        duration: 5000,
      });
    } catch (error) {
      toast.error("Failed to open browser", {
        description: "Please try again.",
      });
      throw error;
    }

    return { authUrl, state };
  }, []);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear state immediately (don't wait for backend)
      await clearAuthState();
      
      // Try to revoke session on backend (fire and forget)
      if (storedToken) {
        try {
          await convexMutation(api.api.desktopAuth.logout, {
            accessToken: storedToken,
          });
        } catch (error) {
          // Ignore errors - we've already cleared local state
          console.log("Logout backend call failed (ignored):", error);
        }
      }
    },
    onSuccess: () => {
      toast.success("Signed out successfully");
    },
  });

  // Logout all devices mutation
  const logoutAllDevicesMutation = useMutation({
    mutationFn: async () => {
      // Clear state immediately (don't wait for backend)
      await clearAuthState();
      
      // Try to revoke all sessions on backend (fire and forget)
      if (storedToken) {
        try {
          await convexMutation(api.api.desktopAuth.logoutAllDevices, {
            accessToken: storedToken,
          });
        } catch (error) {
          // Ignore errors - we've already cleared local state
          console.log("Logout all devices backend call failed (ignored):", error);
        }
      }
    },
    onSuccess: () => {
      toast.success("Signed out from all devices");
    },
  });

  // Refresh session mutation
  const refreshSessionMutation = useMutation({
    mutationFn: async () => {
      if (!storedToken) throw new Error("No session token");
      return await convexMutation(api.api.desktopAuth.refreshSession, {
        token: storedToken,
      });
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      toast.success("Session extended");
    },
    onError: async (error: Error) => {
      if (error?.message?.includes("expired")) {
        toast.error("Session expired", {
          description: "Please log in again.",
        });
        await removeToken();
        queryClient.setQueryData(["stored-token"], null);
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
    token: storedToken || null, // Expose the access token

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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}