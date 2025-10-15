// src/components/auth/AuthGuard.tsx - FOR DESKTOP SIGNING APP
import { useAuth, useUser } from "@clerk/clerk-react";
import { ReactNode } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

const PUBLIC_ROUTES = ["/login", "/sso-callback"];

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  
  // Get current path using native browser API (avoids router issues)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    currentPath.startsWith(route)
  );
  
  // Show loading while checking auth
  if (!isLoaded) {
    return <LoadingScreen message="Connecting to DealerPro..." />;
  }
  
  // Allow access to public routes (login)
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // Redirect to login if not signed in
  if (!isSignedIn) {
    const currentUrl = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
    return <LoadingScreen message="Redirecting to login..." />;
  }
  
  // Check if user has dealership access (they should get this from web app)
  if (!user?.publicMetadata?.dealersoftwareAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold">Account Setup Required</h2>
          <p className="text-muted-foreground">
            Your account needs to be set up in the web portal before you can use the desktop app.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => window.open("https://dealer.universalautobrokers.com", "_blank")}
              rel="noopener noreferrer"
              className="block w-full py-2 px-4 bg-accent-foreground text-background rounded-md hover:bg-accent-foreground/90"
            >
              Open Web Portal
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="block w-full py-2 px-4 border border-border rounded-md hover:bg-accent"
            >
              Refresh After Setup
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact your administrator if you need help
          </p>
        </div>
      </div>
    );
  }
  
  // User is authenticated and has dealership - show app
  return <>{children}</>;
}