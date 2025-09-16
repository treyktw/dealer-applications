// src/components/ui/custom-form-field.tsx
"use client";

import { ReactNode } from "react";
import { useFormContext, ControllerRenderProps, FieldValues } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";

interface CustomFormFieldProps {
  name: string;
  label?: string;
  description?: string;
  children: ReactNode;
}

export function CustomFormField({
  name,
  label,
  description,
  children,
}: CustomFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>{typeof children === 'function' ? (children as (field: ControllerRenderProps<FieldValues, string>) => ReactNode)(field) : children}</FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
