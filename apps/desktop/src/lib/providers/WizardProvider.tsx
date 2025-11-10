import { createContext, useContext, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { LocalClient, LocalVehicle } from "@/lib/local-storage/db";

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
  clientData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    driversLicense: string;
  };
  vehicleData?: {
    vin: string;
    stockNumber: string;
    year: number;
    make: string;
    model: string;
    trim: string;
    mileage: number;
    color: string;
    price: number;
    cost: number;
    status: string;
    description: string;
  };
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

interface WizardProviderProps {
  children: ReactNode;
}

export function WizardProvider({ children }: WizardProviderProps) {
  const location = useLocation();
  const [formData, setFormData] = useState<DealFormData>({
    type: "retail",
    clientId: "",
    vehicleId: "",
    status: "draft",
    totalAmount: 0,
    documentIds: [],
  });

  console.log("🎯 [WIZARD-PROVIDER] Rendering with location:", location.pathname);

  const updateFormData = (data: Partial<DealFormData>) => {
    console.log("📝 [WIZARD-PROVIDER] Updating form data:", data);
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const getCurrentStep = () => {
    const path = location.pathname;
    if (path.includes("/client-vehicle")) return 1;
    if (path.includes("/details")) return 2;
    if (path.includes("/documents")) return 3;
    if (path.includes("/finalize")) return 4;
    return 1;
  };

  const currentStep = getCurrentStep();
  const setCurrentStep = (_step: number) => {
    // Navigation is handled by the step components via navigate()
    // This function exists to satisfy the WizardContext interface
  };

  const contextValue: WizardContextType = {
    formData,
    updateFormData,
    currentStep,
    setCurrentStep,
  };

  console.log("✅ [WIZARD-PROVIDER] Context value created:", {
    hasFormData: !!contextValue.formData,
    currentStep: contextValue.currentStep,
  });

  return (
    <WizardContext.Provider value={contextValue}>
      {children}
    </WizardContext.Provider>
  );
}

export type { DealFormData, WizardContextType };