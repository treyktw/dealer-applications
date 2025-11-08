// src/components/auth/AuthGuard.tsx - Updated for Dual Auth Support
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useUnifiedAuth } from "./useUnifiedAuth";
import { getCachedAppMode } from "@/lib/mode-detection";

const PUBLIC_ROUTES = ["/login", "/standalone-login", "/auth-verify", "/subscribe", "/account-setup", "/license-activation"];

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";
  
  const currentPath = location.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath.startsWith(route));

  // Get auth context (works for both standalone and dealership modes)
  const auth = useUnifiedAuth();

  // Redirect logic (only for dealership mode)
  useEffect(() => {
    if (isStandalone) return;
    if (auth.isLoading) return; // Wait for auth to load

    // If on public route and authenticated, redirect to home
    if (isPublicRoute && auth.isAuthenticated) {
      navigate({ to: '/' });
      return;
    }

    // If not authenticated and not on public route, redirect to appropriate login
    if (!isPublicRoute && !auth.isAuthenticated) {
      // In standalone mode, redirect to standalone login
      if (isStandalone) {
        const returnTo = `${currentPath}${location.search ? `?${location.search}` : ''}`;
        navigate({ 
          to: '/standalone-login',
          search: { redirect: returnTo }
        });
        return;
      }
      
      // In dealership mode, redirect to login
      const returnTo = `${currentPath}${location.search ? `?${location.search}` : ''}`;
      navigate({ 
        to: '/login',
        search: { redirect: returnTo }
      });
      return;
    }
  }, [auth.isLoading, auth.isAuthenticated, isPublicRoute, currentPath, location.search, navigate, isStandalone]);

  if (isStandalone) {
    // Allow standalone mode to render without strict guard requirements
    if (auth.isLoading && !isPublicRoute) {
      return <LoadingScreen message="Loading..." />;
    }
    return <>{children}</>;
  }

  // Show loading while checking auth for private routes only
  if (!isPublicRoute && auth.isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Show loading while redirecting
  if (!isPublicRoute && !auth.isAuthenticated) {
    return <LoadingScreen message="Redirecting..." />;
  }

  // Check dealership access (only for dealership mode)
  if (!isStandalone && auth.isAuthenticated && !isPublicRoute) {
    if (!auth.user?.dealershipId) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold">Account Setup Required</h2>
            <p className="text-muted-foreground">
              Your account needs to be associated with a dealership. Please contact your administrator.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}