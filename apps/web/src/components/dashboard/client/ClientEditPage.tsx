"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClientForm, type ClientFormValues } from "@/components/forms/client/client-form";
import { toast } from "sonner";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ClientEditPageProps {
  params: {
    id: string;
  };
}

export default function ClientEditPage({ params }: ClientEditPageProps) {
  const { id: clientIdParam } = params;
  const clientId = clientIdParam as Id<"clients">;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch client data from Convex
  const clientData = useQuery(api.clients.getClientById, clientId ? { clientId } : "skip");
  const updateClient = useMutation(api.clients.updateClient);

  const isLoading = clientData === undefined;

  const handleUpdateClient = async (data: ClientFormValues) => {
    try {
      setIsSubmitting(true);
      await updateClient({
        ...data,
        clientId,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        zipCode: data.zipCode ?? undefined,
        source: data.source ?? undefined,
        notes: data.notes ?? undefined,
      });
      toast.success("Client Updated", {
        description: `${data.firstName} ${data.lastName}'s information has been updated`
      });
      router.push(`/clients/${clientId}`);
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Error", {
        description: error instanceof Error 
          ? error.message 
          : "Failed to update client. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The client you&apos;re trying to edit doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  // Map client status to form-compatible status
  // The form only accepts 'LEAD' | 'CUSTOMER' | 'PREVIOUS'
  // Map other statuses to the closest compatible value
  const mapStatusToFormStatus = (status: string): "LEAD" | "CUSTOMER" | "PREVIOUS" => {
    if (status === "CUSTOMER" || status === "REPEAT_CUSTOMER") {
      return "CUSTOMER";
    }
    if (status === "PREVIOUS") {
      return "PREVIOUS";
    }
    // Default to LEAD for all other statuses (PROSPECT, CONTACTED, QUALIFIED, etc.)
    return "LEAD";
  };

  // Prepare initial data with mapped status - only include fields that match ClientFormValues
  const initialFormData: Partial<ClientFormValues> = {
    firstName: clientData.firstName,
    lastName: clientData.lastName,
    email: clientData.email ?? null,
    phone: clientData.phone ?? null,
    address: clientData.address ?? null,
    city: clientData.city ?? null,
    state: clientData.state ?? null,
    zipCode: clientData.zipCode ?? null,
    source: clientData.source ?? null,
    status: mapStatusToFormStatus(clientData.status || "LEAD"),
    notes: clientData.notes ?? null,
    dealershipId: clientData.dealershipId as string,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit {clientData.firstName} {clientData.lastName}
        </h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Client Information</CardTitle>
          <CardDescription>
            Update the client&apos;s details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm 
            initialData={initialFormData}
            onSubmit={handleUpdateClient} 
            isLoading={isSubmitting}
            submitButtonText="Update Client"
            cancelUrl={`/clients/${clientId}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}