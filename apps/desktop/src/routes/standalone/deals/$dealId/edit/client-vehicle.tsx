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
import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateClient,
} from "@/lib/sqlite/local-clients-service";
import {
  updateVehicle,
} from "@/lib/sqlite/local-vehicles-service";
import { useWizard } from "@/lib/providers/WizardProvider";

export const Route = createFileRoute("/standalone/deals/$dealId/edit/client-vehicle")({
  component: EditClientVehicleStep,
});

function EditClientVehicleStep() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const wizard = useWizard();
  const formData = wizard?.formData || {};
  const updateFormData = wizard?.updateFormData || (() => {});

  // Initialize form state from wizard context
  const [clientData, setClientData] = useState(
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
    }
  );

  const [vehicleData, setVehicleData] = useState(
    formData.vehicleData || {
      vin: "",
      stockNumber: "",
      year: new Date().getFullYear(),
      make: "",
      model: "",
      trim: "",
      body: "",
      doors: 4,
      transmission: "",
      engine: "",
      cylinders: 4,
      titleNumber: "",
      mileage: 0,
      color: "",
      price: 0,
      cost: 0,
      status: "available",
      description: "",
    }
  );

  // Sync state with wizard context when it updates
  useEffect(() => {
    if (formData.clientData) {
      setClientData(formData.clientData);
    }
  }, [formData.clientData]);

  useEffect(() => {
    if (formData.vehicleData) {
      setVehicleData(formData.vehicleData);
    }
  }, [formData.vehicleData]);

  const updateClientField = useCallback((field: string, value: string | number) => {
    setClientData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateVehicleField = useCallback((field: string, value: string | number) => {
    setVehicleData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateClientMutation = useMutation({
    mutationFn: async () => {
      if (!formData.clientId) {
        throw new Error("Client ID is required");
      }
      return updateClient(formData.clientId, {
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email || undefined,
        phone: clientData.phone || undefined,
        address: clientData.address || undefined,
        city: clientData.city || undefined,
        state: clientData.state || undefined,
        zip_code: clientData.zipCode || undefined,
        drivers_license: clientData.driversLicense || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-client", formData.clientId] });
      toast.success("Client updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update client", { description: error.message });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async () => {
      if (!formData.vehicleId) {
        throw new Error("Vehicle ID is required");
      }
      return updateVehicle(formData.vehicleId, {
        vin: vehicleData.vin,
        stock_number: vehicleData.stockNumber || undefined,
        year: vehicleData.year,
        make: vehicleData.make,
        model: vehicleData.model,
        trim: vehicleData.trim || undefined,
        body: vehicleData.body || undefined,
        doors: vehicleData.doors || undefined,
        transmission: vehicleData.transmission || undefined,
        engine: vehicleData.engine || undefined,
        cylinders: vehicleData.cylinders || undefined,
        title_number: vehicleData.titleNumber || undefined,
        mileage: vehicleData.mileage,
        color: vehicleData.color || undefined,
        price: vehicleData.price,
        cost: vehicleData.cost || undefined,
        status: vehicleData.status,
        description: vehicleData.description || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-vehicle", formData.vehicleId] });
      toast.success("Vehicle updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update vehicle", { description: error.message });
    },
  });

  const handleNext = async () => {
    // Update wizard context
    updateFormData({
      clientData,
      vehicleData,
    });

    // Save changes
    try {
      await Promise.all([
        updateClientMutation.mutateAsync(),
        updateVehicleMutation.mutateAsync(),
      ]);

      // Navigate to details step
      navigate({
        to: `/standalone/deals/${dealId}/edit/details`,
      });
    } catch (error) {
      console.error("Error saving client/vehicle:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Information */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Client Information</h2>
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <Field>
            <FieldLabel>Address</FieldLabel>
            <FieldContent>
              <Input
                value={clientData.address}
                onChange={(e) => updateClientField("address", e.target.value)}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Address Line 2</FieldLabel>
            <FieldContent>
              <Input
                value={clientData.addressLine2 || ""}
                onChange={(e) => updateClientField("addressLine2", e.target.value)}
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

      {/* Vehicle Information */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Car className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Vehicle Information</h2>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>VIN *</FieldLabel>
            <FieldContent>
              <Input
                value={vehicleData.vin}
                onChange={(e) => updateVehicleField("vin", e.target.value.toUpperCase())}
                maxLength={17}
                required
              />
            </FieldContent>
          </Field>

          <div className="grid grid-cols-4 gap-4">
            <Field>
              <FieldLabel>Year *</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  value={vehicleData.year}
                  onChange={(e) => updateVehicleField("year", parseInt(e.target.value) || 0)}
                  min="1900"
                  max={new Date().getFullYear() + 1}
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
            <Field>
              <FieldLabel>Trim</FieldLabel>
              <FieldContent>
                <Input
                  value={vehicleData.trim}
                  onChange={(e) => updateVehicleField("trim", e.target.value)}
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
                  onChange={(e) => updateVehicleField("mileage", parseInt(e.target.value) || 0)}
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
                  onChange={(e) => updateVehicleField("price", parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => updateVehicleField("cost", parseFloat(e.target.value) || 0)}
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
        </FieldGroup>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => navigate({ to: `/standalone/deals/${dealId}` })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={updateClientMutation.isPending || updateVehicleMutation.isPending}
        >
          {updateClientMutation.isPending || updateVehicleMutation.isPending
            ? "Saving..."
            : "Next: Details"}
        </Button>
      </div>
    </div>
  );
}
