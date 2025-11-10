import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, User, Car, DollarSign, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createDeal } from "@/lib/local-storage/local-deals-service";
import { useWizard } from "@/lib/providers/WizardProvider";

export const Route = createFileRoute("/standalone/deals/new/finalize")({
  component: FinalizeStep,
});

function FinalizeStep() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formData, setCurrentStep } = useWizard();

  const createDealMutation = useMutation({
    mutationFn: createDeal,
    onSuccess: (newDeal) => {
      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals-stats"] });
      queryClient.invalidateQueries({ queryKey: ["standalone-recent-deals"] });
      toast.success("Deal created successfully!");
      navigate({ to: `/standalone/deals/${newDeal.id}` });
    },
    onError: (error: Error) => {
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

    createDealMutation.mutate({
      type: formData.type,
      clientId: formData.clientId,
      vehicleId: formData.vehicleId,
      status: "draft",
      totalAmount: formData.totalAmount,
      saleAmount: formData.saleAmount,
      salesTax: formData.salesTax,
      docFee: formData.docFee,
      tradeInValue: formData.tradeInValue,
      downPayment: formData.downPayment,
      financedAmount: formData.financedAmount,
      documentIds: [],
    });
  };

  const handleBack = () => {
    setCurrentStep(3);
    navigate({ to: "/standalone/deals/new/documents" });
  };

  const { selectedClient, selectedVehicle, selectedDocuments } = formData;

  if (!selectedClient || !selectedVehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Missing required information. Please go back and complete all steps.
        </p>
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
                {selectedClient.firstName} {selectedClient.lastName}
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
