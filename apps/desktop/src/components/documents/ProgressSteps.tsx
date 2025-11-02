// src/components/deals/documents/ProgressSteps.tsx

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = "review" | "edit" | "sign" | "notarize" | "finalize";

interface StepConfig {
  id: Step;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ProgressStepsProps {
  steps: StepConfig[];
  currentStep: Step;
  onStepClick: (step: Step) => void;
}

export function ProgressSteps({ steps, currentStep, onStepClick }: ProgressStepsProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex gap-2 items-center">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-1 gap-2 items-center">
          <button
            type="button"
            onClick={() => onStepClick(step.id)}
            className={cn(
              "flex flex-col items-center w-full p-3 rounded-lg transition-all",
              currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : index < currentStepIndex
                ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            <div className="flex gap-2 items-center mb-1">
              {step.icon}
              <span className="text-xs font-medium">{step.label}</span>
            </div>
          </button>
          {index < steps.length - 1 && (
            <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}