import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { DollarSign } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWizard } from "@/lib/providers/WizardProvider";
import { updateDeal } from "@/lib/sqlite/local-deals-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";

export const Route = createFileRoute("/standalone/deals/$dealId/edit/details")({
  component: EditDetailsStep,
});

function EditDetailsStep() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useUnifiedAuth();

  const wizard = useWizard();
  const formData = wizard?.formData || {};
  const updateFormData = wizard?.updateFormData || (() => {});

  // Initialize deal details from wizard context
  const [dealDetails, setDealDetails] = useState({
    type: formData.type || "retail",
    status: formData.status || "draft",
    saleAmount: formData.saleAmount?.toString() || "0",
    salesTax: formData.salesTax?.toString() || "0",
    docFee: formData.docFee?.toString() || "0",
    tradeInValue: formData.tradeInValue?.toString() || "0",
    downPayment: formData.downPayment?.toString() || "0",
  });

  // Sync state with wizard context when it updates
  useEffect(() => {
    if (formData.type) {
      setDealDetails((prev) => ({ ...prev, type: formData.type }));
    }
    if (formData.status) {
      setDealDetails((prev) => ({ ...prev, status: formData.status }));
    }
    if (formData.saleAmount !== undefined) {
      setDealDetails((prev) => ({ ...prev, saleAmount: formData.saleAmount!.toString() }));
    }
    if (formData.salesTax !== undefined) {
      setDealDetails((prev) => ({ ...prev, salesTax: formData.salesTax!.toString() }));
    }
    if (formData.docFee !== undefined) {
      setDealDetails((prev) => ({ ...prev, docFee: formData.docFee!.toString() }));
    }
    if (formData.tradeInValue !== undefined) {
      setDealDetails((prev) => ({ ...prev, tradeInValue: formData.tradeInValue!.toString() }));
    }
    if (formData.downPayment !== undefined) {
      setDealDetails((prev) => ({ ...prev, downPayment: formData.downPayment!.toString() }));
    }
  }, [formData.type, formData.status, formData.saleAmount, formData.salesTax, formData.docFee, formData.tradeInValue, formData.downPayment]);

  const updateDealField = useCallback((field: string, value: string) => {
    setDealDetails((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Calculate totals
  const numericValues = useMemo(() => {
    const saleAmount = parseFloat(dealDetails.saleAmount) || 0;
    const salesTax = parseFloat(dealDetails.salesTax) || 0;
    const docFee = parseFloat(dealDetails.docFee) || 0;
    const tradeInValue = parseFloat(dealDetails.tradeInValue) || 0;
    const downPayment = parseFloat(dealDetails.downPayment) || 0;

    const totalAmount = saleAmount + salesTax + docFee - tradeInValue;
    const financedAmount = totalAmount - downPayment;

    return {
      saleAmount,
      salesTax,
      docFee,
      tradeInValue,
      downPayment,
      totalAmount,
      financedAmount,
    };
  }, [dealDetails]);

  const updateDealMutation = useMutation({
    mutationFn: async () => {
      return updateDeal(dealId, {
        type: dealDetails.type,
        status: dealDetails.status,
        total_amount: numericValues.totalAmount,
        sale_amount: numericValues.saleAmount || undefined,
        sales_tax: numericValues.salesTax || undefined,
        doc_fee: numericValues.docFee || undefined,
        trade_in_value: numericValues.tradeInValue || undefined,
        down_payment: numericValues.downPayment || undefined,
        financed_amount: numericValues.financedAmount || undefined,
      }, auth.user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      toast.success("Deal updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update deal", { description: error.message });
    },
  });

  const handleBack = () => {
    navigate({
      to: `/standalone/deals/${dealId}/edit/client-vehicle`,
    });
  };

  const handleSave = async () => {
    // Update wizard context
    updateFormData({
      type: dealDetails.type,
      status: dealDetails.status,
      totalAmount: numericValues.totalAmount,
      saleAmount: numericValues.saleAmount,
      salesTax: numericValues.salesTax,
      docFee: numericValues.docFee,
      tradeInValue: numericValues.tradeInValue,
      downPayment: numericValues.downPayment,
      financedAmount: numericValues.financedAmount,
    });

    // Save changes
    try {
      await updateDealMutation.mutateAsync();
      
      // Navigate back to deal detail page
      navigate({
        to: `/standalone/deals/${dealId}`,
      });
    } catch (error) {
      console.error("Error saving deal:", error);
    }
  };

  return (
    <div className="space-y-6">
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Deal Type *</FieldLabel>
            <FieldContent>
              <Select
                value={dealDetails.type}
                onValueChange={(value) => updateDealField("type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="lease">Lease</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Status *</FieldLabel>
            <FieldContent>
              <Select
                value={dealDetails.status}
                onValueChange={(value) => updateDealField("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </div>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Sale Amount *</FieldLabel>
            <FieldContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="number"
                  step="0.01"
                  value={dealDetails.saleAmount}
                  onChange={(e) => updateDealField("saleAmount", e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Sales Tax</FieldLabel>
            <FieldContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="number"
                  step="0.01"
                  value={dealDetails.salesTax}
                  onChange={(e) => updateDealField("salesTax", e.target.value)}
                  className="pl-9"
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Document Fee</FieldLabel>
            <FieldContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="number"
                  step="0.01"
                  value={dealDetails.docFee}
                  onChange={(e) => updateDealField("docFee", e.target.value)}
                  className="pl-9"
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Trade-In Value</FieldLabel>
            <FieldContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="number"
                  step="0.01"
                  value={dealDetails.tradeInValue}
                  onChange={(e) => updateDealField("tradeInValue", e.target.value)}
                  className="pl-9"
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Down Payment</FieldLabel>
            <FieldContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="number"
                  step="0.01"
                  value={dealDetails.downPayment}
                  onChange={(e) => updateDealField("downPayment", e.target.value)}
                  className="pl-9"
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Financed Amount</FieldLabel>
            <FieldContent>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="number"
                  step="0.01"
                  value={numericValues.financedAmount.toString()}
                  className="pl-9 bg-muted"
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Calculated automatically
              </p>
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-4">Deal Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sale Amount:</span>
            <span className="font-medium">${numericValues.saleAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sales Tax:</span>
            <span className="font-medium">${numericValues.salesTax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Doc Fee:</span>
            <span className="font-medium">${numericValues.docFee.toLocaleString()}</span>
          </div>
          {numericValues.tradeInValue > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trade-In Value:</span>
              <span className="font-medium text-red-600">
                -${numericValues.tradeInValue.toLocaleString()}
              </span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-xl font-bold">${numericValues.totalAmount.toLocaleString()}</span>
          </div>
          {numericValues.downPayment > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Down Payment:</span>
                <span className="font-medium">
                  ${numericValues.downPayment.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Amount Financed:</span>
                <span className="text-lg font-bold text-primary">
                  ${numericValues.financedAmount.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={handleBack}>
          Back: Client & Vehicle
        </Button>
        <Button onClick={handleSave} disabled={updateDealMutation.isPending || numericValues.saleAmount <= 0}>
          {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
