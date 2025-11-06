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

// CSRF state storage
const STATE_KEY = "oauth_state";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Use ref to track if listeners are registered (prevents double registration)
  const listenersRegistered = useRef(false);


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
          token: storedToken,
        });

        if (result) {
          setConvexAuth(storedToken);
          console.log("🔍 Session data:", result);
          console.log("🔍 Session Data object:", sessionData?.user);
          return result;
        } else {
          await removeToken();
          queryClient.setQueryData(["stored-token"], null);
          setConvexAuth(null);
          return null;
        }
      } catch (error) {
        await removeToken();
        queryClient.setQueryData(["stored-token"], null);
        setConvexAuth(null);
        return null;
      }
    },
    enabled: !!storedToken && !tokenLoading,
    staleTime: 5 * 60 * 1000000,
    retry: false,
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
      try {
        await storeToken(data.session.token);
      } catch (error) {
        throw error;
      }

      queryClient.setQueryData(["stored-token"], data.session.token);
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });

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

    // Production web URL
    // const webUrl = "https://dealer.universalautobrokers.net";
    // local web url
    const webUrl = "http://localhost:3000";
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
      if (!storedToken) return;
      return await convexMutation(api.api.desktopAuth.logout, {
        token: storedToken,
      });
    },
    onSuccess: async () => {
      await removeToken();
      queryClient.setQueryData(["stored-token"], null);
      setConvexAuth(null);
      queryClient.clear();
      toast.success("Signed out successfully");
    },
  });

  // Logout all devices mutation
  const logoutAllDevicesMutation = useMutation({
    mutationFn: async () => {
      if (!storedToken) return;
      return await convexMutation(api.api.desktopAuth.logoutAllDevices, {
        token: storedToken,
      });
    },
    onSuccess: async () => {
      await removeToken();
      queryClient.setQueryData(["stored-token"], null);
      setConvexAuth(null);
      queryClient.clear();
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