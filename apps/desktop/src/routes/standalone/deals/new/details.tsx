import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useWizard } from "./index";

export const Route = createFileRoute("/standalone/deals/new/details")({
  component: DetailsStep,
});

function DetailsStep() {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep } = useWizard();

  const [dealDetails, setDealDetails] = useState({
    type: formData.type || "retail",
    saleAmount: formData.saleAmount || 0,
    salesTax: formData.salesTax || 0,
    docFee: formData.docFee || 0,
    tradeInValue: formData.tradeInValue || 0,
    downPayment: formData.downPayment || 0,
    financedAmount: formData.financedAmount || 0,
  });

  useEffect(() => {
    const { saleAmount, salesTax, docFee, tradeInValue, downPayment } = dealDetails;
    const subtotal = saleAmount + salesTax + docFee - tradeInValue;
    const financed = subtotal - downPayment;

    setDealDetails(prev => ({
      ...prev,
      financedAmount: Math.max(0, financed),
    }));
  }, [
    dealDetails.saleAmount,
    dealDetails.salesTax,
    dealDetails.docFee,
    dealDetails.tradeInValue,
    dealDetails.downPayment,
  ]);

  const totalAmount =
    dealDetails.saleAmount +
    dealDetails.salesTax +
    dealDetails.docFee -
    dealDetails.tradeInValue;

  const handleNext = () => {
    if (dealDetails.saleAmount <= 0) {
      toast.error("Please enter a valid sale amount");
      return;
    }

    updateFormData({
      ...dealDetails,
      totalAmount: totalAmount,
    });

    setCurrentStep(4);
    navigate({ to: "/standalone/deals/new/documents" });
  };

  const handleBack = () => {
    setCurrentStep(2);
    navigate({ to: "/standalone/deals/new/vehicle" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Deal Details</h2>
        <p className="text-muted-foreground">
          Enter the financial details for this deal
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Deal Type</Label>
            <Select
              value={dealDetails.type}
              onValueChange={(value) =>
                setDealDetails({ ...dealDetails, type: value })
              }
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="saleAmount">Sale Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="saleAmount"
                type="number"
                step="0.01"
                value={dealDetails.saleAmount}
                onChange={(e) =>
                  setDealDetails({
                    ...dealDetails,
                    saleAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesTax">Sales Tax</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="salesTax"
                type="number"
                step="0.01"
                value={dealDetails.salesTax}
                onChange={(e) =>
                  setDealDetails({
                    ...dealDetails,
                    salesTax: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docFee">Documentation Fee</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="docFee"
                type="number"
                step="0.01"
                value={dealDetails.docFee}
                onChange={(e) =>
                  setDealDetails({
                    ...dealDetails,
                    docFee: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tradeInValue">Trade-In Value</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="tradeInValue"
                type="number"
                step="0.01"
                value={dealDetails.tradeInValue}
                onChange={(e) =>
                  setDealDetails({
                    ...dealDetails,
                    tradeInValue: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="downPayment">Down Payment</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="downPayment"
                type="number"
                step="0.01"
                value={dealDetails.downPayment}
                onChange={(e) =>
                  setDealDetails({
                    ...dealDetails,
                    downPayment: parseFloat(e.target.value) || 0,
                  })
                }
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financedAmount">Financed Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="financedAmount"
                type="number"
                step="0.01"
                value={dealDetails.financedAmount}
                className="pl-9 bg-muted"
                readOnly
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Calculated automatically
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-4">Deal Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sale Amount:</span>
            <span className="font-medium">${dealDetails.saleAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sales Tax:</span>
            <span className="font-medium">${dealDetails.salesTax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Doc Fee:</span>
            <span className="font-medium">${dealDetails.docFee.toLocaleString()}</span>
          </div>
          {dealDetails.tradeInValue > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trade-In Value:</span>
              <span className="font-medium text-red-600">
                -${dealDetails.tradeInValue.toLocaleString()}
              </span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-xl font-bold">${totalAmount.toLocaleString()}</span>
          </div>
          {dealDetails.downPayment > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Down Payment:</span>
                <span className="font-medium">
                  ${dealDetails.downPayment.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Amount Financed:</span>
                <span className="text-lg font-bold text-primary">
                  ${dealDetails.financedAmount.toLocaleString()}
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
        <Button onClick={handleNext} disabled={dealDetails.saleAmount <= 0}>
          Next: Documents
        </Button>
      </div>
    </div>
  );
}
