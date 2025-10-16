import { useAuth, useUser } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";

const PUBLIC_ROUTES = ["/login", "/sso-callback", "/oauth-callback"];
const LOADING_TIMEOUT = 3000; // 3 seconds

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [showContent, setShowContent] = useState(false);
  
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath.startsWith(route));

  useEffect(() => {
    // Method 1: Show immediately if Clerk is loaded
    if (isLoaded) {
      console.log('✅ Clerk loaded - showing content');
      setShowContent(true);
      return;
    }

    // Method 2: Show after timeout regardless
    const timer = setTimeout(() => {
      console.log('⏱️ Timeout reached - forcing content display');
      setShowContent(true);
    }, LOADING_TIMEOUT);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Quick exit for public routes
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading only for first 3 seconds
  if (!showContent) {
    return <LoadingScreen message="Connecting to DealerPro..." />;
  }

  // After showing content, check auth
  if (!isSignedIn) {
    const currentUrl = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Check dealership access
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
              className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
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

  return <>{children}</>;
}






