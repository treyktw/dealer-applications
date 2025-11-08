import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider } from "convex/react";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthContext";
import { LicenseAuthProvider } from "@/components/auth/LicenseAuthContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { convexClient } from "@/lib/convex";
import { detectAppMode, setAppMode, type AppMode } from "@/lib/mode-detection";
import { DealershipAssociationPrompt } from "@/components/auth/DealershipAssociationPrompt";
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { UpdateManager } from "./components/update/UpdateManager";

const router = createRouter({
  routeTree,
});

// Use the shared Convex client instance
const convexQueryClient = new ConvexQueryClient(convexClient);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      retry: 1,
      staleTime: 5000,
    },
  },
});
convexQueryClient.connect(queryClient);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const [appMode, setAppModeState] = useState<AppMode | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [showDealershipPrompt, setShowDealershipPrompt] = useState(false);
  const modeSelectedRef = useRef(false); // Track if mode has been explicitly selected (using ref to avoid re-renders)

  // Check if in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "development";

  useEffect(() => {
    // Don't run detection if mode has already been selected
    if (modeSelectedRef.current) {
      return;
    }

    async function detectMode() {
      try {
        // Check if mode is already set in localStorage (from previous session)
        const storedMode = localStorage.getItem("app_mode");
        if (storedMode === "standalone" || storedMode === "dealership") {
          setAppModeState(storedMode);
          modeSelectedRef.current = true; // Mark as selected to prevent re-detection
          setIsDetecting(false);
          return;
        }
        
        // Check if first time setup is complete
        const firstTimeSetupComplete = localStorage.getItem("first_time_setup_complete");
        
        // In development mode, always show the prompt (but only if mode not already set)
        if (isDevelopment && !storedMode) {
          setShowDealershipPrompt(true);
          setIsDetecting(false);
          return;
        }

        // If first time setup not complete, show prompt
        if (!firstTimeSetupComplete) {
          setShowDealershipPrompt(true);
          setIsDetecting(false);
          return;
        }

        // Otherwise, detect mode normally
        const mode = await detectAppMode();
        if (mode === null) {
          // Fallback: show prompt if mode can't be determined
          setShowDealershipPrompt(true);
        } else {
          setAppModeState(mode);
          modeSelectedRef.current = true; // Mark as selected since we detected a mode
        }
      } catch (error) {
        console.error("Error detecting app mode:", error);
        // On error, show prompt
        setShowDealershipPrompt(true);
      } finally {
        setIsDetecting(false);
      }
    }

    detectMode();
  }, []); // Only run once on mount

  // Listen for mode changes in localStorage (for when switching from standalone to dealership)
  useEffect(() => {
    if (!appMode) return; // Don't listen if mode not set yet

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app_mode" && e.newValue) {
        const newMode = e.newValue as AppMode;
        if (newMode !== appMode && (newMode === "standalone" || newMode === "dealership")) {
          console.log("🔄 [APP] Mode changed in localStorage, reloading app...");
          // Reload the app to switch providers
          window.location.reload();
        }
      }
    };

    // Also check for direct localStorage changes (same-origin)
    const checkModeChange = () => {
      const currentMode = localStorage.getItem("app_mode") as AppMode | null;
      if (currentMode && currentMode !== appMode && (currentMode === "standalone" || currentMode === "dealership")) {
        console.log("🔄 [APP] Mode changed, reloading app...");
        window.location.reload();
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);
    
    // Poll for changes (for same-tab changes)
    const interval = setInterval(checkModeChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [appMode]);

  const handleModeSelected = (mode: AppMode) => {
    // Ensure mode is saved to localStorage
    setAppMode(mode);
    setAppModeState(mode);
    setShowDealershipPrompt(false);
    modeSelectedRef.current = true; // Mark mode as explicitly selected to prevent re-detection
  };

  // Show dealership association prompt if needed
  if (isDetecting) {
    return (
      <ErrorBoundary>
        <ConvexProvider client={convexClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              </div>
            </ThemeProvider>
          </QueryClientProvider>
        </ConvexProvider>
      </ErrorBoundary>
    );
  }

  if (showDealershipPrompt) {
    return (
      <ErrorBoundary>
        <ConvexProvider client={convexClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <DealershipAssociationPrompt 
                onModeSelected={handleModeSelected}
                isDevelopment={isDevelopment}
              />
            </ThemeProvider>
          </QueryClientProvider>
        </ConvexProvider>
      </ErrorBoundary>
    );
  }

  // Show mode selector if mode not yet determined (fallback)
  if (appMode === null) {
    return (
      <ErrorBoundary>
        <ConvexProvider client={convexClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <DealershipAssociationPrompt 
                onModeSelected={handleModeSelected}
                isDevelopment={isDevelopment}
              />
            </ThemeProvider>
          </QueryClientProvider>
        </ConvexProvider>
      </ErrorBoundary>
    );
  }

  // Render appropriate auth provider based on mode
  return (
    <ErrorBoundary>
      <ConvexProvider client={convexClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {appMode === "standalone" ? (
              <LicenseAuthProvider>
                <UpdateManager />
                <RouterProvider router={router} />
              </LicenseAuthProvider>
            ) : (
              <AuthProvider>
                <UpdateManager />
                <RouterProvider router={router} />
              </AuthProvider>
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </ConvexProvider>
    </ErrorBoundary>
  );
}

export default App;
