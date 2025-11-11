import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, User, Car, DollarSign, Loader2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createDeal } from "@/lib/sqlite/local-deals-service";
import { useWizard } from "@/lib/providers/WizardProvider";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { getClient } from "@/lib/sqlite/local-clients-service";
import { getVehicle } from "@/lib/sqlite/local-vehicles-service";
import { useEffect } from "react";
import { generateDocumentsForDeal } from "@/lib/document-generation";

export const Route = createFileRoute("/standalone/deals/new/finalize")({
  component: FinalizeStep,
});

function FinalizeStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useUnifiedAuth();
  const { formData, setCurrentStep, updateFormData, clearFormData } = useWizard();

  console.log("🔍 [FINALIZE] FormData:", {
    clientId: formData.clientId,
    vehicleId: formData.vehicleId,
    hasSelectedClient: !!formData.selectedClient,
    hasSelectedVehicle: !!formData.selectedVehicle,
  });

  // Fetch client and vehicle if they're missing but IDs exist
  const shouldFetchClient = !!formData.clientId && !formData.selectedClient;
  const shouldFetchVehicle = !!formData.vehicleId && !formData.selectedVehicle;

  console.log("🔍 [FINALIZE] Query conditions:", {
    shouldFetchClient,
    shouldFetchVehicle,
  });

  const { data: fetchedClient, isLoading: isLoadingClient, error: clientError } = useQuery({
    queryKey: ["standalone-client", formData.clientId, auth.user?.id],
    queryFn: () => {
      if (!formData.clientId) throw new Error("Client ID is required");
      if (!auth.user?.id) throw new Error("User ID is required");
      console.log("📥 [FINALIZE] Fetching client:", formData.clientId);
      return getClient(formData.clientId, auth.user.id);
    },
    enabled: shouldFetchClient && !!auth.user?.id,
  });

  const { data: fetchedVehicle, isLoading: isLoadingVehicle, error: vehicleError } = useQuery({
    queryKey: ["standalone-vehicle", formData.vehicleId],
    queryFn: () => {
      if (!formData.vehicleId) throw new Error("Vehicle ID is required");
      console.log("📥 [FINALIZE] Fetching vehicle:", formData.vehicleId);
      return getVehicle(formData.vehicleId);
    },
    enabled: shouldFetchVehicle,
  });

  console.log("🔍 [FINALIZE] Query results:", {
    fetchedClient: !!fetchedClient,
    fetchedVehicle: !!fetchedVehicle,
    isLoadingClient,
    isLoadingVehicle,
    clientError: clientError?.message,
    vehicleError: vehicleError?.message,
  });

  // Update wizard context when we fetch the data
  useEffect(() => {
    if (fetchedClient && !formData.selectedClient) {
      console.log("✅ [FINALIZE] Updating wizard with fetched client");
      updateFormData({ selectedClient: fetchedClient });
    }
  }, [fetchedClient, formData.selectedClient, updateFormData]);

  useEffect(() => {
    if (fetchedVehicle && !formData.selectedVehicle) {
      console.log("✅ [FINALIZE] Updating wizard with fetched vehicle");
      updateFormData({ selectedVehicle: fetchedVehicle });
    }
  }, [fetchedVehicle, formData.selectedVehicle, updateFormData]);

  const createDealMutation = useMutation({
    mutationFn: async (deal: Parameters<typeof createDeal>[0]) => {
      console.log("🚀 [FINALIZE] Creating deal with data:", {
        client_id: deal.client_id,
        vehicle_id: deal.vehicle_id,
        type: deal.type,
        total_amount: deal.total_amount,
        userId: auth.user?.id,
      });
      const result = await createDeal(deal, auth.user?.id);
      console.log("✅ [FINALIZE] Deal created successfully:", result.id);
      return result;
    },
    onSuccess: async (newDeal) => {
      console.log("✅ [FINALIZE] Deal creation succeeded, newDeal:", newDeal);
      
      // Auto-generate documents if any are selected
      const documentsToGenerate = formData.selectedDocuments || [];
      if (documentsToGenerate.length > 0 && selectedClient && selectedVehicle) {
        console.log("📄 [FINALIZE] Auto-generating documents:", documentsToGenerate);
        toast.loading(`Generating ${documentsToGenerate.length} document${documentsToGenerate.length > 1 ? "s" : ""}...`, {
          id: "generating-docs",
        });

        try {
          const generationResults = await generateDocumentsForDeal(documentsToGenerate, {
            dealId: newDeal.id,
            documentType: "", // Not used in batch generation
            deal: newDeal,
            client: selectedClient,
            vehicle: selectedVehicle,
            userId: auth.user?.id || "",
            userEmail: auth.user?.email,
            userName: auth.user?.name,
          });

          // Invalidate documents query
          queryClient.invalidateQueries({ queryKey: ["standalone-documents", newDeal.id] });

          if (generationResults.success > 0) {
            toast.success(
              `Deal created! Generated ${generationResults.success} document${generationResults.success > 1 ? "s" : ""}.`,
              { id: "generating-docs", duration: 5000 }
            );
          }

          if (generationResults.failed > 0) {
            console.warn("⚠️ [FINALIZE] Some documents failed to generate:", generationResults.errors);
            toast.warning(
              `${generationResults.failed} document${generationResults.failed > 1 ? "s" : ""} failed to generate.`,
              { id: "generating-docs", duration: 5000 }
            );
          }
        } catch (error) {
          console.error("❌ [FINALIZE] Error generating documents:", error);
          toast.error("Deal created, but document generation failed", {
            id: "generating-docs",
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals-stats"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-recent-deals"] });
      clearFormData(); // Clear wizard data after successful creation
      
      if (documentsToGenerate.length === 0) {
        toast.success("Deal created successfully!");
      }
      
      navigate({ to: `/standalone/deals/${newDeal.id}` });
    },
    onError: (error: Error) => {
      console.error("❌ [FINALIZE] Deal creation failed:", error);
      toast.error("Failed to create deal", {
        description: error.message,
      });
    },
  });

  const handleCreate = () => {
    if (!formData.clientId || !formData.vehicleId) {
      toast.error("Missing required information");
      return;
    }

    if (!auth.user?.id) {
      toast.error("User ID is required");
      return;
    }

    console.log("🚀 [FINALIZE] handleCreate called with formData:", {
      clientId: formData.clientId,
      vehicleId: formData.vehicleId,
      type: formData.type,
      totalAmount: formData.totalAmount,
      userId: auth.user.id,
    });

    createDealMutation.mutate({
      type: formData.type,
      client_id: formData.clientId,
      vehicle_id: formData.vehicleId,
      status: "draft",
      total_amount: formData.totalAmount,
      sale_amount: formData.saleAmount,
      sales_tax: formData.salesTax,
      doc_fee: formData.docFee,
      trade_in_value: formData.tradeInValue,
      down_payment: formData.downPayment,
      financed_amount: formData.financedAmount,
      document_ids: [],
    });
  };

  const handleBack = () => {
    setCurrentStep(3);
    navigate({ to: "/standalone/deals/new/documents" });
  };

  // Use fetched data if available, otherwise use formData
  const selectedClient = formData.selectedClient || fetchedClient;
  const selectedVehicle = formData.selectedVehicle || fetchedVehicle;
  const selectedDocuments = formData.selectedDocuments;

  console.log("🔍 [FINALIZE] Final state:", {
    selectedClient: !!selectedClient,
    selectedVehicle: !!selectedVehicle,
    isLoadingClient,
    isLoadingVehicle,
  });

  // Show loading state while fetching
  if (isLoadingClient || isLoadingVehicle) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading deal information...</p>
      </div>
    );
  }

  // Show error if we still don't have the required data
  if (!selectedClient || !selectedVehicle) {
    console.error("❌ [FINALIZE] Missing data:", {
      hasClient: !!selectedClient,
      hasVehicle: !!selectedVehicle,
      clientId: formData.clientId,
      vehicleId: formData.vehicleId,
      fetchedClient: !!fetchedClient,
      fetchedVehicle: !!fetchedVehicle,
    });
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Missing required information. Please go back and complete all steps.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Client ID: {formData.clientId || "missing"} | Vehicle ID: {formData.vehicleId || "missing"}
        </p>
        <Button variant="outline" onClick={handleBack}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Review & Create Deal</h2>
        <p className="text-muted-foreground">
          Review all details before creating the deal
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold">Client Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">
                {selectedClient.first_name} {selectedClient.last_name}
              </span>
            </div>
            {selectedClient.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{selectedClient.email}</span>
              </div>
            )}
            {selectedClient.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{selectedClient.phone}</span>
              </div>
            )}
            {selectedClient.city && selectedClient.state && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">
                  {selectedClient.city}, {selectedClient.state}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Car className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold">Vehicle Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span className="font-medium">
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </span>
            </div>
            {selectedVehicle.trim && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trim:</span>
                <span className="font-medium">{selectedVehicle.trim}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">VIN:</span>
              <span className="font-medium font-mono text-xs">
                {selectedVehicle.vin.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mileage:</span>
              <span className="font-medium">
                {selectedVehicle.mileage.toLocaleString()} mi
              </span>
            </div>
            {selectedVehicle.color && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Color:</span>
                <span className="font-medium">{selectedVehicle.color}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="font-semibold">Financial Details</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deal Type:</span>
              <Badge variant="outline">{formData.type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale Amount:</span>
              <span className="font-medium">
                ${(formData.saleAmount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sales Tax:</span>
              <span className="font-medium">
                ${(formData.salesTax || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doc Fee:</span>
              <span className="font-medium">
                ${(formData.docFee || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {formData.tradeInValue ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trade-In:</span>
                <span className="font-medium text-red-600">
                  -${formData.tradeInValue.toLocaleString()}
                </span>
              </div>
            ) : null}
            {formData.downPayment ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Down Payment:</span>
                <span className="font-medium">
                  ${formData.downPayment.toLocaleString()}
                </span>
              </div>
            ) : null}
            {formData.financedAmount ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Financed:</span>
                <span className="font-medium text-primary">
                  ${formData.financedAmount.toLocaleString()}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-lg font-bold">
                ${formData.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <FileText className="h-5 w-5 text-orange-600" />
          </div>
          <h3 className="font-semibold">Documents to Generate</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {selectedDocuments?.map((docId) => (
            <div key={docId} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span className="capitalize">
                {docId.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Documents will be available after the deal is created
        </p>
      </Card>

      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900 mb-1">
              Ready to Create
            </h4>
            <p className="text-sm text-green-700">
              All information looks good. Click "Create Deal" to save this deal
              and generate documents.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-between gap-2 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={createDealMutation.isPending}
        >
          Back: Documents
        </Button>
        <Button
          onClick={handleCreate}
          disabled={createDealMutation.isPending}
          className="gap-2"
        >
          {createDealMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Create Deal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
