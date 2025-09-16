"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  Form,

} from "@/components/ui/form";


import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import  {
  VehicleImage,
} from "@/components/dashboard/s3-image-uploader";

import { vehicleFormSchema, VehicleFormValues } from "@/lib/schemas";
import VehicleDetailsTab from "./vehicle-details";
import VehicleFeaturesTab from "./vehicle-features";
import VehicleImagesTab from "./vehicle-image-tab";
import VehicleSpecsTab from "./vehicle-specs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";


export default function EditVehiclePage({
  params,
}: {
  params: { id: string };
}) {
  const [activeTab, setActiveTab] = useState("details");
  const router = useRouter();
  // Convex hooks
  const vehicleId = params.id as Id<'vehicles'>;
  const vehicle = useQuery(api.inventory.getVehicle, params.id && params.id.trim() !== "" ? { id: vehicleId } : "skip");
  const updateVehicle = useMutation(api.inventory.updateVehicle);
  const [vehicleImages, setVehicleImages] = useState<VehicleImage[]>([]);
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      price: 0,
      vin: "",
      stock: "",
      mileage: 0,
      exteriorColor: "",
      interiorColor: "",
      transmission: "",
      fuelType: "",
      engine: "",
      description: "",
      status: "available",
      featured: false,
    },
  });
  useEffect(() => {
    if (vehicle) {
      form.reset({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        vin: vehicle.vin,
        stock: vehicle.stock,
        mileage: vehicle.mileage,
        exteriorColor: vehicle.exteriorColor || "",
        interiorColor: vehicle.interiorColor || "",
        transmission: vehicle.transmission || "",
        fuelType: vehicle.fuelType || "",
        engine: vehicle.engine || "",
        description: vehicle.description || "",
        status: vehicle.status.toLowerCase() as "available" | "sold" | "pending" | "reserved",
        featured: vehicle.featured,
      });
      // Filter out vehicleId from images to match the mutation validator
      const filteredImages = (vehicle.images || []).map(image => {
        const { ...filteredImage } = image;
        return filteredImage;
      });
      setVehicleImages(filteredImages);
    }
  }, [vehicle, form]);
  const [isLoading, setIsLoading] = useState(false);
  async function onSubmit(data: VehicleFormValues) {
    if (!vehicle) return;
    try {
      setIsLoading(true);
      // Filter out vehicleId from images to match the mutation validator
      const filteredImages = vehicleImages.map(image => {
        const { ...filteredImage } = image;
        return filteredImage;
      });
      await updateVehicle({
        id: vehicleId,
        ...data,
        images: filteredImages,
      });
      toast.success("Vehicle updated successfully");
      router.push(`/inventory/${params.id}`);
    } catch (error) {
      toast.error(`Failed to update vehicle: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }
  function handleImagesChange(images: VehicleImage[]) {
    setVehicleImages(images);
  }
  if (!vehicle) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Vehicle</h1>
          <p className="text-muted-foreground">Update vehicle information</p>
        </div>

        <Button variant="outline" asChild>
          <Link href={`/inventory/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <TabsContent value="details">
                <VehicleDetailsTab form={form} />
              </TabsContent>

              <TabsContent value="specs">
                <VehicleSpecsTab form={form} />
              </TabsContent>

              <TabsContent value="features">
                <VehicleFeaturesTab form={form} />
              </TabsContent>

              <TabsContent value="images">
                <VehicleImagesTab 
                  form={form}
                  vehicleId={params.id}
                  vehicleImages={vehicleImages}
                  onImagesChange={handleImagesChange}
                />
              </TabsContent>

              <div className="border-t p-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/inventory/${params.id}`)}
                  disabled={isLoading || form.formState.isSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading || form.formState.isSubmitting}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Vehicle
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}