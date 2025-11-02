import { Edit, Mail, ChevronRight, CheckCircle2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, convexMutation } from "@/lib/convex";
import { api } from "@dealer/convex";
import type { Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "react-hot-toast";
import { useOpenLink } from "@/components/link-handler";
import { useState } from "react";

interface SignatureStepProps {
  dealsId: string;
  documents?: Array<{
    _id: Id<"documentInstances">;
    requiredSignatures?: string[];
    signaturesCollected?: Array<{
      role: string;
      signatureId: Id<"signatures">;
      signedAt: number;
    }>;
  }>;
  dealDetails?: {
    client?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
  sessionToken?: string;
  onBack: () => void;
  onContinue: () => void;
}

export function SignatureStep({ 
  dealsId, 
  documents, 
  dealDetails,
  sessionToken: _sessionToken,
  onBack, 
  onContinue 
}: SignatureStepProps) {
  const authData = useAuth();
  const session = authData.session;
  const { openWebApp, openLink } = useOpenLink();
  const [creatingSession, setCreatingSession] = useState<string | null>(null);

  // Fetch signatures for this deal
  const { data: signatures, isLoading: signaturesLoading } = useQuery({
    queryKey: ["signatures", dealsId, session?.token],
    queryFn: async () => {
      const currentSession = authData.session;
      if (!currentSession?.token) {
        throw new Error("No session token");
      }
      return convexQuery(api.api.signatures.getSignaturesForDeal, {
        dealId: dealsId as Id<"deals">,
      });
    },
    enabled: !!session?.token && !!dealsId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Determine required signatures from all documents
  const requiredSignatures = new Set<string>();
  documents?.forEach((doc) => {
    doc.requiredSignatures?.forEach((role) => {
      requiredSignatures.add(role);
    });
  });

  // Determine which signatures have been collected
  const collectedSignatures = new Map<string, boolean>();
  documents?.forEach((doc) => {
    doc.signaturesCollected?.forEach((collected) => {
      if (!collectedSignatures.has(collected.role)) {
        collectedSignatures.set(collected.role, true);
      }
    });
  });

  // Also check from signatures query result
  signatures?.forEach((sig) => {
    collectedSignatures.set(sig.signerRole, true);
  });

  // Check if all required signatures are collected
  const allSignaturesCollected = Array.from(requiredSignatures).every((role) =>
    collectedSignatures.get(role) === true
  );

  // Get signature status for a role
  const getSignatureStatus = (role: string) => {
    const isRequired = requiredSignatures.has(role);
    const isCollected = collectedSignatures.get(role) === true;
    
    if (!isRequired) {
      return { status: "not_required" as const, collected: false };
    }
    if (isCollected) {
      return { status: "signed" as const, collected: true };
    }
    return { status: "pending" as const, collected: false };
  };

  const buyerStatus = getSignatureStatus("buyer");
  const sellerStatus = getSignatureStatus("seller");
  const notaryStatus = getSignatureStatus("notary");

  // Get primary document for signatures (use first document that requires signatures)
  const primaryDocument = documents?.find((doc) => 
    doc.requiredSignatures && doc.requiredSignatures.length > 0
  );

  // Create signature session mutation
  const createSessionMutation = useMutation({
    mutationFn: async ({
      role,
      isRemote,
    }: {
      role: "buyer" | "seller" | "notary";
      isRemote: boolean;
    }) => {
      const currentSession = authData.session;
      const currentUser = authData.user;
      
      if (!currentSession?.token) {
        throw new Error("No session token");
      }
      if (!primaryDocument) {
        throw new Error("No document available for signatures");
      }

      // Get signer name based on role
      let signerName = "";
      let signerEmail: string | undefined = undefined;

      if (role === "buyer") {
        signerName = dealDetails?.client
          ? `${dealDetails.client.firstName || ""} ${dealDetails.client.lastName || ""}`.trim() || "Buyer"
          : "Buyer";
        signerEmail = dealDetails?.client?.email;
      } else if (role === "seller") {
        signerName = currentUser?.name || "Dealer Representative";
      } else if (role === "notary") {
        signerName = "Notary Public";
      }

      const result = await convexMutation(api.api.signatures.createSignatureSession, {
        dealId: dealsId as Id<"deals">,
        documentId: primaryDocument._id,
        signerRole: role,
        signerName,
        signerEmail,
        sessionToken: currentSession.token,
      });

      return { ...result, role, isRemote };
    },
    onSuccess: async (data) => {
      if (data.isRemote) {
        // Open signature URL in browser
        if (data.signatureUrl) {
          console.log("Opening signature URL:", data.signatureUrl);
          try {
            // signatureUrl from backend is a full URL (e.g., https://.../sign/token)
            // Use openLink to open full URLs directly
            if (data.signatureUrl.startsWith('http://') || data.signatureUrl.startsWith('https://')) {
              await openLink(data.signatureUrl);
              toast.success("Signature link opened in browser");
            } else {
              // If it's just a path, use openWebApp
              await openWebApp(data.signatureUrl);
              toast.success("Signature link opened in browser");
            }
          } catch (error) {
            console.error("Failed to open signature link:", error);
            toast.error(`Failed to open signature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          console.error("No signature URL in response:", data);
          toast.error("No signature URL returned from server");
        }
      } else {
        // For local signing, we'll show a modal (to be implemented)
        toast.success("Signature session created. Opening signature capture...");
        // TODO: Open local signature capture modal
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create signature session");
    },
  });

  // Handler for signing
  const handleSign = async (role: "buyer" | "seller" | "notary", isRemote: boolean = false) => {
    setCreatingSession(role);
    try {
      await createSessionMutation.mutateAsync({ role, isRemote });
    } finally {
      setCreatingSession(null);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Collect Signatures</h2>
        <p className="text-muted-foreground">
          Collect all required signatures for this deal
        </p>
      </div>

      {signaturesLoading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Buyer Signature */}
          <div className={`p-6 rounded-lg border ${
            buyerStatus.status === "signed" ? "border-green-200" : ""
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Buyer Signature</h4>
              {buyerStatus.status === "signed" && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {buyerStatus.status === "pending" && (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              disabled={
                buyerStatus.status === "signed" || 
                buyerStatus.status === "not_required" ||
                creatingSession === "buyer" ||
                !primaryDocument
              }
              onClick={() => handleSign("buyer", false)}
            >
              {creatingSession === "buyer" ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : buyerStatus.status === "signed" ? (
                <>
                  <CheckCircle2 className="mr-2 w-4 h-4" />
                  Signed
                </>
              ) : buyerStatus.status === "not_required" ? (
                <>
                  <Edit className="mr-2 w-4 h-4" />
                  Not Required
                </>
              ) : (
                <>
                  <Edit className="mr-2 w-4 h-4" />
                  Sign Now
                </>
              )}
            </Button>
          </div>

          {/* Dealer/Seller Signature */}
          <div className={`p-6 rounded-lg border ${
            sellerStatus.status === "signed" ? "bg-green-50 border-green-200" : ""
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Dealer Representative</h4>
              {sellerStatus.status === "signed" && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {sellerStatus.status === "pending" && (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              disabled={
                sellerStatus.status === "signed" || 
                sellerStatus.status === "not_required" ||
                creatingSession === "seller" ||
                !primaryDocument
              }
              onClick={() => handleSign("seller", false)}
            >
              {creatingSession === "seller" ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : sellerStatus.status === "signed" ? (
                <>
                  <CheckCircle2 className="mr-2 w-4 h-4" />
                  Signed
                </>
              ) : sellerStatus.status === "not_required" ? (
                <>
                  <Edit className="mr-2 w-4 h-4" />
                  Not Required
                </>
              ) : (
                <>
                  <Edit className="mr-2 w-4 h-4" />
                  Sign Now
                </>
              )}
            </Button>
          </div>

          {/* Notary Signature (if required) */}
          {requiredSignatures.has("notary") && (
            <div className={`p-6 rounded-lg border ${
              notaryStatus.status === "signed" ? "bg-green-50 border-green-200" : ""
            }`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Notary Signature</h4>
                {notaryStatus.status === "signed" && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {notaryStatus.status === "pending" && (
                  <Clock className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={
                  notaryStatus.status === "signed" ||
                  creatingSession === "notary" ||
                  !primaryDocument
                }
                onClick={() => handleSign("notary", false)}
              >
                {creatingSession === "notary" ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : notaryStatus.status === "signed" ? (
                  <>
                    <CheckCircle2 className="mr-2 w-4 h-4" />
                    Signed
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 w-4 h-4" />
                    Sign Now
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Remote signature option */}
      <div className="p-6 rounded-lg border bg-accent">
        <div className="flex gap-3 items-start mb-4">
          <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="mb-1 font-medium">Send for Remote Signature</h4>
            <p className="text-sm text-muted-foreground">
              Send a link to the client to sign documents remotely
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full"
          disabled={!primaryDocument || creatingSession !== null}
          onClick={async () => {
            // For remote signing, create a buyer signature session by default
            // Could also show a dialog to select which role
            if (buyerStatus.status === "pending") {
              await handleSign("buyer", true);
            } else {
              toast("Select a signature above to send a link");
            }
          }}
        >
          {creatingSession ? (
            <>
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              Creating Link...
            </>
          ) : (
            <>
              <Mail className="mr-2 w-4 h-4" />
              Send Signature Link
            </>
          )}
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onContinue}
          disabled={!allSignaturesCollected || signaturesLoading}
        >
          Continue to Notarization
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}