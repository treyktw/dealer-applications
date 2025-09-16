// src/components/ui/form-wrapper.tsx
"use client";

import { ReactNode } from "react";
import { useForm, FormProvider, UseFormProps, FieldValues, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface FormWrapperProps<T extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<any, any, T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => void;
  children: ReactNode;
  formOptions?: Omit<UseFormProps<T>, 'resolver' | 'defaultValues'>;
}

export function FormWrapper<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  formOptions = {}
}: FormWrapperProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    ...formOptions
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );
}
