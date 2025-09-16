"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClientForm, ClientFormValues } from "@/components/forms/client/client-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { nanoid } from "nanoid";

export default function AddClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user from Convex
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId ?? null;
  const isLoadingDealership = currentUser === undefined;

  // Convex mutation for creating a client
  const createClient = useMutation(api.clients.createClient);

  console.log("🔍 AddClientPage state:", {
    currentUser,
    dealershipId,
    isLoadingDealership
  });

  // Show loading state while fetching dealership ID
  if (isLoadingDealership) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state if no dealership ID
  if (!dealershipId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="text-xl font-semibold text-destructive">Access Denied</div>
        <div className="text-muted-foreground">
          You must be associated with a dealership to create clients.
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: ClientFormValues) => {
    console.log("🚀 AddClientPage onSubmit called");
    console.log("📊 Received data:", data);
    console.log("🏢 Current dealershipId:", dealershipId);
    
    setIsSubmitting(true);
    
    try {
      // Generate a unique client ID
      const clientId = nanoid();
      
      // Prepare the data for Convex
      const clientData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.zipCode || undefined,
        source: data.source || undefined,
        status: data.status,
        notes: data.notes || undefined,
        clientId,
        dealershipId, // Use dealershipId from user query
      };

      console.log("📤 Sending to Convex:", clientData);

      const result = await createClient(clientData);
      
      console.log("✅ Client created successfully:", result);
      
      toast.success("Client Created", {
        description: `${data.firstName} ${data.lastName} has been added to your clients`
      });
      
      router.push("/clients");
    } catch (error) {
      console.error("❌ Error creating client:", error);
      
      // More detailed error handling
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        toast.error("Error Creating Client", {
          description: error.message || "Failed to create client. Please try again."
        });
      } else {
        console.error("Unknown error type:", typeof error, error);
        toast.error("Error", {
          description: "An unexpected error occurred. Please try again."
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add New Client</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>
            Enter the client&apos;s details to add them to your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm 
            initialData={{
              dealershipId, // Pass dealershipId as initial data
            }}
            onSubmit={onSubmit} 
            isLoading={isSubmitting}
            submitButtonText="Add Client"
          />
        </CardContent>
      </Card>
    </div>
  );
}