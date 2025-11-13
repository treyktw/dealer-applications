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
import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppLoader } from "@/components/ui/app-loader";
import "./App.css";
import { UpdateManager } from "./components/update/UpdateManager";
import { hasDocumentsRootPath, promptSelectDocumentsDirectory } from "@/lib/sqlite/local-documents-service";
import { SyncProvider } from "@/components/sync/SyncProvider";

type LoadingStepStatus = "pending" | "loading" | "complete" | "error";

interface LoadingStep {
  id: string;
  label: string;
  status: LoadingStepStatus;
}

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
      staleTime: 30 * 1000, // 30 seconds - reduce refetch frequency
      gcTime: 5 * 60 * 1000, // 5 minutes - garbage collect unused queries
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      refetchOnReconnect: true, // Only refetch on reconnect
    },
  },
  // Limit cache size to prevent memory issues
  queryCache: undefined, // Use default cache but with gcTime above
});
convexQueryClient.connect(queryClient);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  // Check if this is the first startup
  const isFirstStartup = !localStorage.getItem("app_initialized");
  
  const [appMode, setAppModeState] = useState<AppMode | null>(null);
  const [isDetecting, setIsDetecting] = useState(isFirstStartup); // Only show loader on first startup
  const [showDealershipPrompt, setShowDealershipPrompt] = useState(false);
  const modeSelectedRef = useRef(false); // Track if mode has been explicitly selected (using ref to avoid re-renders)
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { id: "tauri", label: "Checking Tauri environment", status: "pending" },
    { id: "mode", label: "Detecting application mode", status: "pending" },
    { id: "database", label: "Initializing database", status: "pending" },
    { id: "auth", label: "Loading authentication", status: "pending" },
  ]);
  const [currentLoadingStep, setCurrentLoadingStep] = useState<string | undefined>();

  // Check if in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === "development";

  // Helper to update loading step status
  const updateStepStatus = useCallback((stepId: string, status: LoadingStepStatus) => {
    setLoadingSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
    if (status === "loading") {
      setCurrentLoadingStep(stepId);
    }
  }, []);

  useEffect(() => {
    // Don't run detection if mode has already been selected
    if (modeSelectedRef.current) {
      return;
    }

    // Check if this is the first startup (inside effect to avoid stale closure)
    const isFirstStartupCheck = !localStorage.getItem("app_initialized");

    // If not first startup, skip loader and detect mode quickly
    if (!isFirstStartupCheck) {
      async function quickDetectMode() {
        const storedMode = localStorage.getItem("app_mode");
        if (storedMode === "standalone" || storedMode === "dealership") {
          setAppModeState(storedMode);
          modeSelectedRef.current = true;
          setIsDetecting(false);
        } else {
          // If no mode stored, detect it
          const mode = await detectAppMode();
          if (mode) {
            setAppModeState(mode);
            modeSelectedRef.current = true;
          } else {
            setShowDealershipPrompt(true);
          }
          setIsDetecting(false);
        }
      }
      quickDetectMode();
      return;
    }

    // First startup - run full detection with loader
    async function detectMode() {
      try {
        // Step 1: Check Tauri environment
        updateStepStatus("tauri", "loading");
        await new Promise((resolve) => setTimeout(resolve, 100)); // Delay for visibility
        const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
        if (isTauri) {
          updateStepStatus("tauri", "complete");
          console.log("✅ [APP] Running in Tauri environment");
        } else {
          updateStepStatus("tauri", "complete");
          console.log("ℹ️ [APP] Running in browser environment");
        }

        // Step 2: Detect mode
        updateStepStatus("mode", "loading");
        await new Promise((resolve) => setTimeout(resolve, 100)); // Delay for visibility
        
        // Check if mode is already set in localStorage (from previous session)
        const storedMode = localStorage.getItem("app_mode");
        if (storedMode === "standalone" || storedMode === "dealership") {
          setAppModeState(storedMode);
          modeSelectedRef.current = true;
          updateStepStatus("mode", "complete");
          console.log(`✅ [APP] Mode detected from storage: ${storedMode}`);
          
          // Step 3: Initialize database (if standalone)
          updateStepStatus("database", "loading");
          await new Promise((resolve) => setTimeout(resolve, 100)); // Delay for visibility
          
          if (storedMode === "standalone") {
            try {
              // Always try to get database path if in standalone mode
              // Database is initialized in Rust during Tauri startup
              const dbPath = await invoke<string>("get_database_path");
              console.log("📂 [SQLite] Database location:", dbPath);
              updateStepStatus("database", "complete");
            } catch {
              // If invoke fails, we're probably in browser mode (dev server)
              console.log("ℹ️ [SQLite] Running in browser dev mode - database will be initialized when running in Tauri");
              console.log("📂 [SQLite] Database will be located at: apps/desktop/db/dealer.db (dev) or app data directory (prod)");
              updateStepStatus("database", "complete");
            }
          } else {
            updateStepStatus("database", "complete");
          }
          
          // Step 4: Auth loading
          updateStepStatus("auth", "loading");
          await new Promise((resolve) => setTimeout(resolve, 100)); // Delay for UX
          updateStepStatus("auth", "complete");
          
          // Mark app as initialized on first startup
          localStorage.setItem("app_initialized", "true");
          
          // Ensure loader is visible for at least 1.5 seconds total
          await new Promise((resolve) => setTimeout(resolve, 100));
          setIsDetecting(false);
          return;
        }
        
        // Check if first time setup is complete
        const firstTimeSetupComplete = localStorage.getItem("first_time_setup_complete");
        
        // In development mode, always show the prompt (but only if mode not already set)
        if (isDevelopment && !storedMode) {
          updateStepStatus("mode", "complete");
          updateStepStatus("database", "complete");
          updateStepStatus("auth", "complete");
          setShowDealershipPrompt(true);
          setIsDetecting(false);
          return;
        }

        // If first time setup not complete, show prompt
        if (!firstTimeSetupComplete) {
          updateStepStatus("mode", "complete");
          updateStepStatus("database", "complete");
          updateStepStatus("auth", "complete");
          setShowDealershipPrompt(true);
          setIsDetecting(false);
          return;
        }

        // Otherwise, detect mode normally
        const mode = await detectAppMode();
        updateStepStatus("mode", "complete");
        
        if (mode === null) {
          // Fallback: show prompt if mode can't be determined
          updateStepStatus("database", "complete");
          updateStepStatus("auth", "complete");
          setShowDealershipPrompt(true);
        } else {
          setAppModeState(mode);
          modeSelectedRef.current = true;
          
          // Initialize database if standalone
          updateStepStatus("database", "loading");
          await new Promise((resolve) => setTimeout(resolve, 400)); // Delay for visibility
          
          if (mode === "standalone") {
            try {
              // Always try to get database path if in standalone mode
              // Database is initialized in Rust during Tauri startup
              const dbPath = await invoke<string>("get_database_path");
              console.log("📂 [SQLite] Database location:", dbPath);
              
              // Check if documents root path is configured (first-run setup)
              const hasDocsPath = await hasDocumentsRootPath();
              if (!hasDocsPath) {
                console.log("📂 [DOCS] Documents root path not configured, prompting user...");
                const selectedPath = await promptSelectDocumentsDirectory();
                if (selectedPath) {
                  console.log("✅ [DOCS] Documents root path configured:", selectedPath);
                } else {
                  console.log("ℹ️ [DOCS] User skipped directory selection, using default");
                }
              }
              
              updateStepStatus("database", "complete");
            } catch {
              // If invoke fails, we're probably in browser mode (dev server)
              console.log("ℹ️ [SQLite] Running in browser dev mode - database will be initialized when running in Tauri");
              console.log("📂 [SQLite] Database will be located at: apps/desktop/db/dealer.db (dev) or app data directory (prod)");
              updateStepStatus("database", "complete");
            }
          } else {
            updateStepStatus("database", "complete");
          }
          
          // Auth loading
          updateStepStatus("auth", "loading");
          await new Promise((resolve) => setTimeout(resolve, 500));
          updateStepStatus("auth", "complete");
          
          // Mark app as initialized on first startup
          localStorage.setItem("app_initialized", "true");
          
          // Ensure loader is visible for at least 1.5 seconds total
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error("❌ [APP] Error during initialization:", error);
        updateStepStatus("mode", "error");
        updateStepStatus("database", "error");
        updateStepStatus("auth", "error");
        // On error, show prompt
        setShowDealershipPrompt(true);
      } finally {
        setIsDetecting(false);
      }
    }

    detectMode();
  }, [updateStepStatus]); // Only run once on mount


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
    
    // Poll for changes (for same-tab changes) - reduced frequency to prevent memory issues
    const interval = setInterval(checkModeChange, 2000); // Changed from 500ms to 2s

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

  // Show app loader during initialization
  if (isDetecting) {
    return (
      <ErrorBoundary>
        <ConvexProvider client={convexClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AppLoader steps={loadingSteps} currentStep={currentLoadingStep} />
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
                <SyncProvider>
                  <UpdateManager />
                  <RouterProvider router={router} />
                </SyncProvider>
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
