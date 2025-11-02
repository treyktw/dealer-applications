"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft, ArrowRight, Info, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { FileUploadZone } from "../../_components/FileUploadZone";
import { UploadProgress } from "../../_components/UploadProgress";
import { FieldExtractionProgress } from "../../_components/FieldExtractionProgress";
import type { Id } from "@/convex/index";

const CATEGORIES = [
  { value: "bill_of_sale", label: "Bill of Sale", required: true },
  {
    value: "odometer_disclosure",
    label: "Odometer Disclosure",
    required: false,
  },
  { value: "buyers_guide", label: "Buyers Guide", required: false },
  { value: "power_of_attorney", label: "Power of Attorney", required: false },
  { value: "trade_in", label: "Trade-In Agreement", required: false },
  { value: "finance_contract", label: "Finance Contract", required: false },
  { value: "warranty", label: "Warranty Agreement", required: false },
  { value: "custom", label: "Custom Document", required: false },
];

type UploadStep = "details" | "upload" | "extracting" | "complete";

export default function UploadTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Dealership ID is now fetched from the dealership query above

  // Pre-fill category from URL params
  const preselectedCategory = searchParams.get("category");

  // Form state
  const [step, setStep] = useState<UploadStep>("details");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(preselectedCategory || "");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<{
    fieldCount?: number;
    mappingCount?: number;
  }>({});

  // Mutations
  const createTemplate = useMutation(api.documents.templates.createTemplate);
  const getUploadUrl = useAction(api.documents.templates.getTemplateUploadUrl);
  const completeUpload = useMutation(
    api.documents.templates.completeTemplateUpload
  );

  // Get current user and dealership
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = dealership?._id;

  const template = useQuery(
    api.documents.templates.getTemplateById,
    templateId ? { templateId: templateId as Id<"documentTemplates"> } : "skip"
  );

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
  }, []);

  // Update extraction status when template data changes
  useEffect(() => {
    if (template && template.pdfFields !== undefined && step === "extracting") {
      const fieldCount = template.pdfFields?.length || 0;
      const mappingCount = template.fieldMappings?.length || 0;
      
      if (fieldCount > 0) {
        console.debug("Template fields detected via useEffect:", { fieldCount, mappingCount });
        setExtractionStatus({
          fieldCount,
          mappingCount,
        });
        setStep("complete");
        
        if (mappingCount > 0) {
          toast.success(
            `Extracted ${fieldCount} fields with ${mappingCount} auto-mappings!`
          );
        } else {
          toast.success(
            `Extracted ${fieldCount} fields. Field mappings will be available for review.`
          );
        }
      }
    }
  }, [template, step]);

  const pollFieldExtraction = useCallback((templateId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds total (2s intervals)

    console.debug("Starting field extraction polling for template:", templateId);

    const interval = setInterval(() => {
      attempts++;

      console.debug(`Polling attempt ${attempts}/${maxAttempts} for template:`, templateId);

      // Check if template query has loaded with fields
      if (template && template.pdfFields !== undefined) {
        const fieldCount = template.pdfFields?.length || 0;
        const mappingCount = template.fieldMappings?.length || 0;
        const hasFields = fieldCount > 0;
        const hasMappings = mappingCount > 0;

        console.debug("Template data check:", {
          fieldCount,
          mappingCount,
          hasFields,
          hasMappings,
          pdfFields: template.pdfFields,
          fieldMappings: template.fieldMappings
        });

        if (hasFields) {
          console.debug("Field extraction complete:", {
            fieldCount,
            mappingCount,
            hasMappings,
          });

          clearInterval(interval);
          setExtractionStatus({
            fieldCount,
            mappingCount,
          });
          setStep("complete");
          
          // Provide detailed success message based on extraction results
          if (hasMappings) {
            toast.success(
              `Extracted ${fieldCount} fields with ${mappingCount} auto-mappings!`
            );
          } else {
            toast.success(
              `Extracted ${fieldCount} fields. Field mappings will be available for review.`
            );
          }
          return;
        }
      }

      // Timeout after max attempts
      if (attempts >= maxAttempts) {
        console.warn("Field extraction timeout reached for template:", templateId);
        clearInterval(interval);
        
        // Even if extraction is slow, move to complete step
        // User can still view template
        const fieldCount = template?.pdfFields?.length || 0;
        const mappingCount = template?.fieldMappings?.length || 0;
        
        setExtractionStatus({
          fieldCount,
          mappingCount,
        });
        setStep("complete");
        
        if (fieldCount > 0) {
          toast.success(
            `Extracted ${fieldCount} fields successfully!`
          );
        } else {
          toast.warning(
            "Field extraction is taking longer than expected. You can still view the template.",
            { duration: 5000 }
          );
        }
      }
    }, 2000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [template]);

  // Loading state
  if (currentUser === undefined || dealership === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if user has dealership access
  if (!currentUser || !currentUser.dealershipId || !dealershipId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">No Dealership Access</h2>
          <p className="mb-4 text-muted-foreground">
            You need to be associated with a dealership to upload templates.
          </p>
          <Button asChild>
            <Link href="/onboarding">Complete Setup</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (step === "details") {
      // Validate form
      if (!name.trim()) {
        toast.error("Template name is required");
        return;
      }
      if (!category) {
        toast.error("Please select a document category");
        return;
      }
      if (!selectedFile) {
        toast.error("Please select a PDF file");
        return;
      }

      // Move to upload step
      setStep("upload");
      handleUpload();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !dealershipId) return;

    try {
      setUploadProgress(10);

      // Step 1: Create template record
      const result = await createTemplate({
        dealershipId: dealershipId as Id<"dealerships">,
        name: name.trim(),
        category: category as "bill_of_sale" | "odometer_disclosure" | "buyers_guide" | "power_of_attorney" | "trade_in" | "finance_contract" | "warranty" | "custom",
        description: description.trim() || undefined,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      setTemplateId(result.templateId);
      setUploadProgress(20);

      // Step 2: Get presigned upload URL
      const { uploadUrl } = await getUploadUrl({
        templateId: result.templateId,
        contentType: "application/pdf",
      });

      setUploadProgress(30);

      // Step 3: Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": "application/pdf",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to S3");
      }

      setUploadProgress(70);

      // Step 4: Mark upload as complete and trigger field extraction
      await completeUpload({ templateId: result.templateId });

      setUploadProgress(100);
      setStep("extracting");

      // Poll for extraction completion
      pollFieldExtraction(result.templateId);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload template";
      toast.error(errorMessage);
      setStep("details");
    }
  };

  const handleFinish = () => {
    if (templateId) {
      router.push(`/settings/document-templates/${templateId}`);
    } else {
      router.push("/settings/document-templates");
    }
  };

  return (
    <div className="mx-auto space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex gap-4 items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/document-templates">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Template</h1>
          <p className="mt-1 text-muted-foreground">
            Add a new document template to your dealership
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <StepIndicator
              number={1}
              label="Details"
              active={step === "details"}
              complete={step !== "details"}
            />
            <div className="flex-1 h-0.5 bg-border mx-2" />
            <StepIndicator
              number={2}
              label="Upload"
              active={step === "upload"}
              complete={step === "extracting" || step === "complete"}
            />
            <div className="flex-1 h-0.5 bg-border mx-2" />
            <StepIndicator
              number={3}
              label="Extract Fields"
              active={step === "extracting"}
              complete={step === "complete"}
            />
            <div className="flex-1 h-0.5 bg-border mx-2" />
            <StepIndicator
              number={4}
              label="Complete"
              active={step === "complete"}
              complete={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step: Template Details */}
      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Provide information about the document template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id={name}
                placeholder="e.g., Georgia Bill of Sale 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give your template a descriptive name for easy identification
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Document Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={category}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex gap-2 items-center">
                        {cat.label}
                        {cat.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the type of document this template represents
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id={description}
                placeholder="Add any notes about this template..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>
                PDF Template <span className="text-destructive">*</span>
              </Label>
              <FileUploadZone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </div>

            {/* Requirements Alert */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>Template Requirements</AlertTitle>
              <AlertDescription className="space-y-1 text-xs">
                <ul className="list-disc list-inside space-y-0.5">
                  <li>PDF format with fillable form fields</li>
                  <li>Maximum file size: 25MB</li>
                  <li>Form fields should have descriptive names</li>
                  <li>Test your PDF in Adobe Acrobat or similar tool first</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/settings/document-templates">Cancel</Link>
              </Button>
              <Button
                onClick={handleNext}
                disabled={!name.trim() || !category || !selectedFile}
                className="flex-1 gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Uploading */}
      {step === "upload" && (
        <UploadProgress
          fileName={selectedFile?.name || ""}
          progress={uploadProgress}
        />
      )}

      {/* Step: Field Extraction */}
      {step === "extracting" && <FieldExtractionProgress templateName={name} />}

      {/* Step: Complete */}
      {step === "complete" && (
        <Card className="border-green-200 bg-zinc-800/50">
          <CardContent className="pt-12 pb-8 space-y-6 text-center">
            <div className="relative">
              <div className="flex absolute inset-0 justify-center items-center">
                <div className="w-24 h-24 bg-green-100 rounded-full opacity-25 animate-ping" />
              </div>
              <CheckCircle className="relative z-10 mx-auto w-24 h-24 text-green-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-green-200">
                Template Uploaded Successfully!
              </h2>
              <p className="text-green-700">
                Your template has been uploaded and is ready to use
              </p>
            </div>

            {/* Extraction Results */}
            {extractionStatus.fieldCount !== undefined && (
              <div className="p-4 mx-auto space-y-2 max-w-md rounded-lg bg-zinc-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    PDF Fields Detected:
                  </span>
                  <span className="text-lg font-bold">
                    {extractionStatus.fieldCount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Auto-Mapped Fields:
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {extractionStatus.mappingCount}
                  </span>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-green-800">What&apos;s Next?</p>
              <div className="flex flex-col gap-2 justify-center sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => router.push("/settings/document-templates")}
                >
                  Back to Templates
                </Button>
                {templateId && (
                  <>
                    <Button variant="outline" asChild>
                      <Link
                        href={`/settings/document-templates/${templateId}/map-fields`}
                      >
                        Review Field Mappings
                      </Link>
                    </Button>
                    <Button onClick={handleFinish}>
                      View Template Details
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Step Indicator Component
function StepIndicator({
  number,
  label,
  active,
  complete,
}: {
  number: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
          transition-colors
          ${
            complete
              ? "bg-primary text-primary-foreground"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
          }
        `}
      >
        {complete ? <CheckCircle className="w-5 h-5" /> : number}
      </div>
      <span
        className={`text-xs font-medium ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
