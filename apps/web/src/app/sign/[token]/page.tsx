"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Signature, { type SignatureRef } from "@uiw/react-signature";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  PenTool,
  FileText,
  Building,
  User,
  Clock,
  Shield,
  Trash2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatExpiryTime } from "@/lib/signature-utils";

export default function SignaturePage() {
  const params = useParams();
  const token = params.token as string;

  const signatureRef = useRef<SignatureRef>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Calculate progress based on completed steps
  const calculateProgress = () => {
    if (!session) return 0;
    if (session.status === "signed") return 100;
    if (session.status === "expired") return 0;
    
    let progress = 0;
    if (hasDrawn) progress += 50;
    if (consentGiven) progress += 50;
    return progress;
  };

  const progress = calculateProgress();

  // Fetch session data
  const session = useQuery(api.signatures.getSignatureSession, { token });
  const submitSignature = useMutation(api.signatures.submitSignature);

  // Get user's IP address
  const [ipAddress, setIpAddress] = useState<string>("unknown");
  const [geolocation, setGeolocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    // Get IP address
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((data) => setIpAddress(data.ip))
      .catch(() => setIpAddress("unknown"));

    // Get geolocation if user permits
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // User denied location, that's fine
          setGeolocation(null);
        }
      );
    }
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!session?.expiresAt) return;

    const interval = setInterval(() => {
      setTimeRemaining(formatExpiryTime(session.expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  // Track if user has drawn on canvas
  const handleCanvasChange = useCallback(() => {
    setHasDrawn(true);
  }, []);

  const handleClear = useCallback(() => {
    signatureRef.current?.clear();
    setHasDrawn(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!consentGiven) {
      setError("Please agree to use electronic signatures");
      return;
    }

    if (!hasDrawn) {
      setError("Please provide your signature");
      return;
    }

    const svgElement = signatureRef.current?.svg;
    if (!svgElement) {
      setError("Failed to capture signature");
      return;
    }
    
    // Convert SVG element to string and then to data URL
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const signatureData = `data:image/svg+xml;base64,${btoa(svgString)}`;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitSignature({
        sessionToken: token,
        signatureData,
        consentGiven: true,
        ipAddress,
        userAgent: navigator.userAgent,
        geolocation: geolocation || undefined,
      });

      setSuccess(true);

      // Show success for 3 seconds then attempt to close
      setTimeout(() => {
        // Try to close window (works if opened by window.open)
        window.close();

        // If still here after 1 second, show message
        setTimeout(() => {
          const closeMessage = document.getElementById("close-message");
          if (closeMessage) {
            closeMessage.style.display = "block";
          }
        }, 1000);
      }, 3000);
    } catch (err: unknown) {
      console.error("Failed to submit signature:", err);
      setError(err instanceof Error ? err.message : "Failed to submit signature. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    consentGiven,
    hasDrawn,
    submitSignature,
    token,
    ipAddress,
    geolocation,
  ]);

  // Loading state
  if (!session) {
    return (
      <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4 text-center">
            <Loader2 className="mx-auto w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading signature request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if session is expired
  const isExpired = session.status === "expired" || Date.now() > session.expiresAt;

  // Expired state
  if (isExpired) {
    return (
      <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex gap-3 items-center">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-red-900">Session Expired</CardTitle>
                <CardDescription>
                  This signature request has timed out
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This signature request has expired for security reasons. Signature
              sessions are only valid for 15 minutes.
            </p>
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertTitle>What to do next</AlertTitle>
              <AlertDescription>
                Please ask the dealer to generate a new signature request. They can
                do this from their desktop application.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already signed state
  if (session.status === "signed") {
    return (
      <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <Card className="w-full max-w-md border-green-200">
          <CardHeader>
            <div className="flex gap-3 items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-green-900">Already Signed</CardTitle>
                <CardDescription>This document has been signed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This document has already been signed. The signature was captured on{" "}
              {session.signedAt
                ? new Date(session.signedAt).toLocaleString()
                : "an earlier date"}
              .
            </p>
            
            {/* Completion Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Complete</span>
                <span className="font-medium text-green-800">100%</span>
              </div>
              <Progress value={100} className="h-2 bg-green-100" />
            </div>
            
            <div className="text-xs text-center text-muted-foreground">
              You can safely close this page.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md border-green-200 shadow-xl">
          <CardContent className="pt-12 pb-8 space-y-6 text-center">
            <div className="relative">
              <div className="flex absolute inset-0 justify-center items-center">
                <div className="w-24 h-24 bg-green-100 rounded-full opacity-25 animate-ping" />
              </div>
              <CheckCircle className="relative z-10 mx-auto w-24 h-24 text-green-600" />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-green-900">
                Signature Submitted!
              </h2>
              <p className="text-muted-foreground">
                Your signature has been captured and securely stored.
              </p>
              
              {/* Completion Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700">Complete</span>
                  <span className="font-medium text-green-800">100%</span>
                </div>
                <Progress value={100} className="h-2 bg-green-100" />
              </div>
            </div>

            <div className="p-4 space-y-2 bg-green-50 rounded-lg">
              <div className="flex gap-2 justify-center items-center text-sm text-green-800">
                <Shield className="w-4 h-4" />
                <span>Encrypted and secure</span>
              </div>
              <p className="text-xs text-green-700">
                Your signature is encrypted and will be automatically deleted after
                30 days.
              </p>
            </div>

            <div
              id="close-message"
              style={{ display: "none" }}
              className="text-sm text-muted-foreground animate-fade-in"
            >
              You can now close this window and return to the dealer.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main signature capture UI
  return (
    <div className="p-4 py-8 min-h-screen bg-gradient-to-br via-blue-50 from-slate-50 to-slate-100">
      <div className="mx-auto space-y-6 max-w-2xl">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex justify-center items-center p-3 mb-2 rounded-full bg-primary/10">
            <PenTool className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Electronic Signature Required
          </h1>
          <p className="text-muted-foreground">
            Please review the details below and provide your signature
          </p>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className={cn(hasDrawn ? "font-medium text-green-600" : "")}>
                ✓ Signature
              </span>
              <span className={cn(consentGiven ? "font-medium text-green-600" : "")}>
                ✓ Consent
              </span>
            </div>
          </div>
        </div>

        {/* Session Info Card */}
        <Card className="shadow-md border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Signature Details</CardTitle>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {timeRemaining}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Signing as</p>
                  <p className="font-medium truncate">{session.signerName}</p>
                  {session.signerEmail && (
                    <p className="text-xs truncate text-muted-foreground">
                      {session.signerEmail}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Document Type</p>
                  <p className="font-medium">
                    {session.document?.documentType || "Deal Document"}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-1 text-xs capitalize"
                  >
                    {session.signerRole}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dealership Info */}
            {session.dealership && (
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Dealership</p>
                  <p className="font-medium">{session.dealership.name}</p>
                  {session.dealership.address && (
                    <p className="text-xs text-muted-foreground">
                      {session.dealership.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900">
                This is a secure session. Your signature will be encrypted and
                stored securely for 30 days before automatic deletion.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Signature Canvas Card */}
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Sign Below</CardTitle>
                <CardDescription>Draw your signature using your finger or stylus</CardDescription>
              </div>
              {hasDrawn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Canvas Container */}
            <div
              className={cn(
                "relative bg-white rounded-xl border-2 border-dashed shadow-inner transition-colors",
                hasDrawn ? "border-primary" : "border-muted-foreground/25"
              )}
            >
              {/* Hint overlay when canvas is empty */}
              {!hasDrawn && (
                <div className="flex absolute inset-0 z-10 justify-center items-center pointer-events-none">
                  <div className="space-y-2 text-center text-muted-foreground/50">
                    <PenTool className="mx-auto w-8 h-8" />
                    <p className="text-sm font-medium">Sign here</p>
                  </div>
                </div>
              )}

              <Signature
                ref={signatureRef}
                options={{
                  size: 4,
                  thinning: 0.5,
                  smoothing: 0.5,
                  streamline: 0.5,
                }}
                style={{
                  width: "100%",
                  height: "300px",
                }}
                onChange={handleCanvasChange}
              />
            </div>

            {/* Progress indicator */}
            {hasDrawn && (
              <div className="flex gap-2 items-center text-sm text-green-600 animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                <span>Signature captured</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consent Card */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Legal Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scrollable consent text */}
            <div className="overflow-y-auto p-4 space-y-3 max-h-48 text-sm rounded-lg border bg-muted/50">
              <p className="font-medium">Electronic Signature Consent</p>
              <p className="leading-relaxed text-muted-foreground">
                By signing electronically, you agree that your electronic signature
                is the legal equivalent of your manual signature on this document.
                You acknowledge that you are signing this document voluntarily and
                that you have the right to request a paper copy.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                Your signature data will be securely stored for 30 days for audit
                and legal compliance purposes, after which it will be permanently
                and securely deleted. The signature image is encrypted at rest and
                in transit.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                You further acknowledge that:
              </p>
              <ul className="ml-2 space-y-1 list-disc list-inside text-muted-foreground">
                <li>You have read and understood this document</li>
                <li>You are legally authorized to sign this document</li>
                <li>The information provided is accurate and complete</li>
                <li>
                  This electronic signature has the same legal effect as a
                  handwritten signature
                </li>
              </ul>
            </div>

            {/* Consent checkbox */}
            <div className="flex gap-3 items-start p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="consent"
                className="flex-1 text-sm leading-relaxed cursor-pointer"
              >
                <span className="font-medium text-amber-900">
                  I have read and agree to the electronic signature terms above.
                </span>{" "}
                <span className="text-amber-800">
                  I understand that my signature will be legally binding and securely
                  stored for 30 days.
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="animate-shake">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Card className="shadow-md border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <Button
              onClick={handleSubmit}
              disabled={!consentGiven || !hasDrawn || isSubmitting}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                  Submitting Signature...
                </>
              ) : (
                <>
                  <PenTool className="mr-2 w-5 h-5" />
                  Submit Signature
                </>
              )}
            </Button>

            {/* Requirements checklist */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Before submitting:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  className={cn(
                    "flex gap-2 items-center p-2 text-xs rounded-md transition-colors",
                    hasDrawn
                      ? "text-green-700 bg-green-50"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {hasDrawn ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2" />
                  )}
                  <span>Provide signature</span>
                </div>
                <div
                  className={cn(
                    "flex gap-2 items-center p-2 text-xs rounded-md transition-colors",
                    consentGiven
                      ? "text-green-700 bg-green-50"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {consentGiven ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2" />
                  )}
                  <span>Accept terms</span>
                </div>
              </div>
            </div>

            {/* Footer info */}
            <div className="flex gap-2 justify-center items-center pt-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              <span>
                Session expires in <strong>{timeRemaining}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security Footer */}
        <div className="space-y-1 text-xs text-center text-muted-foreground">
          <p>🔒 Secured with end-to-end encryption</p>
          <p>IP Address: {ipAddress}</p>
        </div>
      </div>
    </div>
  );
}