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
import { User, Car } from "lucide-react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient, updateClient, getClient } from "@/lib/local-storage/local-clients-service";
import { createVehicle, updateVehicle, getVehicleByVIN, getVehicle } from "@/lib/local-storage/local-vehicles-service";
import { createDeal, updateDeal, getDealsByStatus } from "@/lib/local-storage/local-deals-service";
import { useWizard } from "@/lib/providers/WizardProvider";

export const Route = createFileRoute("/standalone/deals/new/client-vehicle")({
  component: ClientVehicleStep,
});

function ClientVehicleStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { formData, updateFormData, setCurrentStep } = useWizard();
  
  // Track dealId using ref to persist across renders
  const dealIdRef = useRef<string>("");
  const isInitializedRef = useRef(false);
  
  // Load most recent draft deal on mount
  const { data: draftDeal } = useQuery({
    queryKey: ["draft-deal"],
    queryFn: async () => {
      const drafts = await getDealsByStatus("draft");
      // Get the most recent draft
      const sorted = drafts.sort((a, b) => b.updatedAt - a.updatedAt);
      return sorted[0];
    },
    staleTime: Infinity, // Only fetch once
  });

  // Load client and vehicle data if draft deal exists
  const { data: loadedClient } = useQuery({
    queryKey: ["draft-client", draftDeal?.clientId],
    queryFn: () => draftDeal?.clientId ? getClient(draftDeal.clientId) : Promise.resolve(undefined),
    enabled: !!draftDeal?.clientId,
  });

  const { data: loadedVehicle } = useQuery({
    queryKey: ["draft-vehicle", draftDeal?.vehicleId],
    queryFn: () => draftDeal?.vehicleId ? getVehicle(draftDeal.vehicleId) : Promise.resolve(undefined),
    enabled: !!draftDeal?.vehicleId,
  });

  // Initialize form data from saved draft or wizard context
  const initializeFormData = useCallback(() => {
    if (isInitializedRef.current) return;
    
    // Normalize client data - convert LocalClient to form data format
    const normalizeClientData = (client: typeof loadedClient) => {
      if (!client) return undefined;
      return {
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zipCode: client.zipCode || "",
        driversLicense: client.driversLicense || "",
      };
    };

    // Normalize vehicle data - convert LocalVehicle to form data format
    const normalizeVehicleData = (vehicle: typeof loadedVehicle) => {
      if (!vehicle) return undefined;
      return {
        vin: vehicle.vin || "",
        stockNumber: vehicle.stockNumber || "",
        year: vehicle.year || new Date().getFullYear(),
        make: vehicle.make || "",
        model: vehicle.model || "",
        trim: vehicle.trim || "",
        mileage: vehicle.mileage || 0,
        color: vehicle.color || "",
        price: vehicle.price || 0,
        cost: vehicle.cost || 0,
        status: vehicle.status || "available",
        description: vehicle.description || "",
      };
    };

    // Prefer loaded data from database, then wizard context, then defaults
    const initialClientData = normalizeClientData(loadedClient) || formData.clientData || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      driversLicense: "",
    };

    const initialVehicleData = normalizeVehicleData(loadedVehicle) || formData.vehicleData || {
      vin: "",
      stockNumber: "",
      year: new Date().getFullYear(),
      make: "",
      model: "",
      trim: "",
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
        clientId: draftDeal.clientId,
        vehicleId: draftDeal.vehicleId,
        clientData: initialClientData,
        vehicleData: initialVehicleData,
      });
    } else {
      updateFormData({
        clientData: initialClientData,
        vehicleData: initialVehicleData,
      });
    }

    isInitializedRef.current = true;
  }, [loadedClient, loadedVehicle, draftDeal, formData, updateFormData]);

  // Initialize on mount or when data loads
  useEffect(() => {
    if (loadedClient !== undefined || loadedVehicle !== undefined || draftDeal !== undefined) {
      initializeFormData();
    }
  }, [loadedClient, loadedVehicle, draftDeal, initializeFormData]);

  const [clientData, setClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    driversLicense: "",
  });

  // Store number fields as strings to allow clearing/editing
  const [vehicleData, setVehicleData] = useState({
    vin: "",
    stockNumber: "",
    year: new Date().getFullYear().toString(),
    make: "",
    model: "",
    trim: "",
    mileage: "",
    color: "",
    price: "",
    cost: "",
    status: "available",
    description: "",
  });

  // Sync state with loaded data
  useEffect(() => {
    if (loadedClient) {
      setClientData({
        firstName: loadedClient.firstName || "",
        lastName: loadedClient.lastName || "",
        email: loadedClient.email || "",
        phone: loadedClient.phone || "",
        address: loadedClient.address || "",
        city: loadedClient.city || "",
        state: loadedClient.state || "",
        zipCode: loadedClient.zipCode || "",
        driversLicense: loadedClient.driversLicense || "",
      });
    } else if (formData.clientData) {
      setClientData(formData.clientData);
    }
  }, [loadedClient, formData.clientData]);

  useEffect(() => {
    if (loadedVehicle) {
      setVehicleData({
        vin: loadedVehicle.vin || "",
        stockNumber: loadedVehicle.stockNumber || "",
        year: loadedVehicle.year?.toString() || new Date().getFullYear().toString(),
        make: loadedVehicle.make || "",
        model: loadedVehicle.model || "",
        trim: loadedVehicle.trim || "",
        mileage: loadedVehicle.mileage?.toString() || "",
        color: loadedVehicle.color || "",
        price: loadedVehicle.price?.toString() || "",
        cost: loadedVehicle.cost?.toString() || "",
        status: loadedVehicle.status || "available",
        description: loadedVehicle.description || "",
      });
    } else if (formData.vehicleData) {
      setVehicleData({
        ...formData.vehicleData,
        year: formData.vehicleData.year?.toString() || new Date().getFullYear().toString(),
        mileage: formData.vehicleData.mileage?.toString() || "",
        price: formData.vehicleData.price?.toString() || "",
        cost: formData.vehicleData.cost?.toString() || "",
      });
    }
  }, [loadedVehicle, formData.vehicleData]);

  const createClientMutation = useMutation({
    mutationFn: createClient,
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

  // Auto-save form data with debouncing
  const debouncedFormData = useMemo(() => {
    return {
      clientData,
      vehicleData: {
        ...vehicleData,
        // Convert string numbers back to numbers for storage
        // Only convert if string is not empty, otherwise keep as empty string for now
        year: vehicleData.year.trim() ? parseInt(vehicleData.year) || new Date().getFullYear() : new Date().getFullYear(),
        mileage: vehicleData.mileage.trim() ? parseInt(vehicleData.mileage) || 0 : 0,
        price: vehicleData.price.trim() ? parseFloat(vehicleData.price) || 0 : 0,
        cost: vehicleData.cost.trim() ? parseFloat(vehicleData.cost) || 0 : 0,
      },
    };
  }, [clientData, vehicleData]);

  // Debounced auto-save effect - saves to both wizard context and IndexedDB
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Update wizard context
      updateFormData(debouncedFormData);

      // Save to IndexedDB
      try {
        const { clientData, vehicleData } = debouncedFormData;
        let clientId = formData.clientId;
        let vehicleId = formData.vehicleId;
        let dealId = dealIdRef.current;

        // Create or update client if we have minimum required data
        if (clientData.firstName && clientData.lastName) {
          if (clientId) {
            // Update existing client
            await updateClient(clientId, {
              firstName: clientData.firstName,
              lastName: clientData.lastName,
              email: clientData.email || undefined,
              phone: clientData.phone || undefined,
              address: clientData.address || undefined,
              city: clientData.city || undefined,
              state: clientData.state || undefined,
              zipCode: clientData.zipCode || undefined,
            });
          } else {
            // Create new client
            const newClient = await createClient({
              firstName: clientData.firstName,
              lastName: clientData.lastName,
              email: clientData.email || undefined,
              phone: clientData.phone || undefined,
              address: clientData.address || undefined,
              city: clientData.city || undefined,
              state: clientData.state || undefined,
              zipCode: clientData.zipCode || undefined,
            });
            clientId = newClient.id;
            updateFormData({ clientId, selectedClient: newClient });
          }
        }

        // Create or update vehicle if we have minimum required data
        if (vehicleData.vin && vehicleData.make && vehicleData.model && vehicleData.year) {
          // Check if vehicle with this VIN already exists
          const existingVehicle = await getVehicleByVIN(vehicleData.vin);
          
          if (existingVehicle) {
            // Update existing vehicle
            await updateVehicle(existingVehicle.id, {
              vin: vehicleData.vin,
              stockNumber: vehicleData.stockNumber || undefined,
              year: vehicleData.year,
              make: vehicleData.make,
              model: vehicleData.model,
              trim: vehicleData.trim || undefined,
              mileage: vehicleData.mileage,
              color: vehicleData.color || undefined,
              price: vehicleData.price,
              cost: vehicleData.cost || undefined,
              status: vehicleData.status,
              description: vehicleData.description || undefined,
            });
            vehicleId = existingVehicle.id;
            updateFormData({ vehicleId, selectedVehicle: existingVehicle });
          } else if (vehicleId) {
            // Update existing vehicle by ID
            await updateVehicle(vehicleId, {
              vin: vehicleData.vin,
              stockNumber: vehicleData.stockNumber || undefined,
              year: vehicleData.year,
              make: vehicleData.make,
              model: vehicleData.model,
              trim: vehicleData.trim || undefined,
              mileage: vehicleData.mileage,
              color: vehicleData.color || undefined,
              price: vehicleData.price,
              cost: vehicleData.cost || undefined,
              status: vehicleData.status,
              description: vehicleData.description || undefined,
            });
          } else {
            // Create new vehicle
            const newVehicle = await createVehicle({
              vin: vehicleData.vin,
              stockNumber: vehicleData.stockNumber || undefined,
              year: vehicleData.year,
              make: vehicleData.make,
              model: vehicleData.model,
              trim: vehicleData.trim || undefined,
              mileage: vehicleData.mileage,
              color: vehicleData.color || undefined,
              price: vehicleData.price,
              cost: vehicleData.cost || undefined,
              status: vehicleData.status,
              description: vehicleData.description || undefined,
            });
            vehicleId = newVehicle.id;
            updateFormData({ vehicleId, selectedVehicle: newVehicle });
          }
        }

        // Create or update draft deal if we have client and vehicle
        if (clientId && vehicleId) {
          const dealData = {
            type: formData.type || "retail",
            clientId,
            vehicleId,
            status: "draft",
            totalAmount: vehicleData.price || 0,
            saleAmount: vehicleData.price || 0,
            documentIds: formData.documentIds || [],
          };

          if (dealId) {
            // Update existing deal
            await updateDeal(dealId, dealData);
          } else {
            // Create new draft deal
            const newDeal = await createDeal(dealData);
            dealId = newDeal.id;
            dealIdRef.current = newDeal.id;
            queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
          }
        }
      } catch (error) {
        // Silently fail auto-save errors - don't interrupt user typing
        console.error("❌ [AUTO-SAVE] Error saving to database:", error);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [debouncedFormData, updateFormData, formData, queryClient]);

  // Memoized update handlers for client data
  const updateClientField = useCallback((field: keyof typeof clientData, value: string) => {
    setClientData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Memoized update handlers for vehicle data
  const updateVehicleField = useCallback((field: keyof typeof vehicleData, value: string | number) => {
    setVehicleData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleNext = async () => {
    if (!clientData.firstName || !clientData.lastName) {
      toast.error("Please enter client first and last name");
      return;
    }

    // Convert string numbers to actual numbers for validation
    const yearNum = vehicleData.year ? parseInt(vehicleData.year) : 0;
    const priceNum = vehicleData.price ? parseFloat(vehicleData.price) : 0;
    const mileageNum = vehicleData.mileage ? parseInt(vehicleData.mileage) : 0;

    if (!vehicleData.vin || !vehicleData.make || !vehicleData.model || !yearNum) {
      toast.error("Please enter all required vehicle information (VIN, Make, Model, Year)");
      return;
    }

    if (priceNum <= 0) {
      toast.error("Please enter a valid vehicle price");
      return;
    }

    try {
      // Final update with converted numbers
      const finalVehicleData = {
        ...vehicleData,
        year: yearNum,
        mileage: mileageNum,
        price: priceNum,
        cost: vehicleData.cost ? parseFloat(vehicleData.cost) : 0,
      };

      updateFormData({
        clientData,
        vehicleData: finalVehicleData,
      });

      // Use existing client/vehicle if auto-save already created them, otherwise create new ones
      let finalClient = formData.selectedClient;
      let finalVehicle = formData.selectedVehicle;

      if (!finalClient || !formData.clientId) {
        // Create client if it doesn't exist
        finalClient = await createClientMutation.mutateAsync({
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email || undefined,
          phone: clientData.phone || undefined,
          address: clientData.address || undefined,
          city: clientData.city || undefined,
          state: clientData.state || undefined,
          zipCode: clientData.zipCode || undefined,
        });
      }

      if (!finalVehicle || !formData.vehicleId) {
        // Check if vehicle with this VIN already exists
        const existingVehicle = await getVehicleByVIN(vehicleData.vin);
        
        if (existingVehicle) {
          finalVehicle = existingVehicle;
        } else {
          // Create vehicle if it doesn't exist
          finalVehicle = await createVehicleMutation.mutateAsync({
            vin: vehicleData.vin,
            stockNumber: vehicleData.stockNumber || undefined,
            year: yearNum,
            make: vehicleData.make,
            model: vehicleData.model,
            trim: vehicleData.trim || undefined,
            mileage: mileageNum,
            color: vehicleData.color || undefined,
            price: priceNum,
            cost: vehicleData.cost ? parseFloat(vehicleData.cost) : 0,
            status: vehicleData.status,
            description: vehicleData.description || undefined,
          });
        }
      }

      updateFormData({
        clientId: finalClient.id,
        vehicleId: finalVehicle.id,
        selectedClient: finalClient,
        selectedVehicle: finalVehicle,
        saleAmount: priceNum,
        totalAmount: priceNum,
      });

      toast.success("Client and vehicle information saved");
      setCurrentStep(2);
      navigate({ to: "/standalone/deals/new/details" });
    } catch {
      // Error handling is done in mutation onError
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Client & Vehicle Information</h2>
        <p className="text-muted-foreground">
          Enter the client and vehicle details for this deal
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
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
                    onChange={(e) => updateClientField("firstName", e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Last Name *</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.lastName}
                    onChange={(e) => updateClientField("lastName", e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <Input
                  type="email"
                  value={clientData.email}
                  onChange={(e) => updateClientField("email", e.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <FieldContent>
                <Input
                  type="tel"
                  value={clientData.phone}
                  onChange={(e) => updateClientField("phone", e.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Address</FieldLabel>
              <FieldContent>
                <Input
                  value={clientData.address}
                  onChange={(e) => updateClientField("address", e.target.value)}
                />
              </FieldContent>
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel>City</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.city}
                    onChange={(e) => updateClientField("city", e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>State</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.state}
                    onChange={(e) => updateClientField("state", e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>ZIP Code</FieldLabel>
                <FieldContent>
                  <Input
                    value={clientData.zipCode}
                    onChange={(e) => updateClientField("zipCode", e.target.value)}
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel>Driver's License</FieldLabel>
              <FieldContent>
                <Input
                  value={clientData.driversLicense}
                  onChange={(e) => updateClientField("driversLicense", e.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Car className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold">Vehicle Information</h3>
          </div>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>VIN *</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.vin}
                    onChange={(e) => updateVehicleField("vin", e.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Stock Number</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.stockNumber}
                    onChange={(e) => updateVehicleField("stockNumber", e.target.value)}
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
                    onChange={(e) => updateVehicleField("model", e.target.value)}
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
                <FieldLabel>Color</FieldLabel>
                <FieldContent>
                  <Input
                    value={vehicleData.color}
                    onChange={(e) => updateVehicleField("color", e.target.value)}
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
                    onChange={(e) => updateVehicleField("mileage", e.target.value)}
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
                    onChange={(e) => updateVehicleField("price", e.target.value)}
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
                  onChange={(e) => updateVehicleField("description", e.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </Card>
      </div>

      <div className="flex justify-end gap-2 pt-4">
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