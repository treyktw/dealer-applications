import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import type { LocalClient } from "@/lib/sqlite/local-clients-service";
import type { LocalVehicle } from "@/lib/sqlite/local-vehicles-service";

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
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    driversLicense: string;
  };
  cobuyerData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    addressLine2?: string;
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
    body?: string;
    doors?: number;
    transmission?: string;
    engine?: string;
    cylinders?: number;
    titleNumber?: string;
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
  clearFormData: () => void;
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
  initialData?: Partial<DealFormData>;
}

const STORAGE_KEY = "deal-wizard-form-data";

function loadFromStorage(): Partial<DealFormData> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log("📦 [WIZARD-STORAGE] Loading from storage:", stored ? "found" : "not found");
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("📦 [WIZARD-STORAGE] Parsed data:", {
        clientId: parsed.clientId,
        vehicleId: parsed.vehicleId,
      });
      // Don't restore selectedClient/selectedVehicle from storage as they're large objects
      // We'll fetch them by ID if needed
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { selectedClient: _, selectedVehicle: __, ...rest } = parsed;
      return rest;
    }
  } catch (error) {
    console.error("❌ [WIZARD-STORAGE] Failed to load wizard data from storage:", error);
  }
  return null;
}

function saveToStorage(data: DealFormData) {
  try {
    // Don't store selectedClient/selectedVehicle as they're large objects
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { selectedClient: _, selectedVehicle: __, ...dataToStore } = data;
    console.log("💾 [WIZARD-STORAGE] Saving to storage:", {
      clientId: dataToStore.clientId,
      vehicleId: dataToStore.vehicleId,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error("❌ [WIZARD-STORAGE] Failed to save wizard data to storage:", error);
  }
}

export function WizardProvider({ children, initialData }: WizardProviderProps) {
  const location = useLocation();
  
  // Load from storage or use initialData
  const storedData = loadFromStorage();
  const initialFormData: DealFormData = {
    type: initialData?.type || storedData?.type || "retail",
    clientId: initialData?.clientId || storedData?.clientId || "",
    vehicleId: initialData?.vehicleId || storedData?.vehicleId || "",
    status: initialData?.status || storedData?.status || "draft",
    totalAmount: initialData?.totalAmount || storedData?.totalAmount || 0,
    documentIds: initialData?.documentIds || storedData?.documentIds || [],
    saleAmount: initialData?.saleAmount ?? storedData?.saleAmount,
    salesTax: initialData?.salesTax ?? storedData?.salesTax,
    docFee: initialData?.docFee ?? storedData?.docFee,
    tradeInValue: initialData?.tradeInValue ?? storedData?.tradeInValue,
    downPayment: initialData?.downPayment ?? storedData?.downPayment,
    financedAmount: initialData?.financedAmount ?? storedData?.financedAmount,
    selectedClient: initialData?.selectedClient,
    selectedVehicle: initialData?.selectedVehicle,
    selectedDocuments: initialData?.selectedDocuments || storedData?.selectedDocuments,
    clientData: initialData?.clientData || storedData?.clientData,
    vehicleData: initialData?.vehicleData || storedData?.vehicleData,
    cobuyerData: initialData?.cobuyerData || storedData?.cobuyerData,
  };

  const [formData, setFormData] = useState<DealFormData>(initialFormData);

  // Save to storage whenever formData changes
  useEffect(() => {
    saveToStorage(formData);
  }, [formData]);

  console.log("🎯 [WIZARD-PROVIDER] Rendering with location:", location.pathname);
  console.log("📦 [WIZARD-PROVIDER] FormData:", {
    clientId: formData.clientId,
    vehicleId: formData.vehicleId,
    hasSelectedClient: !!formData.selectedClient,
    hasSelectedVehicle: !!formData.selectedVehicle,
  });

  const updateFormData = (data: Partial<DealFormData>) => {
    console.log("📝 [WIZARD-PROVIDER] Updating form data:", {
      ...data,
      // Don't log full objects, just IDs
      selectedClient: data.selectedClient ? "present" : undefined,
      selectedVehicle: data.selectedVehicle ? "present" : undefined,
    });
    setFormData((prev) => {
      const updated = { ...prev, ...data };
      console.log("📝 [WIZARD-PROVIDER] New state will be:", {
        clientId: updated.clientId,
        vehicleId: updated.vehicleId,
      });
      return updated;
    });
  };

  const clearFormData = () => {
    console.log("🗑️ [WIZARD-PROVIDER] Clearing form data");
    localStorage.removeItem(STORAGE_KEY);
    setFormData({
      type: "retail",
      clientId: "",
      vehicleId: "",
      status: "draft",
      totalAmount: 0,
      documentIds: [],
    });
  };

  const getCurrentStep = () => {
    const path = location.pathname;
    if (path.includes("/client-vehicle")) return 1;
    if (path.includes("/details")) return 2;
    if (path.includes("/documents")) return 3;
    if (path.includes("/finalize")) return 4;
    // For edit routes
    if (path.includes("/edit/client-vehicle")) return 1;
    if (path.includes("/edit/details")) return 2;
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
    clearFormData,
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