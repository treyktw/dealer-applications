// src/app/(dashboard)/inventory/_components/tabs/VehicleFeaturesTab.tsx
"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { VehicleFormValues } from "@/lib/schemas";


interface VehicleFeaturesTabProps {
  form: UseFormReturn<VehicleFormValues>;
}

export default function VehicleFeaturesTab({ form }: VehicleFeaturesTabProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Features & Options</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Features List</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter each feature on a new line&#10;e.g., Panoramic Sunroof&#10;Heated Seats&#10;Navigation System"
                  className="min-h-[300px] font-mono"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </>
  );
}