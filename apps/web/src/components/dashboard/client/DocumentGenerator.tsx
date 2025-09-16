"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Car, Check } from "lucide-react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import type { DocumentType } from "@/types/documents";
import { toast } from "sonner";
import { DealForm, type DealFormValues } from "@/components/forms/deal-form";
import { VehicleAssignmentDialog } from "@/app/(dashboard)/clients/_components/vehicle-assignment";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { nanoid } from "nanoid";

interface DocumentGeneratorProps {
  clientId: Id<"clients">;
  onBack: () => void;
}

export function DocumentGenerator({ clientId, onBack }: DocumentGeneratorProps) {
  const router = useRouter();
  
  // State for vehicle selection
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<Id<"vehicles"> | null>(null);
  
  // State for document generation
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Fetch client data using Convex
  const client = useQuery(api.documents.getClient, { clientId });
  
  // Fetch vehicle data if a vehicle is selected
  const vehicle = useQuery(api.documents.getVehicle, 
    selectedVehicleId ? { vehicleId: selectedVehicleId } : "skip"
  );
  
  // Mutation for generating documents
  const generateDocuments = useMutation(api.documents.generateDocuments);
  
  // Handle vehicle selection
  const handleVehicleSelected = useCallback((vehicleId: Id<"vehicles">) => {
    setSelectedVehicleId(vehicleId);
  }, []);
  
  // Handle form submission
  const handleSubmit = async (data: DealFormValues & { totalAmount: number; financedAmount: number }) => {
    if (!client || !vehicle || !selectedVehicleId) {
      toast.error("Client or vehicle information is missing");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const result = await generateDocuments({
        clientId,
        vehicleId: selectedVehicleId,
        saleDate: data.saleDate,
        saleAmount: data.saleAmount,
        salesTax: data.salesTax,
        docFee: data.docFee,
        tradeInValue: data.tradeInValue,
        downPayment: data.downPayment,
        totalAmount: data.totalAmount,
        financedAmount: data.financedAmount,
        documents: (data.documents as DocumentType[]).map(String),
        dealershipId: vehicle.dealershipId as Id<"dealerships">,
        vin: vehicle.vin,
        status: vehicle.status,
        clientEmail: client.email as string,
        clientPhone: client.phone as string,
        stockNumber: vehicle.stock as string,
        firstName: client.firstName as string,
        lastName: client.lastName as string,
        dealsId: nanoid(),
      });

      toast.success("Documents have been generated successfully.");
      
      // Navigate to the deal details page
      setTimeout(() => {
        router.push(`/deals/${result.dealId}`);
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate documents");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Loading states for the multi-step loader
  const loadingStates = [
    { text: "Preparing document templates" },
    { text: "Loading client and vehicle data" },
    { text: "Generating Title Reassignment" },
    { text: "Creating Odometer Disclosure Statement" },
    { text: "Processing Bill of Sale" },
    { text: "Preparing Motor Vehicle application" },
    { text: "Finalizing documents" },
    { text: "Ready to download" },
  ];
  
  // Determine what to render based on current state
  const renderContent = () => {
    // If loading client data, show loading indicator
    if (client === undefined) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // If client data is loaded but no vehicle is selected, show vehicle selection
    if (!selectedVehicleId || vehicle === undefined) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Assign Vehicle to Client</CardTitle>
            <CardDescription>
              Select a vehicle to create deal documents for this client
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Vehicle Selected</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              To generate deal documents, you need to select a vehicle from your inventory
              that this client is interested in purchasing.
            </p>
            <Button onClick={() => setIsVehicleDialogOpen(true)}>
              Select Vehicle
            </Button>
          </CardContent>
          <CardFooter className="border-t p-4 flex justify-start">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    // If both client and vehicle are loaded, show deal form
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Button>
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-sm">Vehicle Selected: {vehicle.year} {vehicle.make} {vehicle.model}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2"
              onClick={() => setIsVehicleDialogOpen(true)}
            >
              Change
            </Button>
          </div>
        </div>
        
        <DealForm
          client={client}
          vehicle={vehicle}
          onSubmit={handleSubmit}
          isLoading={isGenerating}
        />
      </div>
    );
  };
  
  return (
    <div>
      {renderContent()}
      
      {/* Vehicle Selection Dialog */}
      <VehicleAssignmentDialog
        open={isVehicleDialogOpen}
        onOpenChange={setIsVehicleDialogOpen}
        clientId={clientId}
        onVehicleSelected={handleVehicleSelected}
      />
      
      {/* Multi-step loader for document generation */}
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={isGenerating}
        duration={1000}
        loop={false}
      />
    </div>
  );
}