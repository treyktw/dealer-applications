// src/components/ui/app-loader.tsx
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
}

interface AppLoaderProps {
  steps: LoadingStep[];
  currentStep?: string;
}

export function AppLoader({ steps, currentStep }: AppLoaderProps) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="px-6 w-full max-w-md">
        <div className="space-y-8 text-center">
          {/* Logo/Brand */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Dealer Software</h1>
            <p className="text-sm text-muted-foreground">
              Initializing application...
            </p>
          </div>

          {/* Loading Steps */}
          <div className="space-y-4">
            {steps.map((step) => {
              const isActive = step.id === currentStep || step.status === "loading";
              const isComplete = step.status === "complete";
              const isError = step.status === "error";

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isActive && "bg-muted border-primary",
                    isComplete && "bg-muted/50 border-green-500/50",
                    isError && "bg-destructive/10 border-destructive"
                  )}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isError ? (
                      <div className="w-5 h-5 rounded-full bg-destructive" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 text-left">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive && "text-foreground",
                        isComplete && "text-green-600 dark:text-green-400",
                        isError && "text-destructive",
                        !isActive && !isComplete && !isError && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress indicator */}
          <div className="pt-4">
            <div className="overflow-hidden h-1 rounded-full bg-muted">
              <div
                className="h-full transition-all duration-300 bg-primary"
                style={{
                  width: `${
                    (steps.filter((s) => s.status === "complete").length /
                      steps.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

