// src/components/auth/AuthGuard.tsx - Updated for Email Auth
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { LoadingScreen } from "@/components/ui/loading-screen";

const PUBLIC_ROUTES = ["/login", "/auth-verify"];

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPath = location.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath.startsWith(route));

  // Redirect logic
  useEffect(() => {
    if (isLoading) return; // Wait for auth to load

    // If on public route and authenticated, redirect to home
    if (isPublicRoute && isAuthenticated) {
      navigate({ to: '/' });
      return;
    }

    // If not authenticated and not on public route, redirect to login
    if (!isPublicRoute && !isAuthenticated) {
      const returnTo = `${currentPath}${location.search ? `?${location.search}` : ''}`;
      navigate({ 
        to: '/login',
        search: { redirect: returnTo }
      });
      return;
    }
  }, [isLoading, isAuthenticated, isPublicRoute, currentPath, location.search, navigate]);

  // Show loading while checking auth for private routes only
  if (!isPublicRoute && isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Show loading while redirecting
  if (!isPublicRoute && !isAuthenticated) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Check dealership access (for authenticated users only)
  if (isAuthenticated && !isPublicRoute) {
    if (!user?.dealershipId) {
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