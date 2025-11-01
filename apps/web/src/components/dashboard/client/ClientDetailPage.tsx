"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Edit, Trash2, Loader2 } from "lucide-react";
import { ClientInfoCard } from "@/app/(dashboard)/clients/_components/card-component";
import { ClientNotesCard } from "@/app/(dashboard)/clients/_components/notes-card";
import { ClientVehiclesTab } from "@/app/(dashboard)/clients/_components/client-vehicles-tab";
import { ClientActivityTab } from "@/app/(dashboard)/clients/_components/activity-tab";
import { AddNoteDialog } from "@/app/(dashboard)/clients/_components/add-note-dialog";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { Activity } from "@/app/(dashboard)/clients/_components/activity-tab";

interface ClientDetailViewProps {
  clientId: string;
}

export default function ClientDetailView({ clientId: clientIdParam }: ClientDetailViewProps) {
  const clientId = clientIdParam as Id<"clients">;
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // Convex queries
  const client = useQuery(api.clients.getClientById, clientId ? { clientId } : "skip") as Doc<"clients"> | undefined;
  const relatedVehicles = (useQuery(api.clients.getClientVehicles, clientId ? { clientId } : "skip") as Doc<"vehicles">[]) || [];
  const activitiesRaw = (useQuery(api.clients.getClientActivities, clientId ? { clientId } : "skip") as Doc<"activities">[]) || [];

  // Map activities to Activity type for ClientActivityTab
  const activities: Activity[] = activitiesRaw
    .filter((a) => a.type === "NOTE" || a.type === "EMAIL")
    .map((a) => ({
      id: a._id,
      type: a.type === "NOTE" ? "note" : "email",
      content: a.content,
      date: new Date(a.createdAt).toISOString(),
      user: a.userId ?? "Unknown",
    }));

  // Map vehicles to Vehicle type for ClientVehiclesTab
  const statusMap = {
    AVAILABLE: "available",
    SOLD: "sold",
    PENDING: "pending",
    RESERVED: "reserved",
  } as const;
  const vehicles = relatedVehicles.map((v) => ({
    id: v._id,
    make: v.make,
    model: v.model,
    year: v.year,
    price: v.price,
    status: statusMap[v.status as keyof typeof statusMap],
  }));

  // Convex mutations
  const deleteClient = useMutation(api.clients.deleteClient);
  const addClientNote = useMutation(api.clients.addClientNote);

  const isLoading = client === undefined;
  const error = !isLoading && !client ? "Client not found" : null;

  // Format date for display
  const formatDate = (date: number) => {
    return new Date(date).toLocaleDateString();
  };

  // Handle delete client
  const handleDeleteClient = async () => {
    if (!client) return;
    if (!confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await deleteClient({ clientId });
      toast.success("Client Deleted", {
        description: `${client.firstName} ${client.lastName} has been deleted`
      });
      router.push("/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "There was a problem deleting the client. Please try again."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle add note
  const handleAddNote = async (content: string) => {
    if (!client) return;
    try {
      await addClientNote({ clientId, content });
      toast.success("Note Added", {
        description: "Your note has been added to the client's activity history"
      });
      setIsAddNoteOpen(false);
      // Optionally, you can refetch activities here if needed
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "There was a problem adding the note. Please try again."
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  };

  if (error || !client) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <h2 className="mb-2 text-xl font-semibold">
          {error === "Client not found" ? "Client Not Found" : "Error Loading Client"}
        </h2>
        <p className="mb-4 text-muted-foreground">
          {error === "Client not found"
            ? "The client you're looking for doesn't exist or has been removed."
            : `There was a problem loading this client: ${error}`}
        </p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/clients">Back to Clients</Link>
          </Button>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            <div className="flex gap-2 items-center mt-1">
              <Badge variant={client.status === "CUSTOMER" ? "default" : "outline"}>
                {client.status.charAt(0) + client.status.slice(1).toLowerCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Since {formatDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}/edit`}>
              <Edit className="mr-2 w-4 h-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteClient}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 w-4 h-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Client Info Card */}
            <ClientInfoCard
              email={client.email ?? null}
              phone={client.phone ?? null}
              address={client.address ?? null}
              city={client.city ?? null}
              state={client.state ?? null}
              zipCode={client.zipCode ?? null}
              updatedAt={client.updatedAt.toString()}
            />
            {/* Notes Card */}
            <ClientNotesCard
              clientId={clientId}
              notes={client.notes ?? null}
            />
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <ClientVehiclesTab vehicles={vehicles} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ClientActivityTab
            activities={activities}
            onAddNote={() => setIsAddNoteOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Add Note Dialog */}
      {isAddNoteOpen && (
        <AddNoteDialog
          isOpen={isAddNoteOpen}
          onClose={() => setIsAddNoteOpen(false)}
          onSubmit={handleAddNote}
        />
      )}
    </div>
  );
}
