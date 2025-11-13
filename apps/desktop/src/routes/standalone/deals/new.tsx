import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { WizardProvider, useWizard } from "@/lib/providers/WizardProvider";

const steps = [
  { id: 1, name: "Client & Vehicle", path: "/standalone/deals/new/client-vehicle" },
  { id: 2, name: "Details", path: "/standalone/deals/new/details" },
  { id: 3, name: "Documents", path: "/standalone/deals/new/documents" },
  { id: 4, name: "Finalize", path: "/standalone/deals/new/finalize" },
];

export const Route = createFileRoute("/standalone/deals/new")({
  component: NewDealWizardLayout,
  errorComponent: ({ error }) => {
    console.error("❌ [WIZARD-LAYOUT] Error in route:", error);
    return (
      <Layout>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-destructive">Error loading wizard</h1>
          <p className="mt-2 text-muted-foreground">{error.message}</p>
          <pre className="overflow-auto p-4 mt-4 text-sm rounded bg-muted">{error.stack}</pre>
        </div>
      </Layout>
    );
  },
});

function WizardContent() {
  const navigate = useNavigate();
  const { currentStep } = useWizard();

  const progressPercentage = (currentStep / steps.length) * 100;
  const currentStepData = steps.find((s) => s.id === currentStep) || steps[0];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex gap-4 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/standalone/deals" })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Create New Deal</h1>
            <p className="mt-1 text-muted-foreground">
              Step {currentStep} of {steps.length}
            </p>
          </div>
        </div>

        <Card className="p-6">
          {/* Progress Bar Section */}
          <div className="mb-8 space-y-4">
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-center">
                <p className="text-sm font-medium text-foreground">
                  {currentStepData.name}
                </p>
              </div>
            </div>
            <div className="flex gap-6 justify-center text-xs text-muted-foreground">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={
                    currentStep >= step.id
                      ? "font-medium text-foreground"
                      : ""
                  }
                >
                  {step.name}
                </span>
              ))}
            </div>
          </div>

          <div className="min-h-[400px]">
            <Outlet />
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function NewDealWizardLayout() {
  console.log("🎯 [WIZARD-LAYOUT] Rendering layout");

  // Clear any existing form data when starting a new deal
  // This ensures we start fresh and don't load old draft data
  return (
    <WizardProvider initialData={{}}>
      <WizardContent />
    </WizardProvider>
  );
}