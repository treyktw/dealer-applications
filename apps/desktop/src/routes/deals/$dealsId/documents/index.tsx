// src/routes/deals/$dealsId/documents/index.tsx - Clean Orchestrator

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOpenLink } from "@/components/link-handler";

// Custom hooks
import { useDealDocuments } from "@/components/documents/hooks/useDealDocuments";
import { useDocumentActions } from "@/components/documents/hooks/useDocumentActions";

// Components
import { DocumentsHeader } from "@/components/documents/DocumentsHeader";
import { ProgressSteps, type Step } from "@/components/documents/ProgressSteps";
import { ReviewStep } from "@/components/documents/ReviewStep";
import { FinalizeStep } from "@/components/documents/FinalizeStep";


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
            {error?.message?.includes("Invalid or expired session")
              ? "Your session appears to have expired or gone offline. We'll retry briefly — or refresh to continue."
              : (error?.message || "This deal could not be loaded.")}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                // soft refresh: refetch data
                refetchDocuments();
              }}
            >
              Retry
            </Button>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button onClick={() => navigate({ to: "/deals" })} variant="ghost">
              Return to Deals
            </Button>
          </div>
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
                onContinue={() => setCurrentStep("finalize")}
              />
            )}

            {currentStep === "finalize" && (
              <FinalizeStep
                onBack={() => setCurrentStep("review")}
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