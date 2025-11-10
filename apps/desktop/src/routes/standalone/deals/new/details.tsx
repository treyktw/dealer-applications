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
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWizard } from "@/lib/providers/WizardProvider";
import { updateDeal, getDealsByStatus } from "@/lib/local-storage/local-deals-service";

export const Route = createFileRoute("/standalone/deals/new/details")({
  component: DetailsStep,
});

function DetailsStep() {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep } = useWizard();

  // Track dealId using ref to persist across renders
  const dealIdRef = useRef<string>("");
  const isInitializedRef = useRef(false);

  // Load most recent draft deal on mount
  const { data: draftDeal } = useQuery({
    queryKey: ["draft-deal"],
    queryFn: async () => {
      const drafts = await getDealsByStatus("draft");
      const sorted = drafts.sort((a, b) => b.updatedAt - a.updatedAt);
      return sorted[0];
    },
    staleTime: Infinity,
  });

  // Initialize dealId from draft
  useEffect(() => {
    if (draftDeal && !dealIdRef.current) {
      dealIdRef.current = draftDeal.id;
    }
  }, [draftDeal]);

  // Store number fields as strings to allow clearing/editing
  const [dealDetails, setDealDetails] = useState({
    type: "retail",
    saleAmount: "",
    salesTax: "",
    docFee: "",
    tradeInValue: "",
    downPayment: "",
  });

  // Load saved data from draft deal or formData
  useEffect(() => {
    if (!isInitializedRef.current) {
      // Prefer draft deal data, then formData, then defaults
      const savedData = draftDeal || formData;
      
      setDealDetails({
        type: savedData.type || "retail",
        saleAmount: savedData.saleAmount != null ? savedData.saleAmount.toString() : "",
        salesTax: savedData.salesTax != null ? savedData.salesTax.toString() : "",
        docFee: savedData.docFee != null ? savedData.docFee.toString() : "",
        tradeInValue: savedData.tradeInValue != null ? savedData.tradeInValue.toString() : "",
        downPayment: savedData.downPayment != null ? savedData.downPayment.toString() : "",
      });
      
      isInitializedRef.current = true;
    }
  }, [draftDeal, formData]);

  // Convert string numbers to actual numbers for calculations
  const numericValues = useMemo(() => {
    return {
      saleAmount: dealDetails.saleAmount.trim() ? parseFloat(dealDetails.saleAmount) || 0 : 0,
      salesTax: dealDetails.salesTax.trim() ? parseFloat(dealDetails.salesTax) || 0 : 0,
      docFee: dealDetails.docFee.trim() ? parseFloat(dealDetails.docFee) || 0 : 0,
      tradeInValue: dealDetails.tradeInValue.trim() ? parseFloat(dealDetails.tradeInValue) || 0 : 0,
      downPayment: dealDetails.downPayment.trim() ? parseFloat(dealDetails.downPayment) || 0 : 0,
    };
  }, [dealDetails.saleAmount, dealDetails.salesTax, dealDetails.docFee, dealDetails.tradeInValue, dealDetails.downPayment]);

  // Calculate financed amount using useMemo
  const financedAmount = useMemo(() => {
    const { saleAmount, salesTax, docFee, tradeInValue, downPayment } = numericValues;
    const subtotal = saleAmount + salesTax + docFee - tradeInValue;
    const financed = subtotal - downPayment;
    return Math.max(0, financed);
  }, [numericValues]);

  // Auto-save form data with debouncing
  const debouncedFormData = useMemo(() => {
    return {
      type: dealDetails.type,
      saleAmount: numericValues.saleAmount,
      salesTax: numericValues.salesTax,
      docFee: numericValues.docFee,
      tradeInValue: numericValues.tradeInValue,
      downPayment: numericValues.downPayment,
      financedAmount,
      totalAmount: numericValues.saleAmount + numericValues.salesTax + numericValues.docFee - numericValues.tradeInValue,
    };
  }, [dealDetails.type, numericValues, financedAmount]);

  // Debounced auto-save effect - saves to both wizard context and IndexedDB
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Update wizard context
      updateFormData(debouncedFormData);

      // Save to IndexedDB if we have a deal ID (from draft deal or formData)
      const dealId = dealIdRef.current || draftDeal?.id;
      if (dealId) {
        try {
          await updateDeal(dealId, {
            type: dealDetails.type,
            saleAmount: numericValues.saleAmount,
            salesTax: numericValues.salesTax,
            docFee: numericValues.docFee,
            tradeInValue: numericValues.tradeInValue,
            downPayment: numericValues.downPayment,
            financedAmount,
            totalAmount: numericValues.saleAmount + numericValues.salesTax + numericValues.docFee - numericValues.tradeInValue,
          });
        } catch (error) {
          console.error("❌ [AUTO-SAVE] Error saving deal details to database:", error);
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [debouncedFormData, updateFormData, numericValues, dealDetails.type, financedAmount, draftDeal]);

  // Memoized update handler
  const updateDealField = useCallback((field: keyof typeof dealDetails, value: string) => {
    setDealDetails((prev) => ({ ...prev, [field]: value }));
  }, []);

  const totalAmount = numericValues.saleAmount + numericValues.salesTax + numericValues.docFee - numericValues.tradeInValue;

  const handleNext = () => {
    if (numericValues.saleAmount <= 0) {
      toast.error("Please enter a valid sale amount");
      return;
    }

    updateFormData({
      type: dealDetails.type,
      saleAmount: numericValues.saleAmount,
      salesTax: numericValues.salesTax,
      docFee: numericValues.docFee,
      tradeInValue: numericValues.tradeInValue,
      downPayment: numericValues.downPayment,
      financedAmount,
      totalAmount,
    });

    setCurrentStep(3);
    navigate({ to: "/standalone/deals/new/documents" });
  };

  const handleBack = () => {
    setCurrentStep(1);
    navigate({ to: "/standalone/deals/new/client-vehicle" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Deal Details</h2>
        <p className="text-muted-foreground">
          Enter the financial details for this deal
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Field>
              <FieldLabel>Deal Type</FieldLabel>
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
              <FieldLabel>Documentation Fee</FieldLabel>
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
          </div>

          <div className="space-y-4">
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
                    value={financedAmount}
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
            <span className="text-xl font-bold">${totalAmount.toLocaleString()}</span>
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
                  ${financedAmount.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={handleBack}>
          Back: Vehicle
        </Button>
        <Button onClick={handleNext} disabled={numericValues.saleAmount <= 0}>
          Next: Documents
        </Button>
      </div>
    </div>
  );
}
