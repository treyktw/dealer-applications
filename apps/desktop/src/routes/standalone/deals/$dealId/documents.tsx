import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { convexAction } from "@/lib/convex";
import { api } from "@dealer/convex";
import {
  getDeal,
} from "@/lib/sqlite/local-deals-service";
import { getClient } from "@/lib/sqlite/local-clients-service";
import { getVehicle } from "@/lib/sqlite/local-vehicles-service";
import {
  getDocumentsByDeal,
  createDocument,
  deleteDocument,
  base64ToBlob,
  blobToBase64,
} from "@/lib/sqlite/local-documents-service";
import {
  getDefaultTemplateByCategory,
  loadDefaultTemplateAsBase64,
  mapDocumentTypeToCategory,
  type DefaultTemplate,
} from "@/lib/default-templates";

export const Route = createFileRoute("/standalone/deals/$dealId/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useUnifiedAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedTemplate, setUploadedTemplate] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("bill_of_sale");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(true); // Default to using default templates
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState<DefaultTemplate | null>(null);
  const useDefaultId = useId();
  const uploadCustomId = useId();

  // Get user ID - required for API call
  const userId = auth.user?.id;

  // Load deal data - hooks must be called unconditionally
  const { data: dealData } = useQuery({
    queryKey: ["standalone-deal", dealId, userId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      const deal = await getDeal(dealId, userId);
      if (!deal) {
        throw new Error("Deal not found");
      }

      const client = await getClient(deal.client_id, userId);
      const vehicle = await getVehicle(deal.vehicle_id);

      return { deal, client, vehicle };
    },
  });

  // Load existing documents
  const { data: documents = [], isLoading: isLoadingDocs, refetch: refetchDocuments } = useQuery({
    queryKey: ["standalone-documents", dealId],
    queryFn: async () => {
      try {
        return await getDocumentsByDeal(dealId);
      } catch (error) {
        console.error("❌ [DOCUMENTS] Error loading documents:", error);
        toast.error("Failed to load documents", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        return [];
      }
    },
  });

  useEffect(() => {
    const category = mapDocumentTypeToCategory(documentType);
    const template = getDefaultTemplateByCategory(category);
    const shouldUseDefault = useDefaultTemplate && template;
    setSelectedDefaultTemplate(shouldUseDefault ? template : null);
  }, [documentType, useDefaultTemplate]);

  // Check for userId after all hooks are called
  if (!userId) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to generate documents</p>
        </div>
      </Layout>
    );
  }

  // Generate document function
  const generatePDFDocument = async (args: {
    userId: any;
    templatePdfBase64: string;
    fieldMappings?: any[] | undefined;
    dealData: any;
    documentType: string;
  }) => {
    return convexAction(api.api.standalonePDF.generateDealPDF, args);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadedTemplate(file);
    } else {
      toast.error("Please select a PDF file");
    }
  };

  // Update selected default template when document type changes
  const handleDocumentTypeChange = (newType: string) => {
    setDocumentType(newType);
    if (useDefaultTemplate) {
      const category = mapDocumentTypeToCategory(newType);
      const template = getDefaultTemplateByCategory(category);
      setSelectedDefaultTemplate(template || null);
    }
  };

  const handleGenerate = async () => {
    if (!dealData) {
      toast.error("Please ensure deal data is loaded");
      return;
    }

    // Validate template selection
    if (useDefaultTemplate) {
      if (!selectedDefaultTemplate) {
        toast.error("Please select a default template or upload your own");
        return;
      }
    } else {
      if (!uploadedTemplate) {
        toast.error("Please upload a PDF template or use a default template");
        return;
      }
    }

    setIsGenerating(true);
    setGenerationStep(0);

    try {
      // Step 1: Get template base64
      setGenerationStep(1);
      let templateBase64: string;
      
      if (useDefaultTemplate && selectedDefaultTemplate) {
        // Load default template
        templateBase64 = await loadDefaultTemplateAsBase64(selectedDefaultTemplate);
      } else if (uploadedTemplate) {
        // Convert uploaded PDF to base64
        templateBase64 = await blobToBase64(uploadedTemplate);
      } else {
        throw new Error("No template selected");
      }

      // Step 2: Prepare deal data
      setGenerationStep(2);
      // Prepare deal data in the format expected by the API
      // Convert null values to undefined for Convex validation
      const dealDataForAPI = {
        id: dealData.deal.id,
        type: dealData.deal.type || "retail",
        client: {
          firstName: dealData.client?.first_name || "",
          lastName: dealData.client?.last_name || "",
          email: dealData.client?.email || undefined,
          phone: dealData.client?.phone || undefined,
          address: dealData.client?.address || undefined,
          city: dealData.client?.city || undefined,
          state: dealData.client?.state || undefined,
          zipCode: dealData.client?.zip_code || undefined,
          driversLicense: dealData.client?.drivers_license || undefined,
        },
        cobuyer: dealData.deal.cobuyer_data ? {
          firstName: dealData.deal.cobuyer_data.firstName || "",
          lastName: dealData.deal.cobuyer_data.lastName || "",
          email: dealData.deal.cobuyer_data.email || undefined,
          phone: dealData.deal.cobuyer_data.phone || undefined,
          address: dealData.deal.cobuyer_data.address || undefined,
          addressLine2: dealData.deal.cobuyer_data.addressLine2 || undefined,
          city: dealData.deal.cobuyer_data.city || undefined,
          state: dealData.deal.cobuyer_data.state || undefined,
          zipCode: dealData.deal.cobuyer_data.zipCode || undefined,
          driversLicense: dealData.deal.cobuyer_data.driversLicense || undefined,
        } : undefined,
        vehicle: {
          vin: dealData.vehicle?.vin || "",
          year: dealData.vehicle?.year || 0,
          make: dealData.vehicle?.make || "",
          model: dealData.vehicle?.model || "",
          trim: dealData.vehicle?.trim || undefined,
          body: dealData.vehicle?.body || undefined,
          doors: dealData.vehicle?.doors ?? undefined,
          transmission: dealData.vehicle?.transmission || undefined,
          engine: dealData.vehicle?.engine || undefined,
          cylinders: dealData.vehicle?.cylinders ?? undefined,
          titleNumber: dealData.vehicle?.title_number || undefined,
          mileage: dealData.vehicle?.mileage || 0,
          color: dealData.vehicle?.color || undefined,
        },
        pricing: {
          salePrice: dealData.deal.sale_amount || 0,
          salesTax: dealData.deal.sales_tax ?? undefined,
          docFee: dealData.deal.doc_fee ?? undefined,
          tradeInValue: dealData.deal.trade_in_value ?? undefined,
          downPayment: dealData.deal.down_payment ?? undefined,
          financedAmount: dealData.deal.financed_amount ?? undefined,
          totalAmount: dealData.deal.total_amount || 0,
        },
        businessInfo: {
          name: auth.user?.name || "Dealership",
          email: auth.user?.email || undefined,
        },
      };

      // Step 3: Generate PDF with Convex
      setGenerationStep(3);
      // Don't pass fieldMappings - let the backend extract and auto-map PDF fields
      // This ensures we use the actual field names from the uploaded PDF template
      const result = await generatePDFDocument({
        userId: userId as any,
        templatePdfBase64: templateBase64,
        // fieldMappings omitted - backend will extract and auto-map
        dealData: dealDataForAPI as any,
        documentType,
      });

      if (!result.success || !result.base64PDF) {
        const errorMsg = result.validationErrors?.length 
          ? `Validation errors: ${result.validationErrors.map((e: any) => e.error || `${e.pdfFieldName}: ${e.dataPath}` || String(e)).join(", ")}`
          : "Failed to generate document";
        throw new Error(errorMsg);
      }

      // Step 4: Convert base64 to Blob
      setGenerationStep(4);
      const pdfBlob = base64ToBlob(result.base64PDF);
      console.log("📄 [DOCUMENTS] PDF blob created, size:", pdfBlob.size, "bytes");

      // Step 5: Save document to disk and SQLite
      setGenerationStep(5);
      console.log("📄 [DOCUMENTS] Saving document to disk and database...");
      const clientFirstName = dealData.client?.first_name || "unknown";
      const documentName = result.filename || `${documentType}_${Date.now()}.pdf`;
      const savedDocument = await createDocument(
        {
          deal_id: dealId,
          type: documentType,
          filename: documentName,
          file_path: "", // Will be set by createDocument
        },
        pdfBlob,
        clientFirstName
      );
      console.log("✅ [DOCUMENTS] Document saved:", savedDocument.id);

      // Step 6: Refresh documents list
      setGenerationStep(6);
      await queryClient.invalidateQueries({ queryKey: ["standalone-documents", dealId] });
      await refetchDocuments();
      console.log("✅ [DOCUMENTS] Query cache invalidated and refetched");

      // Success!
      setIsGenerating(false);
      setGenerationStep(0);
      toast.success("Document generated successfully!", {
        description: `Filled ${result.fieldsFilled} fields. Document saved to disk.`,
      });

      // Reset form
      setUploadedTemplate(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("❌ [DOCUMENTS] Error generating document:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setIsGenerating(false);
      
      toast.error("Failed to generate document", {
        description: errorMessage,
        duration: 5000,
      });
      
      // Reset form on error
      setUploadedTemplate(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const docs = await getDocumentsByDeal(dealId);
      const doc = docs.find((d) => d.id === documentId);
      if (!doc) {
        toast.error("Document not found");
        return;
      }

      // Get document blob from file path
      const { getDocumentBlob } = await import("@/lib/sqlite/local-documents-service");
      const blob = await getDocumentBlob(documentId);
      
      if (!blob) {
        toast.error("Failed to load document file");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Document downloaded");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await deleteDocument(documentId);
      queryClient.invalidateQueries({ queryKey: ["standalone-documents", dealId] });
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Failed to delete document", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };


  if (!dealData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found</p>
          <Button
            onClick={() => navigate({ to: "/standalone/deals" })}
            className="mt-4"
          >
            Back to Deals
          </Button>
        </div>
      </Layout>
    );
  }

  const loadingStates = [
    { text: "Converting PDF template to base64..." },
    { text: "Preparing deal data..." },
    { text: "Generating PDF with Convex..." },
    { text: "Saving document to disk..." },
    { text: "Saving document metadata..." },
    { text: "Refreshing document list..." },
  ];

  return (
    <Layout>
      <MultiStepLoader
        loadingStates={loadingStates}
        loading={isGenerating}
        currentState={generationStep}
        duration={500}
        loop={false}
      />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/standalone/deals/${dealId}` })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Generate Documents</h1>
            <p className="text-muted-foreground mt-1">
              Upload a PDF template and generate filled documents
            </p>
          </div>
        </div>

        {/* Generate Document Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generate Document</h2>
          <FieldGroup>
            <Field>
              <FieldLabel>Document Type</FieldLabel>
              <FieldContent>
                <select
                  value={documentType}
                  onChange={(e) => handleDocumentTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="bill_of_sale">Bill of Sale</option>
                  <option value="buyers_order">Buyer's Order</option>
                  <option value="odometer_disclosure">Odometer Disclosure</option>
                  <option value="finance_agreement">Finance Agreement</option>
                  <option value="warranty">Warranty Agreement</option>
                  <option value="trade_in_appraisal">Trade-In Appraisal</option>
                  <option value="insurance_authorization">Insurance Authorization</option>
                  <option value="credit_application">Credit Application</option>
                </select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Template Source</FieldLabel>
              <FieldContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={useDefaultId}
                      name="template-source"
                      checked={useDefaultTemplate}
                      onChange={() => {
                        setUseDefaultTemplate(true);
                        const category = mapDocumentTypeToCategory(documentType);
                        const template = getDefaultTemplateByCategory(category);
                        setSelectedDefaultTemplate(template || null);
                        setUploadedTemplate(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <label htmlFor={useDefaultId} className="cursor-pointer">
                      Use Default Template
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={uploadCustomId}
                      name="template-source"
                      checked={!useDefaultTemplate}
                      onChange={() => {
                        setUseDefaultTemplate(false);
                        setSelectedDefaultTemplate(null);
                      }}
                      className="cursor-pointer"
                    />
                    <label htmlFor={uploadCustomId} className="cursor-pointer">
                      Upload Custom Template
                    </label>
                  </div>
                </div>
              </FieldContent>
            </Field>

            {useDefaultTemplate ? (
              <Field>
                <FieldLabel>Default Template</FieldLabel>
                <FieldContent>
                  <div className="space-y-2">
                    {selectedDefaultTemplate ? (
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{selectedDefaultTemplate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedDefaultTemplate.filename}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border rounded-md bg-yellow-50 border-yellow-200">
                        <p className="text-sm text-yellow-900">
                          No default template available for "{documentType}". Please upload your own template.
                        </p>
                      </div>
                    )}
                    {selectedDefaultTemplate && (
                      <p className="text-xs text-muted-foreground">
                        This is a default template provided by the system. You can upload your own custom template if needed.
                      </p>
                    )}
                  </div>
                </FieldContent>
              </Field>
            ) : (
              <Field>
                <FieldLabel>PDF Template File</FieldLabel>
                <FieldContent>
                  <div className="space-y-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                    />
                    {uploadedTemplate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{uploadedTemplate.name}</span>
                        <span className="text-xs">
                          ({(uploadedTemplate.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    )}
                  </div>
                </FieldContent>
              </Field>
            )}

            <div className="pt-4">
              <Button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  (useDefaultTemplate && !selectedDefaultTemplate) ||
                  (!useDefaultTemplate && !uploadedTemplate)
                }
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Generate Document
                  </>
                )}
              </Button>
            </div>
          </FieldGroup>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> {useDefaultTemplate 
                ? "Default templates are pre-configured and will automatically map fields to your deal data. You can upload custom templates if needed."
                : "The PDF template should have form fields with names that match common field patterns (e.g., \"BuyerFirstName\", \"VIN\", \"SalePrice\"). The system will automatically map these fields to your deal data."}
            </p>
          </div>
        </Card>

        {/* Existing Documents */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Documents</h2>
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents generated yet</p>
              <p className="text-sm mt-2">Upload a template above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{doc.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.type} •{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

