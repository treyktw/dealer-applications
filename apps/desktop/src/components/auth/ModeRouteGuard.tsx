/**
 * Mode Route Guard
 * Redirects users to the correct routes based on their app mode
 * - Standalone users can only access /standalone/* routes
 * - Dealership users can only access dealership routes (not /standalone/*)
 */

import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { getCachedAppMode } from "@/lib/mode-detection";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Routes that are allowed for both modes
const PUBLIC_ROUTES = [
  "/login",
  "/standalone-login",
  "/auth-verify",
  "/subscribe",
  "/account-setup",
  "/license-activation",
  "/help",
  "/settings",
  "/profile",
  "/whats-new",
  "/search",
  "/subscription",
  "/standalone/profile",
  "/standalone/settings",
  "/standalone/subscription",
  "/standalone/deals", // Allow standalone deals routes
];

// Dealership-only routes (routes that should NOT be accessible to standalone users)
const DEALERSHIP_ROUTES = [
  "/",
  "/deals",
  "/dealership",
];

interface ModeRouteGuardProps {
  children: React.ReactNode;
}

export function ModeRouteGuard({ children }: ModeRouteGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const appMode = getCachedAppMode();
  const currentPath = location.pathname;

  // Check if current route is public (allowed for both modes)
  const isPublicRoute = PUBLIC_ROUTES.some((route) => currentPath.startsWith(route));
  
  // Debug logging
  useEffect(() => {
    console.log("🔍 [MODE-GUARD] Route check:", {
      path: currentPath,
      appMode,
      isPublicRoute,
      isStandaloneRoute: currentPath.startsWith("/standalone"),
    });
  }, [currentPath, appMode, isPublicRoute]);

  useEffect(() => {
    // Don't redirect on public routes
    if (isPublicRoute) {
      return;
    }

    // If mode is not determined yet, wait
    if (!appMode) {
      return;
    }

    const isStandalone = appMode === "standalone";
    const isStandaloneRoute = currentPath.startsWith("/standalone");
    const isDealershipRoute = DEALERSHIP_ROUTES.some((route) => 
      currentPath === route || currentPath.startsWith(route + "/")
    );

    // Allow standalone users on standalone routes
    if (isStandalone && isStandaloneRoute) {
      console.log("✅ [MODE-GUARD] Standalone user accessing standalone route, allowing...");
      return;
    }

    // Allow dealership users on dealership routes
    if (!isStandalone && isDealershipRoute) {
      console.log("✅ [MODE-GUARD] Dealership user accessing dealership route, allowing...");
      return;
    }

    // Standalone users trying to access dealership routes
    if (isStandalone && isDealershipRoute) {
      console.log("🚫 [MODE-GUARD] Standalone user accessing dealership route, redirecting...");
      navigate({ to: "/standalone" });
      return;
    }

    // Dealership users trying to access standalone routes
    if (!isStandalone && isStandaloneRoute) {
      console.log("🚫 [MODE-GUARD] Dealership user accessing standalone route, redirecting...");
      navigate({ to: "/" });
      return;
    }
  }, [appMode, currentPath, navigate, isPublicRoute]);

  // Show loading while mode is being determined (but allow standalone routes to proceed)
  const isStandaloneRoute = currentPath.startsWith("/standalone");
  if (!appMode && !isPublicRoute && !isStandaloneRoute) {
    return <LoadingScreen message="Determining app mode..." />;
  }

  return <>{children}</>;
}

