"use client";

import { useRouter } from "next/navigation";
import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: Partial<ClientFormValues>;
  onSubmit: (data: ClientFormValues) => void | Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
  cancelUrl?: string;
  activeTab?: string;
}

export function ClientForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = "Save Client",
  cancelUrl = "/clients",
  activeTab = "personal",
}: ClientFormProps) {
  const router = useRouter();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormValues>,
    defaultValues: {
      firstName: initialData?.firstName ?? "",
      lastName: initialData?.lastName ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      address: initialData?.address ?? "",
      city: initialData?.city ?? "",
      state: initialData?.state ?? "",
      zipCode: initialData?.zipCode ?? "",
      source: initialData?.source ?? "",
      status: initialData?.status ?? "LEAD",
      notes: initialData?.notes ?? "",
      dealershipId: initialData?.dealershipId ?? "",
    } as ClientFormValues,
  });

  const onFormSubmit: SubmitHandler<ClientFormValues> = async (data) => {
    console.log("🚀 Form submission started");
    console.log("📊 Form data:", data);
    console.log("🏢 Dealership ID:", data.dealershipId);
    
    try {
      // Validate form data
      const validatedData = clientSchema.parse(data);
      console.log("✅ Form validation passed:", validatedData);
      
      await onSubmit(validatedData);
      console.log("✅ onSubmit completed successfully");
    } catch (error) {
      console.error("❌ Error in form submission:", error);
      
      // Check if it's a validation error
      if (error instanceof z.ZodError) {
        console.error("🚨 Validation errors:", error.errors);
        error.errors.forEach((err) => {
          toast.error(`Validation Error: ${err.path.join('.')}`, {
            description: err.message
          });
        });
      } else {
        console.error("🚨 Submission error:", error);
        toast.error("Error saving client", {
          description: "There was a problem saving the client information. Please try again."
        });
      }
    }
  };

  const handleCancel = () => {
    router.push(cancelUrl);
  };

  // Debug: Log form state
  console.log("🔍 Form state:", {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
    dealershipId: form.watch("dealershipId")
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8">
        <Tabs defaultValue={activeTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="address">Address Information</TabsTrigger>
            <TabsTrigger value="additional">Additional Information</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LEAD">Lead</SelectItem>
                          <SelectItem value="CUSTOMER">Customer</SelectItem>
                          <SelectItem value="PREVIOUS">Previous</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Current relationship status with the client
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Where did this lead come from?" />
                      </FormControl>
                      <FormDescription>
                        How the client found your dealership
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="address">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="additional">
            <div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add any additional information about this client..."
                        className="min-h-32"
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Hidden field for dealershipId */}
        <FormField
          control={form.control}
          name="dealershipId"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || form.formState.isSubmitting}
            onClick={() => console.log("🔘 Submit button clicked")}
          >
            {isLoading || form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}