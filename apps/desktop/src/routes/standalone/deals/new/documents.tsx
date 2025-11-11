import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWizard } from "@/lib/providers/WizardProvider";

export const Route = createFileRoute("/standalone/deals/new/documents")({
  component: DocumentsStep,
});

const availableDocuments = [
  {
    id: "bill_of_sale",
    name: "Bill of Sale",
    description: "Standard bill of sale document",
    required: true,
  },
  {
    id: "buyers_order",
    name: "Buyer's Order",
    description: "Vehicle purchase agreement",
    required: true,
  },
  {
    id: "odometer_disclosure",
    name: "Odometer Disclosure",
    description: "Federal odometer disclosure statement",
    required: true,
  },
  {
    id: "finance_agreement",
    name: "Finance Agreement",
    description: "Retail installment contract",
    required: false,
  },
  {
    id: "warranty",
    name: "Warranty Agreement",
    description: "Extended warranty contract",
    required: false,
  },
  {
    id: "trade_in_appraisal",
    name: "Trade-In Appraisal",
    description: "Trade-in vehicle appraisal form",
    required: false,
  },
  {
    id: "insurance_authorization",
    name: "Insurance Authorization",
    description: "Insurance verification form",
    required: false,
  },
  {
    id: "credit_application",
    name: "Credit Application",
    description: "Finance credit application",
    required: false,
  },
];

function DocumentsStep() {
  const navigate = useNavigate();
  const { formData, updateFormData, setCurrentStep } = useWizard();

  const requiredDocs = availableDocuments.filter((d) => d.required).map((d) => d.id);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(
    formData.selectedDocuments || requiredDocs
  );

  const handleToggleDocument = (docId: string, required: boolean) => {
    if (required) {
      return;
    }

    setSelectedDocuments((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleNext = () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    updateFormData({
      selectedDocuments: selectedDocuments,
    });

    setCurrentStep(4);
    navigate({ to: "/standalone/deals/new/finalize" });
  };

  const handleBack = () => {
    setCurrentStep(2);
    navigate({ to: "/standalone/deals/new/details" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Select Documents</h2>
        <p className="text-muted-foreground">
          Choose which documents to generate for this deal
        </p>
      </div>

      <div className="grid gap-4">
        {availableDocuments.map((doc) => {
          const isSelected = selectedDocuments.includes(doc.id);
          const isRequired = doc.required;

          return (
            <Card
              key={doc.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected ? "border-primary bg-primary/5" : ""
              } ${isRequired ? "border-primary/50" : ""}`}
              onClick={() => handleToggleDocument(doc.id, isRequired)}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={isSelected}
                  disabled={isRequired}
                  onCheckedChange={() => handleToggleDocument(doc.id, isRequired)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-semibold cursor-pointer">
                      {doc.name}
                    </Label>
                    {isRequired && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {doc.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Document Generation
            </h4>
            <p className="text-sm text-blue-700">
              Selected documents will be generated in the next step. You can
              download, print, or email them after creation.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={handleBack}>
          Back: Details
        </Button>
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground self-center">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <Button onClick={handleNext} disabled={selectedDocuments.length === 0}>
            Next: Finalize
          </Button>
        </div>
      </div>
    </div>
  );
}
