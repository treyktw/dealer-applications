// src/routes/deals/$dealId/documents.tsx - Dynamic Document System

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, convexAction } from "@/lib/convex";
import { api } from "@dealer/convex";
import type { Id } from "@dealer/convex";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/deals/$dealsId/documents")({
  component: DocumentsPage,
});

// Template types available
const TEMPLATE_TYPES = [
  { id: "bill_of_sale", name: "Bill of Sale", required: true },
  { id: "odometer_disclosure", name: "Odometer Disclosure", required: true },
  { id: "buyers_guide", name: "Buyer's Guide", required: false },
  { id: "finance_contract", name: "Finance Contract", required: false },
  { id: "warranty", name: "Warranty Agreement", required: false },
];

function DocumentsPage() {
  const { dealsId } = Route.useParams();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateFields, setTemplateFields] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Fetch deal data
  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ["deal", dealsId],
    queryFn: () =>
      convexQuery(api.api.deals.getDeal, { dealId: dealsId as Id<"deals"> }),
  });

  // Fetch dealership
  const { data: dealership } = useQuery({
    queryKey: ["dealership"],
    queryFn: () => convexQuery(api.api.dealerships.getCurrentDealership, {}),
  });

  // Analyze template when selected
  const analyzeTemplate = useMutation({
    mutationFn: async (templateType: string) => {
      // For now, using the known storage ID - in production, this would be dynamic
      const storageId = "kg20v1zvcervng2zq7tmqkhvs57q7abj"; // GA Bill of Sale
      
      const analysis = await convexAction(api.api.pdfFieldMapper.analyzePDFTemplate, {
        storageId,
        templateType,
      });

      return analysis;
    },
    onSuccess: (data) => {
      setTemplateFields(data);
      toast.success(`Analyzed ${data.totalFields} fields`);
      
      // Initialize form data with empty values
      const initialData: Record<string, any> = {};
      data.fieldMappings.forEach((field: any) => {
        initialData[field.pdfFieldName] = "";
      });
      setFormData(initialData);
    },
    onError: (error) => {
      toast.error(`Failed to analyze template: ${error.message}`);
    },
  });

  // Generate and fill PDF
  const fillPDF = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !templateFields) {
        throw new Error("No template selected");
      }

      // Fill the PDF with current form data
      const result = await convexAction(api.api.pdfFieldInspector.testFillPDF, {
        source: { type: "storageId", id: "kg20v1zvcervng2zq7tmqkhvs57q7abj" },
        testData: formData,
      });

      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Filled ${data.stats.filledCount} fields successfully`);
        if (data.filledUrl) {
          window.open(data.filledUrl, "_blank");
        }
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Failed to fill PDF: ${error.message}`);
    },
  });

  // Handle template selection
  const handleTemplateSelect = (templateType: string) => {
    setSelectedTemplate(templateType);
    analyzeTemplate.mutate(templateType);
  };

  // Handle form field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Auto-fill from deal data
  const autoFillFromDeal = () => {
    if (!templateFields || !deal || !dealership) return;

    const autoFilledData: Record<string, any> = {};
    
    templateFields.fieldMappings.forEach((field: any) => {
      // Try to auto-fill based on suggested mapping
      let value = "";
      
      if (field.suggestedMapping.startsWith("vehicle.")) {
        const vehicleField = field.suggestedMapping.split(".")[1];
        const vehicleValue = deal.vehicle?.[vehicleField as keyof typeof deal.vehicle];
        value = vehicleValue ? String(vehicleValue) : "";
      } else if (field.suggestedMapping.startsWith("buyer.")) {
        // Would get from buyer data
        value = "";
      } else if (field.suggestedMapping.startsWith("seller.")) {
        const sellerField = field.suggestedMapping.split(".")[1];
        if (sellerField === "name") {
          value = dealership?.name || "";
        } else if (sellerField === "address") {
          value = dealership?.address || "";
        }
      } else if (field.suggestedMapping.startsWith("financial.")) {
        const financialField = field.suggestedMapping.split(".")[1];
        if (financialField.includes("price")) {
          value = deal.saleAmount?.toString() || deal.totalAmount?.toString() || "";
        }
      }
      
      if (value) {
        autoFilledData[field.pdfFieldName] = value;
      }
    });

    setFormData(prev => ({ ...prev, ...autoFilledData }));
    toast.success("Auto-filled available data from deal");
  };

  if (dealLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Document Processing</h1>
            <p className="text-muted-foreground mt-1">
              Deal #{dealsId.slice(-6)} - {deal?.vehicle?.year} {deal?.vehicle?.make} {deal?.vehicle?.model}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Template Selection */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Document Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEMPLATE_TYPES.map((template) => (
                  <button
                    key={template.id}
										type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      "hover:border-primary hover:bg-accent/50",
                      selectedTemplate === template.id && "border-primary bg-accent",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {template.required ? "Required" : "Optional"}
                          </p>
                        </div>
                      </div>
                      {selectedTemplate === template.id ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Template Analysis Results */}
            {templateFields && (
              <Card>
                <CardHeader>
                  <CardTitle>Template Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Fields:</span>
                    <span className="font-medium">{templateFields.totalFields}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Field Categories:</p>
                    {Object.entries(templateFields.categorizedFields).map(([category, fields]: [string, any]) => (
                      fields.length > 0 && (
                        <div key={category} className="flex justify-between text-sm">
                          <span className="capitalize">{category}:</span>
                          <span>{fields.length} fields</span>
                        </div>
                      )
                    ))}
                  </div>

                  <Button 
                    onClick={autoFillFromDeal}
                    className="w-full"
                    variant="outline"
                  >
                    Auto-fill from Deal Data
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Dynamic Form */}
          <div className="space-y-4">
            {selectedTemplate && templateFields ? (
              <Card className="max-h-[80vh] overflow-y-auto">
                <CardHeader className="sticky top-0 z-10 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle>Document Fields</CardTitle>
                    <Button 
                      onClick={() => fillPDF.mutate()}
                      disabled={fillPDF.isPending}
                    >
                      {fillPDF.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate PDF
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="vehicle" className="w-full">
                    <TabsList className="grid grid-cols-5 w-full gap-10">
                      <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                      <TabsTrigger value="buyer">Buyer</TabsTrigger>
                      <TabsTrigger value="seller">Seller</TabsTrigger>
                      <TabsTrigger value="financial">Financial</TabsTrigger>
                      <TabsTrigger value="other">Other</TabsTrigger>
                    </TabsList>

                    {Object.entries(templateFields.categorizedFields).map(([category, fields]: [string, any]) => (
                      <TabsContent key={category} value={category} className="space-y-4">
                        {fields.length > 0 ? (
                          fields.map((field: any) => (
                            <DynamicField
                              key={field.pdfFieldName}
                              field={field}
                              value={formData[field.pdfFieldName] || ""}
                              onChange={(value) => handleFieldChange(field.pdfFieldName, value)}
                            />
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">
                            No {category} fields in this template
                          </p>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No Template Selected</p>
                  <p className="text-muted-foreground text-center">
                    Select a document template from the left to begin filling out the form
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Dynamic field component based on type
function DynamicField({ field, value, onChange }: {
  field: any;
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldId = `field-${field.pdfFieldName}`;

  const renderInput = () => {
    switch (field.suggestedInputType) {
      case "select":
        return (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required={field.required}
          >
            <option value="">Select...</option>
            {field.validationRules?.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case "currency":
        return (
          <input
            id={fieldId}
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="0.00"
            required={field.required}
          />
        );
      
      case "number":
        return (
          <input
            id={fieldId}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            min={field.validationRules?.min}
            max={field.validationRules?.max}
            required={field.required}
          />
        );
      
      case "date":
        return (
          <input
            id={fieldId}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required={field.required}
          />
        );
      
      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-white dark:text-black"
            maxLength={field.validationRules?.maxLength}
            pattern={field.validationRules?.pattern}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {field.suggestedLabel}
        </span>
        {field.required && (
          <span className="text-red-500 text-xs">*Required</span>
        )}
      </label>
      {renderInput()}
      <p className="text-xs text-muted-foreground">
        PDF Field: {field.pdfFieldName}
      </p>
    </div>
  );
}