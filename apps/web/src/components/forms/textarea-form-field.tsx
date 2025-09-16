// src/components/ui/textarea-form-field.tsx
"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface TextareaFormFieldProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
}

export function TextareaFormField({
  name,
  label,
  description,
  placeholder,
  className,
}: TextareaFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Textarea 
              placeholder={placeholder} 
              className={className}
              {...field} 
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}