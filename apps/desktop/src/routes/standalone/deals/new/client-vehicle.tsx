import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { User, Car, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { useState, useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClient,
  getClient,
} from "@/lib/sqlite/local-clients-service";
import {
  createVehicle,
  getVehicleByVIN,
  getVehicle,
} from "@/lib/sqlite/local-vehicles-service";
import {
  getDealsByStatus,
} from "@/lib/sqlite/local-deals-service";
import { useWizard } from "@/lib/providers/WizardProvider";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { api } from "@dealer/convex";
import { convexAction } from "@/lib/convex";

export const Route = createFileRoute("/standalone/deals/new/client-vehicle")({
  component: ClientVehicleStep,
});

// Validation helper functions
const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === "") return { valid: true }; // Optional field
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 3) return { valid: false, error: "Email must be at least 3 characters" };
  if (trimmed.length > 254) return { valid: false, error: "Email must not exceed 254 characters" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { valid: false, error: "Invalid email format" };
  if (/\.\./.test(trimmed)) return { valid: false, error: "Email contains invalid consecutive dots" };
  const domain = trimmed.split("@")[1];
  if (!domain || !domain.includes(".")) return { valid: false, error: "Email must have a valid domain" };
  return { valid: true };
};

const validatePhone = (phone: string): { valid: boolean; error?: string; normalized?: string } => {
  if (!phone || phone.trim() === "") return { valid: true }; // Optional field
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/[^0-9+]/g, "");
  if (digitsOnly.length < 10) return { valid: false, error: "Phone number must be at least 10 digits" };
  if (digitsOnly.length > 20) return { valid: false, error: "Phone number must not exceed 20 characters" };
  if (!/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(trimmed)) {
    return { valid: false, error: "Invalid phone number format" };
  }
  const normalized = digitsOnly;
  return { valid: true, normalized };
};

const validateVIN = (vin: string): { valid: boolean; error?: string } => {
  if (!vin || vin.trim() === "") return { valid: false, error: "VIN is required" };
  const trimmed = vin.trim().toUpperCase();
  if (trimmed.length !== 17) return { valid: false, error: "VIN must be exactly 17 characters" };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(trimmed)) {
    return { valid: false, error: "VIN contains invalid characters (I, O, Q not allowed)" };
  }
  return { valid: true };
};

function ClientVehicleStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useUnifiedAuth();

  // Get wizard context - hooks must be called unconditionally
  const wizard = useWizard();
  const formData = wizard?.formData || {};
  const updateFormData = wizard?.updateFormData || (() => {});
  const setCurrentStep = wizard?.setCurrentStep || (() => {});

  // Track dealId using ref to persist across renders
  const dealIdRef = useRef<string>("");
  const isInitializedRef = useRef(false);

  // Only load draft deal if user is continuing an existing form (has formData with clientId/vehicleId)
  // Don't load old drafts when starting a new deal
  const shouldLoadDraft = formData.clientId || formData.vehicleId || formData.clientData || formData.vehicleData;
  
  // Load most recent draft deal on mount - with error handling
  const { data: draftDeal } = useQuery({
    queryKey: ["draft-deal", auth.user?.id, shouldLoadDraft],
    queryFn: async () => {
      if (!auth.user?.id) return null;
      if (!shouldLoadDraft) {
        // Don't load draft if starting fresh
        return null;
      }
      try {
        const drafts = await getDealsByStatus("draft", auth.user.id);
        if (!Array.isArray(drafts)) {
          console.warn("⚠️ [CLIENT-VEHICLE] getDealsByStatus returned non-array:", drafts);
          return null;
        }
        // Get the most recent draft
        const sorted = drafts.sort((a, b) => (b?.updated_at || 0) - (a?.updated_at || 0));
        return sorted[0] || null; // Return null instead of undefined
      } catch (error) {
        console.error("❌ [CLIENT-VEHICLE] Error loading draft deal:", error);
        return null; // Return null instead of undefined - React Query doesn't allow undefined
      }
    },
    enabled: !!auth.user?.id && !!shouldLoadDraft, // Only load if user is continuing
    staleTime: Infinity, // Only fetch once
    retry: false, // Don't retry on error
    refetchOnWindowFocus: false,
  });

  // Load client and vehicle data if draft deal exists - with error handling
  const { data: loadedClient } = useQuery({
    queryKey: ["draft-client", draftDeal?.client_id, auth.user?.id],
    queryFn: async () => {
      try {
        if (!draftDeal?.client_id) return null;
        if (!auth.user?.id) return null;
        const client = await getClient(draftDeal.client_id, auth.user.id);
        return client || null; // Return null instead of undefined
      } catch (error) {
        console.error("❌ [CLIENT-VEHICLE] Error loading client:", error);
        return null; // Return null instead of undefined - React Query doesn't allow undefined
      }
    },
    enabled: !!draftDeal?.client_id && !!auth.user?.id,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: loadedVehicle } = useQuery({
    queryKey: ["draft-vehicle", draftDeal?.vehicle_id],
    queryFn: async () => {
      try {
        if (!draftDeal?.vehicle_id) return null;
        const vehicle = await getVehicle(draftDeal.vehicle_id);
        return vehicle || null; // Return null instead of undefined
      } catch (error) {
        console.error("❌ [CLIENT-VEHICLE] Error loading vehicle:", error);
        // Return null instead of undefined - React Query doesn't allow undefined
        return null;
      }
    },
    enabled: !!draftDeal?.vehicle_id,
    retry: false,
    refetchOnWindowFocus: false,
  });


  // Initialize form data from saved draft or wizard context or seed data
  const initializeFormData = useCallback(() => {
    if (isInitializedRef.current) return;
    
    try {

    // Normalize client data - convert LocalClient to form data format
    const normalizeClientData = (client: typeof loadedClient) => {
      if (!client) return undefined;
      return {
        firstName: client.first_name || "",
        lastName: client.last_name || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        addressLine2: "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zip_code || "",
        driversLicense: client.drivers_license || "",
      };
    };

    // Normalize vehicle data - convert LocalVehicle to form data format
    // Note: formData expects numbers, but local state uses strings for inputs
    const normalizeVehicleData = (vehicle: typeof loadedVehicle) => {
      if (!vehicle) return undefined;
      return {
        vin: vehicle.vin || "",
        stockNumber: vehicle.stock_number || "",
        year: vehicle.year || new Date().getFullYear(),
        make: vehicle.make || "",
        model: vehicle.model || "",
        trim: vehicle.trim || "",
        body: vehicle.body || "",
        doors: vehicle.doors,
        transmission: vehicle.transmission || "",
        engine: vehicle.engine || "",
        cylinders: vehicle.cylinders,
        titleNumber: vehicle.title_number || "",
        mileage: vehicle.mileage || 0,
        color: vehicle.color || "",
        price: vehicle.price || 0,
        cost: vehicle.cost || 0,
        status: vehicle.status || "available",
        description: vehicle.description || "",
      };
    };

    // Only use loaded data if user is continuing (has formData), otherwise use defaults
    // Prefer loaded data from database, then wizard context, then defaults
    const initialClientData = (shouldLoadDraft && normalizeClientData(loadedClient)) ||
      formData.clientData || {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        addressLine2: "",
        city: "",
        state: "",
        zipCode: "",
        driversLicense: "",
      };

    const initialCobuyerData = formData.cobuyerData || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      driversLicense: "",
    };

    // Only use loaded data if user is continuing (has formData), otherwise use defaults
    // Prefer loaded data from database, then wizard context, then defaults
    const initialVehicleData = (shouldLoadDraft && normalizeVehicleData(loadedVehicle)) ||
      formData.vehicleData || {
        vin: "",
        stockNumber: "",
        year: new Date().getFullYear(),
        make: "",
        model: "",
        trim: "",
        body: "",
        doors: undefined,
        transmission: "",
        engine: "",
        cylinders: undefined,
        titleNumber: "",
        mileage: 0,
        color: "",
        price: 0,
        cost: 0,
        status: "available",
        description: "",
      };

    if (draftDeal) {
      dealIdRef.current = draftDeal.id;
      updateFormData({
        clientId: draftDeal.client_id,
        vehicleId: draftDeal.vehicle_id,
        clientData: initialClientData,
        cobuyerData: initialCobuyerData,
        vehicleData: initialVehicleData,
      });
    } else {
      updateFormData({
        clientData: initialClientData,
        cobuyerData: initialCobuyerData,
        vehicleData: initialVehicleData,
      });
    }

    isInitializedRef.current = true;
    } catch (error) {
      console.error("❌ [INIT] Error in initializeFormData:", error);
      isInitializedRef.current = true; // Mark as initialized to prevent infinite loops
    }
  }, [loadedClient, loadedVehicle, draftDeal, formData, updateFormData, shouldLoadDraft]);

  // Compute initial values using useMemo (no useEffect needed)
  const initialClientData = useMemo(() => {
    if (loadedClient) {
      return {
        firstName: loadedClient.first_name || "",
        lastName: loadedClient.last_name || "",
        email: loadedClient.email || "",
        phone: loadedClient.phone || "",
        address: loadedClient.address || "",
        addressLine2: "",
        city: loadedClient.city || "",
        state: loadedClient.state || "",
        zipCode: loadedClient.zip_code || "",
        driversLicense: loadedClient.drivers_license || "",
      };
    } else if (formData.clientData) {
      return {
        ...formData.clientData,
        addressLine2: formData.clientData.addressLine2 || "",
      };
    } else {
      return {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        addressLine2: "",
        city: "",
        state: "",
        zipCode: "",
        driversLicense: "",
      };
    }
  }, [loadedClient, formData.clientData]);

  const initialCobuyerData = useMemo(() => {
    if (formData.cobuyerData) {
      return {
        ...formData.cobuyerData,
        addressLine2: formData.cobuyerData.addressLine2 || "",
      };
    }
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      driversLicense: "",
    };
  }, [formData.cobuyerData]);

  const initialVehicleData = useMemo(() => {
    if (loadedVehicle) {
      return {
        vin: loadedVehicle.vin || "",
        stockNumber: loadedVehicle.stock_number || "",
        year: loadedVehicle.year?.toString() || new Date().getFullYear().toString(),
        make: loadedVehicle.make || "",
        model: loadedVehicle.model || "",
        trim: loadedVehicle.trim || "",
        body: loadedVehicle.body || "",
        doors: loadedVehicle.doors?.toString() || "",
        transmission: loadedVehicle.transmission || "",
        engine: loadedVehicle.engine || "",
        cylinders: loadedVehicle.cylinders?.toString() || "",
        titleNumber: loadedVehicle.title_number || "",
        mileage: loadedVehicle.mileage?.toString() || "",
        color: loadedVehicle.color || "",
        price: loadedVehicle.price?.toString() || "",
        cost: loadedVehicle.cost?.toString() || "",
        status: loadedVehicle.status || "available",
        description: loadedVehicle.description || "",
      };
    } else if (formData.vehicleData) {
      return {
        ...formData.vehicleData,
        year: formData.vehicleData.year?.toString() || new Date().getFullYear().toString(),
        mileage: formData.vehicleData.mileage?.toString() || "",
        price: formData.vehicleData.price?.toString() || "",
        cost: formData.vehicleData.cost?.toString() || "",
        body: formData.vehicleData.body || "",
        doors: formData.vehicleData.doors?.toString() || "",
        transmission: formData.vehicleData.transmission || "",
        engine: formData.vehicleData.engine || "",
        cylinders: formData.vehicleData.cylinders?.toString() || "",
        titleNumber: formData.vehicleData.titleNumber || "",
      };
    } else {
      return {
        vin: "",
        stockNumber: "",
        year: new Date().getFullYear().toString(),
        make: "",
        model: "",
        trim: "",
        body: "",
        doors: "",
        transmission: "",
        engine: "",
        cylinders: "",
        titleNumber: "",
        mileage: "",
        color: "",
        price: "",
        cost: "",
        status: "available",
        description: "",
      };
    }
  }, [loadedVehicle, formData.vehicleData]);

  // Initialize state with computed values, but only once
  const [clientData, setClientData] = useState(() => initialClientData);
  const [cobuyerData, setCobuyerData] = useState(() => initialCobuyerData);
  const [vehicleData, setVehicleData] = useState(() => initialVehicleData);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    client?: { email?: string; phone?: string };
    cobuyer?: { email?: string; phone?: string };
    vehicle?: { vin?: string };
  }>({});

  // VIN decoding state
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);

  // Sync state when initial values change (only if not user-modified)
  const prevInitialClientDataRef = useRef(initialClientData);
  const prevInitialVehicleDataRef = useRef(initialVehicleData);
  const prevInitialCobuyerDataRef = useRef(initialCobuyerData);

  // Update state if initial data changed (but only if user hasn't modified it)
  if (prevInitialClientDataRef.current !== initialClientData && !isInitializedRef.current) {
    setClientData(initialClientData);
    prevInitialClientDataRef.current = initialClientData;
  }
  if (prevInitialVehicleDataRef.current !== initialVehicleData && !isInitializedRef.current) {
    setVehicleData(initialVehicleData);
    prevInitialVehicleDataRef.current = initialVehicleData;
  }
  if (prevInitialCobuyerDataRef.current !== initialCobuyerData && !isInitializedRef.current) {
    setCobuyerData(initialCobuyerData);
    prevInitialCobuyerDataRef.current = initialCobuyerData;
  }

  // Initialize form data when draft deal is available
  if (draftDeal && !isInitializedRef.current) {
    initializeFormData();
  }

  const createClientMutation = useMutation({
    mutationFn: (args: { client: Parameters<typeof createClient>[0]; userId: string }) => {
      console.log("🔍 [MUTATION] createClientMutation called with args:", args);
      console.log("  - args.userId:", args.userId);
      console.log("  - typeof args.userId:", typeof args.userId);
      console.log("  - args.userId value:", JSON.stringify(args.userId));
      
      if (!args.userId || typeof args.userId !== 'string') {
        console.error("❌ [MUTATION] Invalid userId in mutation args:", args.userId);
        throw new Error("User ID is required and must be a string");
      }
      
      return createClient(args.client, args.userId);
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["standalone-clients"] });
      return newClient;
    },
    onError: (error: Error) => {
      toast.error("Failed to create client", {
        description: error.message,
      });
      throw error;
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: (newVehicle) => {
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicles"] });
      return newVehicle;
    },
    onError: (error: Error) => {
      toast.error("Failed to create vehicle", {
        description: error.message,
      });
      throw error;
    },
  });

  // VIN decoding mutation
  const decodeVINMutation = useMutation({
    mutationFn: async (vin: string) => {
      return await convexAction(api.api.vinDecode.decode, { vin });
    },
    onSuccess: (decoded) => {
      // Auto-fill vehicle fields from decoded VIN
      if (decoded.make) updateVehicleField("make", decoded.make);
      if (decoded.model) updateVehicleField("model", decoded.model);
      if (decoded.modelYear) updateVehicleField("year", decoded.modelYear.toString());
      if (decoded.trim) updateVehicleField("trim", decoded.trim);
      if (decoded.bodyClass) updateVehicleField("body", decoded.bodyClass.toLowerCase());
      if (decoded.doors) updateVehicleField("doors", decoded.doors.toString());
      if (decoded.transmissionStyle) updateVehicleField("transmission", decoded.transmissionStyle.toLowerCase());
      if (decoded.engineDisplacement) updateVehicleField("engine", decoded.engineDisplacement);
      if (decoded.engineCylinders) updateVehicleField("cylinders", decoded.engineCylinders.toString());
      
      setVinDecoded(true);
      toast.success("VIN decoded successfully! Vehicle details auto-filled.");
    },
    onError: (error: Error) => {
      toast.error("Failed to decode VIN", {
        description: error.message || "Please check the VIN and try again.",
      });
    },
  });

  // Handle VIN decode button click
  const handleDecodeVIN = useCallback(async () => {
    const vin = vehicleData.vin.trim().toUpperCase();
    const validation = validateVIN(vin);
    
    if (!validation.valid) {
      toast.error("Invalid VIN", {
        description: validation.error || "Please enter a valid 17-character VIN.",
      });
      setValidationErrors((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, vin: validation.error },
      }));
      return;
    }

    setVinDecoding(true);
    try {
      await decodeVINMutation.mutateAsync(vin);
    } finally {
      setVinDecoding(false);
    }
  }, [vehicleData.vin, decodeVINMutation]);

  // Simple update handlers for client data with validation
  const updateClientField = useCallback(
    (field: keyof typeof clientData, value: string) => {
      setClientData((prev) => ({ ...prev, [field]: value }));
      // Mark as initialized when user starts typing
      isInitializedRef.current = true;

      // Validate email and phone fields
      if (field === "email") {
        const validation = validateEmail(value);
        setValidationErrors((prev) => ({
          ...prev,
          client: { ...prev.client, email: validation.valid ? undefined : validation.error },
        }));
      } else if (field === "phone") {
        const validation = validatePhone(value);
        setValidationErrors((prev) => ({
          ...prev,
          client: { ...prev.client, phone: validation.valid ? undefined : validation.error },
        }));
        // Auto-normalize phone number
        if (validation.valid && validation.normalized && value !== validation.normalized) {
          // Update with normalized value (but don't trigger validation again)
          const normalized = validation.normalized;
          if (normalized) {
            setTimeout(() => {
              setClientData((prev) => ({ ...prev, phone: normalized }));
            }, 0);
          }
        }
      }
    },
    []
  );

  // Simple update handlers for co-buyer data with validation
  const updateCobuyerField = useCallback(
    (field: keyof typeof cobuyerData, value: string) => {
      setCobuyerData((prev) => ({ ...prev, [field]: value }));
      // Mark as initialized when user starts typing
      isInitializedRef.current = true;

      // Validate email and phone fields
      if (field === "email") {
        const validation = validateEmail(value);
        setValidationErrors((prev) => ({
          ...prev,
          cobuyer: { ...prev.cobuyer, email: validation.valid ? undefined : validation.error },
        }));
      } else if (field === "phone") {
        const validation = validatePhone(value);
        setValidationErrors((prev) => ({
          ...prev,
          cobuyer: { ...prev.cobuyer, phone: validation.valid ? undefined : validation.error },
        }));
        // Auto-normalize phone number
        if (validation.valid && validation.normalized && value !== validation.normalized) {
          const normalized = validation.normalized;
          if (normalized) {
            setTimeout(() => {
              setCobuyerData((prev) => ({ ...prev, phone: normalized }));
            }, 0);
          }
        }
      }
    },
    []
  );

  // Simple update handlers for vehicle data with VIN validation
  const updateVehicleField = useCallback(
    (field: keyof typeof vehicleData, value: string | number) => {
      setVehicleData((prev) => ({ ...prev, [field]: value }));
      // Mark as initialized when user starts typing
      isInitializedRef.current = true;

      // Validate VIN when changed
      if (field === "vin") {
        const vinValue = String(value).trim().toUpperCase();
        const validation = validateVIN(vinValue);
        setValidationErrors((prev) => ({
          ...prev,
          vehicle: { ...prev.vehicle, vin: validation.valid ? undefined : validation.error },
        }));
        setVinDecoded(false); // Reset decoded flag when VIN changes
      }
    },
    []
  );

  const handleNext = async () => {
    console.log("🚀 [CLIENT-VEHICLE] handleNext called");
    
    // Capture userId at the start to avoid timing issues
    const currentUserId = auth.user?.id;
    if (!currentUserId) {
      console.error("❌ [CLIENT-VEHICLE] User ID is missing at start of handleNext!");
      toast.error("Authentication error. Please log in again.");
      return;
    }
    console.log("✅ [CLIENT-VEHICLE] User ID captured:", currentUserId);
    
    if (!clientData.firstName || !clientData.lastName) {
      toast.error("Please enter client first and last name");
      return;
    }

    // Convert string numbers to actual numbers for validation
    const yearNum = vehicleData.year ? parseInt(vehicleData.year) : 0;
    const priceNum = vehicleData.price ? parseFloat(vehicleData.price) : 0;
    const mileageNum = vehicleData.mileage ? parseInt(vehicleData.mileage) : 0;

    if (
      !vehicleData.vin ||
      !vehicleData.make ||
      !vehicleData.model ||
      !yearNum
    ) {
      toast.error(
        "Please enter all required vehicle information (VIN, Make, Model, Year)"
      );
      return;
    }

    if (priceNum <= 0) {
      toast.error("Please enter a valid vehicle price");
      return;
    }

    console.log("✅ [CLIENT-VEHICLE] Validation passed, starting save process");
    
    try {
      // Final update with converted numbers
      const finalVehicleData = {
        ...vehicleData,
        year: yearNum,
        mileage: mileageNum,
        price: priceNum,
        cost: vehicleData.cost ? parseFloat(vehicleData.cost) : 0,
        doors: vehicleData.doors ? parseInt(vehicleData.doors) : undefined,
        cylinders: vehicleData.cylinders
          ? parseInt(vehicleData.cylinders)
          : undefined,
      };

      updateFormData({
        clientData,
        cobuyerData,
        vehicleData: finalVehicleData,
      });

      // Use existing client/vehicle if auto-save already created them, otherwise create new ones
      let finalClient = formData.selectedClient;
      let finalVehicle = formData.selectedVehicle;

      console.log("📝 [CLIENT-VEHICLE] Checking if client/vehicle need to be created");
      console.log("  - finalClient:", finalClient ? "exists" : "missing");
      console.log("  - formData.clientId:", formData.clientId || "missing");
      console.log("  - finalVehicle:", finalVehicle ? "exists" : "missing");
      console.log("  - formData.vehicleId:", formData.vehicleId || "missing");

      if (!finalClient || !formData.clientId) {
        console.log("📝 [CLIENT-VEHICLE] Creating new client...");
        console.log("  - Using captured userId:", currentUserId);
        
        // Ensure userId is a string
        const userIdString = String(currentUserId).trim();
        if (!userIdString || userIdString === "undefined" || userIdString === "null") {
          console.error("❌ [CLIENT-VEHICLE] User ID is invalid:", currentUserId);
          throw new Error("User ID is required to create client");
        }
        
        console.log("✅ [CLIENT-VEHICLE] User ID validated:", userIdString);
        
        // Create client if it doesn't exist
        finalClient = await createClientMutation.mutateAsync({
          client: {
            first_name: clientData.firstName,
            last_name: clientData.lastName,
            email: clientData.email || undefined,
            phone: clientData.phone || undefined,
            address: clientData.address || undefined,
            city: clientData.city || undefined,
            state: clientData.state || undefined,
            zip_code: clientData.zipCode || undefined,
            drivers_license: clientData.driversLicense || undefined,
          },
          userId: userIdString,
        });
      }

      if (!finalVehicle || !formData.vehicleId) {
        console.log("📝 [CLIENT-VEHICLE] Checking for existing vehicle or creating new one...");
        // Check if vehicle with this VIN already exists
        const existingVehicle = await getVehicleByVIN(vehicleData.vin);

        if (existingVehicle) {
          console.log("✅ [CLIENT-VEHICLE] Found existing vehicle:", existingVehicle.id);
          finalVehicle = existingVehicle;
        } else {
          console.log("📝 [CLIENT-VEHICLE] Creating new vehicle...");
          // Create vehicle if it doesn't exist
          finalVehicle = await createVehicleMutation.mutateAsync({
            vin: vehicleData.vin,
            stock_number: vehicleData.stockNumber || undefined,
            year: yearNum,
            make: vehicleData.make,
            model: vehicleData.model,
            trim: vehicleData.trim || undefined,
            body: vehicleData.body || undefined,
            doors: vehicleData.doors ? parseInt(vehicleData.doors) : undefined,
            transmission: vehicleData.transmission || undefined,
            engine: vehicleData.engine || undefined,
            cylinders: vehicleData.cylinders
              ? parseInt(vehicleData.cylinders)
              : undefined,
            title_number: vehicleData.titleNumber || undefined,
            mileage: mileageNum,
            color: vehicleData.color || undefined,
            price: priceNum,
            cost: vehicleData.cost ? parseFloat(vehicleData.cost) : 0,
            status: vehicleData.status,
            description: vehicleData.description || undefined,
          });
        }
      }

      console.log("✅ [CLIENT-VEHICLE] Client and vehicle created/retrieved successfully");
      console.log("  - finalClient.id:", finalClient.id);
      console.log("  - finalVehicle.id:", finalVehicle.id);

      const updatePayload = {
        clientId: finalClient.id,
        vehicleId: finalVehicle.id,
        selectedClient: finalClient,
        selectedVehicle: finalVehicle,
        saleAmount: priceNum,
        totalAmount: priceNum,
      };
      
      console.log("💾 [CLIENT-VEHICLE] Calling updateFormData with:", {
        clientId: updatePayload.clientId,
        vehicleId: updatePayload.vehicleId,
      });

      updateFormData(updatePayload);

      console.log("✅ [CLIENT-VEHICLE] Form data updated, navigating to details page...");
      toast.success("Client and vehicle information saved");
      setCurrentStep(2);
      
      console.log("🚀 [CLIENT-VEHICLE] Calling navigate({ to: '/standalone/deals/new/details' })");
      navigate({ to: "/standalone/deals/new/details" });
      console.log("✅ [CLIENT-VEHICLE] Navigate call completed");
    } catch (error) {
      // Log error for debugging
      console.error("❌ [CLIENT-VEHICLE] Error in handleNext:", error);
      
      // Show error to user if not already shown by mutation onError
      if (error instanceof Error) {
        // Only show if it's not already handled by mutation onError
        // (mutation onError throws, so we catch it here)
        const errorMessage = error.message || "Failed to save client and vehicle information";
        toast.error("Failed to proceed", {
          description: errorMessage,
        });
      } else {
        toast.error("Failed to proceed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">
          Client & Vehicle Information
        </h2>
        <p className="text-muted-foreground">
          Enter the client and vehicle details for this deal
        </p>
      </div>

      <div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex gap-3 items-center mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Client Information</h3>
            </div>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>First Name *</FieldLabel>
                  <FieldContent>
                    <Input
                      value={clientData.firstName}
                      onChange={(e) =>
                        updateClientField("firstName", e.target.value)
                      }
                      required
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Last Name *</FieldLabel>
                  <FieldContent>
                    <Input
                      value={clientData.lastName}
                      onChange={(e) =>
                        updateClientField("lastName", e.target.value)
                      }
                      required
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <div className="space-y-1">
                    <Input
                      type="email"
                      value={clientData.email}
                      onChange={(e) => updateClientField("email", e.target.value)}
                      className={validationErrors.client?.email ? "border-destructive" : ""}
                    />
                    {validationErrors.client?.email && (
                      <p className="text-xs text-destructive">{validationErrors.client.email}</p>
                    )}
                  </div>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Phone</FieldLabel>
                <FieldContent>
                  <div className="space-y-1">
                    <Input
                      type="tel"
                      value={clientData.phone}
                      onChange={(e) => updateClientField("phone", e.target.value)}
                      className={validationErrors.client?.phone ? "border-destructive" : ""}
                    />
                    {validationErrors.client?.phone && (
                      <p className="text-xs text-destructive">{validationErrors.client.phone}</p>
                    )}
                  </div>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.address}
                    onChange={(e) =>
                      updateClientField("address", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Address Line 2</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.addressLine2}
                    onChange={(e) =>
                      updateClientField("addressLine2", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <FieldContent>
                    <Input
                      value={clientData.city}
                      onChange={(e) =>
                        updateClientField("city", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>State</FieldLabel>
                  <FieldContent>
                    <Input
                      value={clientData.state}
                      onChange={(e) =>
                        updateClientField("state", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>ZIP Code</FieldLabel>
                  <FieldContent>
                    <Input
                      value={clientData.zipCode}
                      onChange={(e) =>
                        updateClientField("zipCode", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field>
                <FieldLabel>Driver's License</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.driversLicense}
                    onChange={(e) =>
                      updateClientField("driversLicense", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </Card>

          <Card className="p-6">
            <div className="flex gap-3 items-center mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold">Co-Buyer Information (Optional)</h3>
            </div>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>First Name</FieldLabel>
                  <FieldContent>
                    <Input
                      value={cobuyerData.firstName}
                      onChange={(e) =>
                        updateCobuyerField("firstName", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Last Name</FieldLabel>
                  <FieldContent>
                    <Input
                      value={cobuyerData.lastName}
                      onChange={(e) =>
                        updateCobuyerField("lastName", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <div className="space-y-1">
                    <Input
                      type="email"
                      value={cobuyerData.email}
                      onChange={(e) =>
                        updateCobuyerField("email", e.target.value)
                      }
                      className={validationErrors.cobuyer?.email ? "border-destructive" : ""}
                    />
                    {validationErrors.cobuyer?.email && (
                      <p className="text-xs text-destructive">{validationErrors.cobuyer.email}</p>
                    )}
                  </div>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Phone</FieldLabel>
                <FieldContent>
                  <div className="space-y-1">
                    <Input
                      type="tel"
                      value={cobuyerData.phone}
                      onChange={(e) =>
                        updateCobuyerField("phone", e.target.value)
                      }
                      className={validationErrors.cobuyer?.phone ? "border-destructive" : ""}
                    />
                    {validationErrors.cobuyer?.phone && (
                      <p className="text-xs text-destructive">{validationErrors.cobuyer.phone}</p>
                    )}
                  </div>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <FieldContent>
                  <Input
                    value={cobuyerData.address}
                    onChange={(e) =>
                      updateCobuyerField("address", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Address Line 2</FieldLabel>
                <FieldContent>
                  <Input
                    value={cobuyerData.addressLine2}
                    onChange={(e) =>
                      updateCobuyerField("addressLine2", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <FieldContent>
                    <Input
                      value={cobuyerData.city}
                      onChange={(e) =>
                        updateCobuyerField("city", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>State</FieldLabel>
                  <FieldContent>
                    <Input
                      value={cobuyerData.state}
                      onChange={(e) =>
                        updateCobuyerField("state", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>ZIP Code</FieldLabel>
                  <FieldContent>
                    <Input
                      value={cobuyerData.zipCode}
                      onChange={(e) =>
                        updateCobuyerField("zipCode", e.target.value)
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field>
                <FieldLabel>Driver's License</FieldLabel>
                <FieldContent>
                  <Input
                    value={cobuyerData.driversLicense}
                    onChange={(e) =>
                      updateCobuyerField("driversLicense", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex gap-3 items-center mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Car className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold">Vehicle Information</h3>
          </div>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>VIN *</FieldLabel>
                <FieldContent>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={vehicleData.vin}
                        onChange={(e) => updateVehicleField("vin", e.target.value.toUpperCase())}
                        className={validationErrors.vehicle?.vin ? "border-destructive" : vinDecoded ? "border-green-500" : ""}
                        placeholder="17-character VIN"
                        maxLength={17}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleDecodeVIN}
                        disabled={vinDecoding || !vehicleData.vin || vehicleData.vin.length !== 17 || !!validationErrors.vehicle?.vin}
                        title="Decode VIN to auto-fill vehicle details"
                      >
                        {vinDecoding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : vinDecoded ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {validationErrors.vehicle?.vin && (
                      <p className="flex gap-1 items-center text-xs text-destructive">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.vehicle.vin}
                      </p>
                    )}
                    {vinDecoded && !validationErrors.vehicle?.vin && (
                      <p className="flex gap-1 items-center text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        VIN decoded - vehicle details auto-filled
                      </p>
                    )}
                  </div>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Stock Number</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.stockNumber}
                    onChange={(e) =>
                      updateVehicleField("stockNumber", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>Year *</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    value={vehicleData.year}
                    onChange={(e) => updateVehicleField("year", e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Make *</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.make}
                    onChange={(e) => updateVehicleField("make", e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Model *</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.model}
                    onChange={(e) =>
                      updateVehicleField("model", e.target.value)
                    }
                    required
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Trim</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.trim}
                    onChange={(e) => updateVehicleField("trim", e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Body Type</FieldLabel>
                <FieldContent>
                  <Select
                    value={vehicleData.body}
                    onValueChange={(value) => updateVehicleField("body", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select body type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="coupe">Coupe</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="hatchback">Hatchback</SelectItem>
                      <SelectItem value="convertible">Convertible</SelectItem>
                      <SelectItem value="wagon">Wagon</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Field>
                <FieldLabel>Doors</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    value={vehicleData.doors}
                    onChange={(e) =>
                      updateVehicleField("doors", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Transmission</FieldLabel>
                <FieldContent>
                  <Select
                    value={vehicleData.transmission}
                    onValueChange={(value) =>
                      updateVehicleField("transmission", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="cvt">CVT</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Engine</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.engine}
                    onChange={(e) =>
                      updateVehicleField("engine", e.target.value)
                    }
                    placeholder="e.g., 2.0L"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Cylinders</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    value={vehicleData.cylinders}
                    onChange={(e) =>
                      updateVehicleField("cylinders", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Title Number</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.titleNumber}
                    onChange={(e) =>
                      updateVehicleField("titleNumber", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Color</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.color}
                    onChange={(e) =>
                      updateVehicleField("color", e.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>Mileage *</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    value={vehicleData.mileage}
                    onChange={(e) =>
                      updateVehicleField("mileage", e.target.value)
                    }
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Price *</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    step="0.01"
                    value={vehicleData.price}
                    onChange={(e) =>
                      updateVehicleField("price", e.target.value)
                    }
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Cost</FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    step="0.01"
                    value={vehicleData.cost}
                    onChange={(e) => updateVehicleField("cost", e.target.value)}
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel>Status *</FieldLabel>
              <FieldContent>
                <Select
                  value={vehicleData.status}
                  onValueChange={(value) => updateVehicleField("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <FieldContent>
                <Input
                  value={vehicleData.description}
                  onChange={(e) =>
                    updateVehicleField("description", e.target.value)
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </Card>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/standalone/deals" })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={
            createClientMutation.isPending || createVehicleMutation.isPending
          }
        >
          {createClientMutation.isPending || createVehicleMutation.isPending
            ? "Saving..."
            : "Next: Details"}
        </Button>
      </div>
    </div>
  );
}
