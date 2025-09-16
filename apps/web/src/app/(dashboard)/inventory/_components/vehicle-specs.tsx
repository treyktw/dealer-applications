// src/app/(dashboard)/inventory/_components/tabs/VehicleSpecsTab.tsx
"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { VehicleFormValues } from "@/lib/schemas";



interface VehicleSpecsTabProps {
  form: UseFormReturn<VehicleFormValues>;
}

export default function VehicleSpecsTab({ form }: VehicleSpecsTabProps) {
  return (
    <>
      <CardHeader>
        <CardTitle>Specifications</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mileage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 5250"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transmission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transmission</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Automatic" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fuelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Gasoline" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="engine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engine</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 3.0L Inline-6 Turbo"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="exteriorColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exterior Color</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Black Sapphire Metallic" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interiorColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interior Color</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Cognac" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </>
  );
}