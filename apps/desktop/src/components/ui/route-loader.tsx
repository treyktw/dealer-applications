import { useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

/**
 * Universal Route Loader
 * Shows a loading state while routes are being prepared/loaded
 */
export function RouteLoader() {
  const routerState = useRouterState();
  const isPending = routerState.isLoading;

  if (!isPending) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
