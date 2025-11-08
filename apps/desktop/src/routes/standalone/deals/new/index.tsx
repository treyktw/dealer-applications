import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { useState, createContext, useContext } from "react";
import type { LocalClient, LocalVehicle } from "@/lib/local-storage/db";

export const Route = createFileRoute("/standalone/deals/new/")({
  component: NewDealWizard,
});

interface DealFormData {
  type: string;
  clientId: string;
  vehicleId: string;
  status: string;
  totalAmount: number;
  saleAmount?: number;
  salesTax?: number;
  docFee?: number;
  tradeInValue?: number;
  downPayment?: number;
  financedAmount?: number;
  documentIds: string[];
  selectedClient?: LocalClient;
  selectedVehicle?: LocalVehicle;
  selectedDocuments?: string[];
}

interface WizardContextType {
  formData: DealFormData;
  updateFormData: (data: Partial<DealFormData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within WizardProvider");
  }
  return context;
};

const steps = [
  { id: 1, name: "Client", path: "/standalone/deals/new/client" },
  { id: 2, name: "Vehicle", path: "/standalone/deals/new/vehicle" },
  { id: 3, name: "Details", path: "/standalone/deals/new/details" },
  { id: 4, name: "Documents", path: "/standalone/deals/new/documents" },
  { id: 5, name: "Finalize", path: "/standalone/deals/new/finalize" },
];

function NewDealWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DealFormData>({
    type: "retail",
    clientId: "",
    vehicleId: "",
    status: "draft",
    totalAmount: 0,
    documentIds: [],
  });

  const updateFormData = (data: Partial<DealFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  return (
    <WizardContext.Provider value={{ formData, updateFormData, currentStep, setCurrentStep }}>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/standalone/deals" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create New Deal</h1>
              <p className="text-muted-foreground mt-1">
                Step {currentStep} of {steps.length}
              </p>
            </div>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep > step.id
                          ? "bg-green-500 text-white"
                          : currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={`text-sm mt-2 ${
                        currentStep === step.id
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-4 ${
                        currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="min-h-[400px]">
              <Outlet />
            </div>
          </Card>
        </div>
      </Layout>
    </WizardContext.Provider>
  );
}
