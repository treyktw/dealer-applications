// src/routes/deals/$dealsId/documents/index.tsx - Clean Orchestrator

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, Edit, FileText, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOpenLink } from "@/components/link-handler";

// Custom hooks
import { useDealDocuments } from "@/components/documents/hooks/useDealDocuments";
import { useDocumentActions } from "@/components/documents/hooks/useDocumentActions";

// Components
import { DocumentsHeader } from "@/components/documents/DocumentsHeader";
import { ProgressSteps, type Step } from "@/components/documents/ProgressSteps";
import { ReviewStep } from "@/components/documents/ReviewStep";
import { EditStep } from "@/components/documents/EditStep";
import { FinalizeStep } from "@/components/documents/FinalizeStep";
import { NotarizeStep } from "@/components/documents/NoterizeStep";
import { SignatureStep } from "@/components/documents/SignatureStep";


export const Route = createFileRoute("/deals/$dealsId/documents/")({
  component: DocumentsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || undefined, // Deep link token
  }),
});

function DocumentsPage() {
  const { dealsId } = Route.useParams();
  const search = Route.useSearch();
  const { openWebApp } = useOpenLink();
  const navigate = useNavigate();

  // State
  const [currentStep, setCurrentStep] = useState<Step>("review");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Data fetching
  const {
    deal,
    dealDetails,
    documents,
    customDocuments,
    isLoading,
    error,
    sessionToken,
    refetchDocuments,
  } = useDealDocuments({
    dealsId,
    deepLinkToken: search.token,
  });

  // Document actions
  const {
    downloadDocument,
    downloadCustomDocument,
    deleteCustomDocument,
  } = useDocumentActions(refetchDocuments);

  // Steps configuration
  const steps = [
    {
      id: "review" as Step,
      label: "Review",
      icon: <Eye className="w-4 h-4" />,
      description: "Review all deal documents",
    },
    {
      id: "edit" as Step,
      label: "Corrections",
      icon: <Edit className="w-4 h-4" />,
      description: "Make any necessary corrections",
    },
    {
      id: "sign" as Step,
      label: "Signatures",
      icon: <FileText className="w-4 h-4" />,
      description: "Collect required signatures",
    },
    {
      id: "notarize" as Step,
      label: "Notarize",
      icon: <Shield className="w-4 h-4" />,
      description: "Notarize documents (if required)",
    },
    {
      id: "finalize" as Step,
      label: "Finalize",
      icon: <CheckCircle2 className="w-4 h-4" />,
      description: "Complete and archive deal",
    },
  ];

  // Handlers
  const handleViewCustomDocument = (document: string) => {
    navigate({ 
      to: '/deals/$dealsId/documents/$documents', 
      params: { dealsId, documents: document } 
    });
  };

  const handleViewGeneratedDocument = (documentId: any) => {
    downloadDocument.mutate(documentId);
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocument(documentId);
    toast.success("Opening document editor...");
  };

  const handleUpload = () => {
    toast.success("Upload functionality coming soon");
  };

  const handleCompleteDeal = () => {
    toast.success("Deal completed!");
  };

  // Loading state
  if (!sessionToken) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <AlertCircle className="mb-4 w-16 h-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold">Session Expired</h2>
          <p className="mb-6 text-muted-foreground">
            Your session has expired. Please sign in again.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>
            Return to Home
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="inline-block w-16 h-16 rounded-full border-4 animate-spin border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading deal...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !deal) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <AlertCircle className="mb-4 w-16 h-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold">Deal Not Found</h2>
          <p className="mb-6 text-muted-foreground">
            {error?.message || "This deal could not be loaded."}
          </p>
          <Button onClick={() => navigate({ to: "/deals" })}>
            Return to Deals
          </Button>
        </div>
      </Layout>
    );
  }

  // Main render
  return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
         <DocumentsHeader
           dealDetails={dealDetails ? {
             client: {
               firstName: dealDetails.client?.firstName,
               lastName: dealDetails.client?.lastName,
             },
             vehicle: {
               year: dealDetails.vehicle?.year,
               make: dealDetails.vehicle?.make,
               model: dealDetails.vehicle?.model,
             },
           } : undefined}
           dealsId={dealsId}
           onViewInWebApp={() => openWebApp(`/deals/${dealsId}`)}
         />

        {/* Progress Steps */}
        <div className="p-6 border-b">
          <ProgressSteps
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Step Content */}
        <div className="p-6">
          <div className="mx-auto max-w-4xl">
            {currentStep === "review" && (
              <ReviewStep
                documents={documents}
                customDocuments={customDocuments}
                onDownloadGenerated={handleViewGeneratedDocument}
                onViewCustom={handleViewCustomDocument}
                onDownloadCustom={(id) => downloadCustomDocument.mutate(id)}
                onDeleteCustom={(id) => deleteCustomDocument.mutate(id)}
                onUpload={handleUpload}
                onContinue={() => setCurrentStep("edit")}
              />
            )}

            {currentStep === "edit" && (
              <EditStep
                documents={documents?.map(doc => ({
                  ...doc,
                  template: doc.template ? {
                    _id: doc.template._id,
                    name: doc.template.name
                  } : undefined
                }))}
                dealsId={dealsId}
                sessionToken={sessionToken}
                onSelectDocument={handleSelectDocument}
                onBack={() => setCurrentStep("review")}
                onContinue={() => setCurrentStep("sign")}
              />
            )}

            {currentStep === "sign" && (
              <SignatureStep
                dealsId={dealsId}
                documents={documents}
                dealDetails={dealDetails ? {
                  client: {
                    firstName: dealDetails.client?.firstName,
                    lastName: dealDetails.client?.lastName,
                    email: dealDetails.client?.email,
                  },
                } : undefined}
                sessionToken={sessionToken}
                onBack={() => setCurrentStep("edit")}
                onContinue={() => setCurrentStep("notarize")}
              />
            )}

            {currentStep === "notarize" && (
              <NotarizeStep
                dealsId={dealsId}
                documents={documents}
                sessionToken={sessionToken}
                onBack={() => setCurrentStep("sign")}
                onContinue={() => setCurrentStep("finalize")}
              />
            )}

            {currentStep === "finalize" && (
              <FinalizeStep
                onBack={() => setCurrentStep("notarize")}
                onComplete={handleCompleteDeal}
                dealsId={dealsId}
                documents={documents}
                customDocuments={customDocuments}
                dealDetails={dealDetails ? {
                  client: {
                    firstName: dealDetails.client?.firstName,
                    lastName: dealDetails.client?.lastName,
                    email: dealDetails.client?.email,
                  },
                } : undefined}
                sessionToken={sessionToken}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}