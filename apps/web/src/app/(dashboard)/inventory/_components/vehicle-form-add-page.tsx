"use client";

import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react";
import { FormWrapper } from "@/components/forms/form-wrapper";
import { InputFormField } from "@/components/forms/input-form-field";
import { SelectFormField } from "@/components/forms/select-form-field";
import { TextareaFormField } from "@/components/forms/textarea-form-field";
import VehicleImagesTab from "./vehicle-image-tab";
import { VehicleImage as S3VehicleImage } from "@/components/dashboard/s3-image-uploader";
import { useFormContext, UseFormReturn } from "react-hook-form";
import { VehicleFormValues } from "@/lib/schemas";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Form schema
const vehicleFormSchema = z.object({
  stock: z.string().min(1, "Stock number is required"),
  vin: z.string().min(1, "VIN is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  trim: z.string().optional(),
  mileage: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  engine: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["available", "sold", "pending", "reserved"] as const),
  featured: z.boolean(),
  features: z.string().optional(),
  images: z
    .array(
      z.object({
        url: z.string(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
});

type LocalVehicleFormValues = z.infer<typeof vehicleFormSchema>;

// Default form values
const defaultValues: LocalVehicleFormValues = {
  stock: "",
  vin: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  trim: "",
  mileage: 0,
  price: 0,
  exteriorColor: "",
  interiorColor: "",
  fuelType: "",
  transmission: "",
  engine: "",
  description: "",
  status: "available",
  featured: false,
  features: "",
  images: [],
};

interface VehicleAddFormPageProps {
  params?: { id: string };
}

export default function VehicleAddFormPage({
  params,
}: VehicleAddFormPageProps) {
  const isEditing = !!params?.id;
  const [isLoading, setIsLoading] = useState(isEditing);
  const [activeTab, setActiveTab] = useState("details");

  // Convex queries and mutations - FIXED: Use correct parameter names
  const vehicle = useQuery(
    api.inventory.getVehicle,
    isEditing && params?.id ? { id: params.id as Id<"vehicles"> } : "skip"
  );
  const [imageUrls, setImageUrls] = useState<S3VehicleImage[]>(
    vehicle?.images?.map((img) => ({
      url: img.url,
      isPrimary: img.isPrimary || false,
    })) || []
  );
  const router = useRouter();
  const form = useFormContext() as UseFormReturn<VehicleFormValues>;

  // Get current dealership from authenticated user
  const currentDealership = useQuery(api.dealerships.getCurrentDealership);

  // Create initial values based on whether we're editing
  const initialValues = vehicle
    ? {
        stock: vehicle.stock,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        trim: vehicle.trim || "",
        mileage: vehicle.mileage,
        price: vehicle.price,
        exteriorColor: vehicle.exteriorColor || "",
        interiorColor: vehicle.interiorColor || "",
        fuelType: vehicle.fuelType || "",
        transmission: vehicle.transmission || "",
        engine: vehicle.engine || "",
        description: vehicle.description || "",
        status: vehicle.status.toLowerCase() as
          | "available"
          | "sold"
          | "pending"
          | "reserved",
        featured: vehicle.featured,
        features: vehicle.features || "",
        images:
          vehicle.images?.map((img) => ({
            url: img.url,
            isPrimary: img.isPrimary || false,
          })) || [],
      }
    : defaultValues;

  const createVehicle = useMutation(api.inventory.createVehicle);
  const updateVehicle = useMutation(api.inventory.updateVehicle);
  const deleteVehicle = useMutation(api.inventory.deleteVehicle);

  // Check if we have dealership data
  const dealershipId = currentDealership?._id;
  // Load vehicle data if editing - MOVED TO TOP to follow React hooks rules

  // Show loading state if we're still fetching dealership data
  if (currentDealership === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dealership information...</span>
      </div>
    );
  }

  // Show error if no dealership found
  if (currentDealership === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold">No Dealership Found</h2>
          <p className="text-muted-foreground">
            You need to be associated with a dealership to add vehicles.
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>
      </div>
    );
  }

  // Handle form submission
  const onSubmit = async (data: LocalVehicleFormValues) => {
    if (!dealershipId) {
      toast.error(
        "Unable to determine dealership. Please try refreshing the page."
      );
      return;
    }

    try {
      setIsLoading(true);

      // Convert features from string to array
      const featuresArray = data.features
        ? data.features.split("\n").filter((line) => line.trim().length > 0)
        : [];

      // Create the vehicle object
      const vehicleData = {
        ...data,
        year: parseInt(data.year.toString()),
        price: parseFloat(data.price.toString().replace(/,/g, "")),
        mileage: parseInt(data.mileage.toString().replace(/,/g, "")),
        features: featuresArray.join("\n"),
        images: imageUrls.map((img) => ({
          url: img.url,
          isPrimary: img.isPrimary || false,
        })),
      };

      if (isEditing && params?.id) {
        // FIXED: Remove dealershipId from update call since it's not in the args
        await updateVehicle({
          id: params.id as Id<"vehicles">,
          ...vehicleData,
        });
        toast.success("Vehicle Updated");
      } else {
        // Include dealershipId only for create
        await createVehicle({
          ...vehicleData,
          dealershipId: dealershipId,
        });
        toast.success("Vehicle Created");
        router.push("/inventory");
        return;
      }

      router.push(isEditing ? `/inventory/${params?.id}` : "/inventory");
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error("There was a problem saving the vehicle. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle vehicle deletion
  const handleDelete = async () => {
    if (!params?.id) return;

    if (!confirm(`Are you sure you want to delete this vehicle?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteVehicle({ id: params.id as Id<"vehicles"> });
      toast.success("Vehicle deleted successfully");
      router.push("/inventory");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error(
        "There was a problem deleting the vehicle. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Edit Vehicle" : "Add New Vehicle"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Update vehicle information"
              : "Add a new vehicle to your inventory"}
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href={isEditing ? `/inventory/${params?.id}` : "/inventory"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <FormWrapper
        schema={vehicleFormSchema}
        defaultValues={initialValues}
        onSubmit={onSubmit}
      >
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <TabsContent value="details">
              <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputFormField
                    name="make"
                    label="Make"
                    placeholder="e.g., BMW"
                  />

                  <InputFormField
                    name="model"
                    label="Model"
                    placeholder="e.g., X5"
                  />

                  <InputFormField
                    name="year"
                    label="Year"
                    placeholder="e.g., 2023"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputFormField
                    name="price"
                    label="Price"
                    placeholder="e.g., 65,995"
                  />

                  <SelectFormField
                    name="status"
                    label="Status"
                    placeholder="Select status"
                    options={[
                      { value: "available", label: "Available" },
                      { value: "pending", label: "Pending" },
                      { value: "sold", label: "Sold" },
                      { value: "reserved", label: "Reserved" },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputFormField
                    name="vin"
                    label="VIN"
                    placeholder="Vehicle Identification Number"
                  />

                  <InputFormField
                    name="stock"
                    label="Stock Number"
                    placeholder="e.g., ST10025"
                  />
                </div>

                <TextareaFormField
                  name="description"
                  label="Description"
                  placeholder="Describe the vehicle features and condition"
                />
              </CardContent>
            </TabsContent>

            <TabsContent value="specs">
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputFormField
                    name="mileage"
                    label="Mileage"
                    placeholder="e.g., 5,250"
                  />

                  <InputFormField
                    name="trim"
                    label="Trim"
                    placeholder="e.g., xDrive40i"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectFormField
                    name="transmission"
                    label="Transmission"
                    placeholder="Select transmission"
                    options={[
                      { value: "Automatic", label: "Automatic" },
                      { value: "Manual", label: "Manual" },
                      { value: "CVT", label: "CVT" },
                      { value: "Semi-Automatic", label: "Semi-Automatic" },
                      { value: "Dual-Clutch", label: "Dual-Clutch" },
                    ]}
                  />

                  <SelectFormField
                    name="fuelType"
                    label="Fuel Type"
                    placeholder="Select fuel type"
                    options={[
                      { value: "Gasoline", label: "Gasoline" },
                      { value: "Diesel", label: "Diesel" },
                      { value: "Hybrid", label: "Hybrid" },
                      { value: "Electric", label: "Electric" },
                      { value: "Plug-in Hybrid", label: "Plug-in Hybrid" },
                      { value: "Flex-Fuel", label: "Flex-Fuel" },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputFormField
                    name="engine"
                    label="Engine"
                    placeholder="e.g., 3.0L Inline-6 Turbo"
                  />

                  <InputFormField
                    name="exteriorColor"
                    label="Exterior Color"
                    placeholder="e.g., Black Sapphire Metallic"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputFormField
                    name="interiorColor"
                    label="Interior Color"
                    placeholder="e.g., Cognac"
                  />
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="features">
              <CardHeader>
                <CardTitle>Features & Options</CardTitle>
              </CardHeader>

              <CardContent>
                <TextareaFormField
                  name="features"
                  label="Features List"
                  placeholder="Enter each feature on a new line&#10;e.g., Panoramic Sunroof&#10;Heated Seats&#10;Navigation System"
                  description="Enter each feature on a new line. These will be displayed as a list on the vehicle details page."
                  className="min-h-[300px] font-mono"
                />
              </CardContent>
            </TabsContent>

            <TabsContent value="images">
              <VehicleImagesTab
                form={form}
                vehicleId={params?.id || ""}
                vehicleImages={imageUrls}
                onImagesChange={setImageUrls}
              />
            </TabsContent>

            <CardFooter className="border-t p-6 flex justify-between">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Vehicle
                </Button>
              )}

              <div className={`flex gap-2 ${isEditing ? "ml-auto" : ""}`}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      isEditing ? `/inventory/${params?.id}` : "/inventory"
                    )
                  }
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? "Update Vehicle" : "Add Vehicle"}
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </Tabs>
      </FormWrapper>
    </div>
  );
}
