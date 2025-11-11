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
import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWizard } from "@/lib/providers/WizardProvider";
import { getDealsByStatus } from "@/lib/sqlite/local-deals-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";

export const Route = createFileRoute("/standalone/deals/new/details")({
  component: DetailsStep,
});

function DetailsStep() {
  const navigate = useNavigate();
  const auth = useUnifiedAuth();
  
  // Get wizard context - hooks must be called unconditionally
  // If useWizard throws, it will crash anyway, so we can't catch it here
  const wizard = useWizard();
  const formData = wizard.formData || {
    type: "retail",
    clientId: "",
    vehicleId: "",
    status: "draft",
    totalAmount: 0,
    documentIds: [],
  };
  const updateFormData = wizard.updateFormData || (() => {});
  const setCurrentStep = wizard.setCurrentStep || (() => {});

  // Track dealId using ref to persist across renders
  const dealIdRef = useRef<string>("");
  const isInitializedRef = useRef(false);

  // Load most recent draft deal on mount
  const { data: draftDeal, error: draftDealError } = useQuery({
    queryKey: ["draft-deal", auth.user?.id],
    queryFn: async () => {
      if (!auth.user?.id) return null;
      try {
        const drafts = await getDealsByStatus("draft", auth.user.id);
        if (!Array.isArray(drafts)) {
          console.warn("⚠️ [DETAILS] getDealsByStatus returned non-array:", drafts);
          return null;
        }
        const sorted = drafts.sort((a, b) => {
          const aTime = a?.updated_at || 0;
          const bTime = b?.updated_at || 0;
          return bTime - aTime;
        });
        return sorted[0] || null;
      } catch (error) {
        console.error("❌ [DETAILS] Error loading draft deal:", error);
        return null; // Return null instead of undefined - React Query doesn't allow undefined
      }
    },
    staleTime: Infinity,
    retry: false, // Don't retry on error
  });

  // Initialize dealId from draft (no useEffect needed)
  if (draftDeal?.id && !dealIdRef.current) {
    dealIdRef.current = draftDeal.id;
  }

  // Compute initial deal details from draft deal or formData
  const initialDealDetails = useMemo(() => {
    try {
      if (!isInitializedRef.current && !draftDealError) {
        // Prefer draft deal data (SQLite uses snake_case), then formData (camelCase), then defaults
        if (draftDeal && typeof draftDeal === 'object') {
          // Draft deal from SQLite uses snake_case
          return {
            type: draftDeal.type || "retail",
            saleAmount: draftDeal.sale_amount != null && draftDeal.sale_amount !== undefined ? String(draftDeal.sale_amount) : "",
            salesTax: draftDeal.sales_tax != null && draftDeal.sales_tax !== undefined ? String(draftDeal.sales_tax) : "",
            docFee: draftDeal.doc_fee != null && draftDeal.doc_fee !== undefined ? String(draftDeal.doc_fee) : "",
            tradeInValue: draftDeal.trade_in_value != null && draftDeal.trade_in_value !== undefined ? String(draftDeal.trade_in_value) : "",
            downPayment: draftDeal.down_payment != null && draftDeal.down_payment !== undefined ? String(draftDeal.down_payment) : "",
          };
        } else if (formData && typeof formData === 'object' && (formData.saleAmount != null || formData.salesTax != null)) {
          // FormData uses camelCase
          return {
            type: formData.type || "retail",
            saleAmount: formData.saleAmount != null && formData.saleAmount !== undefined ? String(formData.saleAmount) : "",
            salesTax: formData.salesTax != null && formData.salesTax !== undefined ? String(formData.salesTax) : "",
            docFee: formData.docFee != null && formData.docFee !== undefined ? String(formData.docFee) : "",
            tradeInValue: formData.tradeInValue != null && formData.tradeInValue !== undefined ? String(formData.tradeInValue) : "",
            downPayment: formData.downPayment != null && formData.downPayment !== undefined ? String(formData.downPayment) : "",
          };
        }
      }
      // Use defaults
      return {
        type: "retail",
        saleAmount: "",
        salesTax: "",
        docFee: "",
        tradeInValue: "",
        downPayment: "",
      };
    } catch (error) {
      console.error("❌ [DETAILS] Error computing initial deal details:", error);
      return {
        type: "retail",
        saleAmount: "",
        salesTax: "",
        docFee: "",
        tradeInValue: "",
        downPayment: "",
      };
    }
  }, [draftDeal, draftDealError, formData]);

  // Store number fields as strings to allow clearing/editing
  const [dealDetails, setDealDetails] = useState(() => initialDealDetails);

  // Sync state when initial values change (only if not user-modified)
  const prevInitialDealDetailsRef = useRef(initialDealDetails);
  if (prevInitialDealDetailsRef.current !== initialDealDetails && !isInitializedRef.current) {
    setDealDetails(initialDealDetails);
    prevInitialDealDetailsRef.current = initialDealDetails;
    isInitializedRef.current = true;
  }

  // Convert string numbers to actual numbers for calculations
  const numericValues = useMemo(() => {
    try {
      return {
        saleAmount: (dealDetails.saleAmount && typeof dealDetails.saleAmount === 'string' && dealDetails.saleAmount.trim()) ? parseFloat(dealDetails.saleAmount) || 0 : 0,
        salesTax: (dealDetails.salesTax && typeof dealDetails.salesTax === 'string' && dealDetails.salesTax.trim()) ? parseFloat(dealDetails.salesTax) || 0 : 0,
        docFee: (dealDetails.docFee && typeof dealDetails.docFee === 'string' && dealDetails.docFee.trim()) ? parseFloat(dealDetails.docFee) || 0 : 0,
        tradeInValue: (dealDetails.tradeInValue && typeof dealDetails.tradeInValue === 'string' && dealDetails.tradeInValue.trim()) ? parseFloat(dealDetails.tradeInValue) || 0 : 0,
        downPayment: (dealDetails.downPayment && typeof dealDetails.downPayment === 'string' && dealDetails.downPayment.trim()) ? parseFloat(dealDetails.downPayment) || 0 : 0,
      };
    } catch (error) {
      console.error("❌ [DETAILS] Error calculating numeric values:", error);
      return {
        saleAmount: 0,
        salesTax: 0,
        docFee: 0,
        tradeInValue: 0,
        downPayment: 0,
      };
    }
  }, [dealDetails.saleAmount, dealDetails.salesTax, dealDetails.docFee, dealDetails.tradeInValue, dealDetails.downPayment]);

  // Calculate financed amount using useMemo
  const financedAmount = useMemo(() => {
    try {
      const { saleAmount = 0, salesTax = 0, docFee = 0, tradeInValue = 0, downPayment = 0 } = numericValues || {};
      const subtotal = saleAmount + salesTax + docFee - tradeInValue;
      const financed = subtotal - downPayment;
      return Math.max(0, financed);
    } catch (error) {
      console.error("❌ [DETAILS] Error calculating financed amount:", error);
      return 0;
    }
  }, [numericValues]);


  // Simple update handler
  const updateDealField = useCallback((field: keyof typeof dealDetails, value: string) => {
    setDealDetails((prev) => ({ ...prev, [field]: value }));
    // Mark as initialized when user starts typing
    isInitializedRef.current = true;
  }, []);

  const totalAmount = numericValues.saleAmount + numericValues.salesTax + numericValues.docFee - numericValues.tradeInValue;

  const handleNext = () => {
    if (numericValues.saleAmount <= 0) {
      toast.error("Please enter a valid sale amount");
      return;
    }

    // Update wizard context only - save to database will happen in finalize step
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
                    value={financedAmount.toString()}
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
