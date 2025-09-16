// src/components/ui/radio-group-form-field.tsx
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupFormFieldProps {
  name: string;
  label?: string;
  description?: string;
  options: RadioOption[];
  className?: string;
}

export function RadioGroupFormField({
  name,
  label,
  description,
  options,
  className,
}: RadioGroupFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`space-y-3 ${className || ''}`}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="flex flex-col space-y-1"
            >
              {options.map((option) => (
                <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value={option.value} />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {option.label}
                  </FormLabel>
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}