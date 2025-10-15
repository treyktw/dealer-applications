// src/components/ui/loading-screen.tsx
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-lg font-semibold">
            {message || "Loading"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please wait while we set things up...
          </p>
        </div>
      </div>
    </div>
  );
}