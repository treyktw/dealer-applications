// src/app/(dashboard)/inventory/_components/tabs/VehicleImagesTab.tsx
"use client";

import {
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import S3ImageUpload, { VehicleImage } from "@/components/dashboard/s3-image-uploader";
import { VehicleFormValues } from "@/lib/schemas";



interface VehicleImagesTabProps {
  form: UseFormReturn<VehicleFormValues> | null;
  vehicleId: string;
  vehicleImages: VehicleImage[];
  onImagesChange: (images: VehicleImage[]) => void;
}

export default function VehicleImagesTab({ 
  form, 
  vehicleId, 
  vehicleImages, 
  onImagesChange 
}: VehicleImagesTabProps) {
  // Guard against invalid vehicleId
  if (!vehicleId || vehicleId.trim() === "" || vehicleId.startsWith("test-")) {
    return (
      <CardContent className="space-y-6">
        <div className="text-center py-10 border border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {vehicleId.startsWith("test-") ? "Test mode - no vehicle selected" : "Invalid vehicle ID"}
          </p>
        </div>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Images</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <FormField
          control={form?.control}
          name="images"
          render={() => (
            <FormItem>
              <S3ImageUpload
                vehicleId={vehicleId}
                initialImages={vehicleImages}
                onImagesChange={onImagesChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </>
  );
}