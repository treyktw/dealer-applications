// src/components/ui/select-form-field.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFormFieldProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
}

export function SelectFormField({
  name,
  label,
  description,
  placeholder,
  options,
  onValueChange,
}: SelectFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <Select
            onValueChange={(value) => {
              field.onChange(value);
              if (onValueChange) onValueChange(value);
            }}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value || "Placeholder"}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}