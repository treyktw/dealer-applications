// Fixed invitation flow compatible with existing UserSync pattern
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, UserPlus, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser, useSignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const { user, isLoaded: userLoaded } = useUser();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"verify" | "signup" | "signin" | "verify-email" | "complete">("verify");
  const [userCreatedInClerk, setUserCreatedInClerk] = useState(false);

  // Verify invitation token with error handling
  const invitation = useQuery(api.employees.verifyInvitation, { token });
  const acceptInvitation = useMutation(api.employees.acceptInvitation);
  
  // Handle invitation verification errors gracefully
  const invitationError = useMemo(() => {
    if (invitation === null) {
      return "This invitation link is invalid or has expired.";
    }
    return null;
  }, [invitation]);
  

  
  // Determine step directly
  const currentStep = useMemo(() => {
    if (!invitation || !userLoaded) return "verify";
    
    if (user && user.primaryEmailAddress?.emailAddress === invitation.email) {
      if (invitation.status === "accepted") {
        // Handle redirect
        toast.info("This invitation has already been accepted. Redirecting...");
        router.push("/dashboard");
        return "verify"; // or a loading state
      }
      return "complete";
    }
    
    if (user && user.primaryEmailAddress?.emailAddress !== invitation.email) {
      toast.error("This invitation is for a different email address. Please sign out and try again.");
      return "verify";
    }
    
    return step; // Use state only for user-initiated step changes
  }, [invitation, userLoaded, user, step, router]);

  const handleInvitationAcceptance = useCallback(async () => {
    if (!invitation || !user) {
      console.log("Missing invitation or user data, skipping acceptance");
      return;
    }

    // Prevent multiple simultaneous calls
    if (isProcessing) {
      console.log("Already processing invitation, skipping");
      return;
    }

    setIsProcessing(true);
    try {
      const fullName = user.fullName || `${firstName} ${lastName}`.trim() || user.primaryEmailAddress?.emailAddress || "User";
      
      console.log("Accepting invitation for user:", {
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: fullName
      });
      
      // Accept the invitation - this will update the user's role and dealership
      await acceptInvitation({
        token,
        name: fullName,
        clerkId: user.id,
      });

      toast.success("Welcome to the team! Redirecting to dashboard...");
      
      // Give a moment for the database to update
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
      
    } catch (error: unknown) {
      console.error("Accept invitation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to accept invitation";
      toast.error(errorMessage);
      setIsProcessing(false); // Reset processing state on error
    }
    // Don't reset isProcessing on success since we're redirecting
  }, [invitation, user, isProcessing, firstName, lastName, acceptInvitation, token, router]);

  // Watch for when user gets synced after Clerk account creation
  useEffect(() => {
    // If we're in complete step, user is authenticated, and we have invitation data
    if (currentStep === "complete" && user && invitation && userCreatedInClerk) {
      console.log("User is ready, starting invitation acceptance process...");
      
      // Small delay to ensure UserSync has had time to run
      const timer = setTimeout(() => {
        handleInvitationAcceptance();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentStep, user, invitation, userCreatedInClerk, handleInvitationAcceptance]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !invitation) return;

    setIsProcessing(true);
    try {
      // Create Clerk account
      await signUp.create({
        emailAddress: invitation.email,
        password: password,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      
      toast.success("Please check your email for a verification code");
      setStep("verify-email");
    } catch (error: unknown) {
      console.error("Signup error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { errors?: Array<{ message: string }> })?.errors?.[0]?.message || "Failed to create account";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !invitation) return;

    setIsProcessing(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete") {
        toast.success("Email verified! Setting up your account...");
        
        // Immediately move to complete step since user is now authenticated
        setStep("complete");
        setUserCreatedInClerk(true);
      }
    } catch (error: unknown) {
      console.error("Verification error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { errors?: Array<{ message: string }> })?.errors?.[0]?.message || "Invalid verification code";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExistingUserSignIn = async () => {
    if (!invitation) return;
    
    // Redirect to sign in page with the email pre-filled
    const redirectUrl = encodeURIComponent(`/invitation/${token}`);
    router.push(`/sign-in?redirect_url=${redirectUrl}`);
  };



  if (!invitation && !invitationError) {
    // Still loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Card className="w-full max-w-md bg-neutral-800 border-neutral-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-neutral-400 animate-spin" />
              <h3 className="mt-2 text-lg font-medium text-neutral-100">Verifying Invitation</h3>
              <p className="mt-1 text-sm text-neutral-400">
                Please wait while we verify your invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationError || !invitation) {
    // Show specific error message
    const errorMessage = invitationError || "This invitation link is invalid or has expired.";
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Card className="w-full max-w-md bg-neutral-800 border-neutral-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-lg font-medium text-neutral-100">
                {invitationError?.includes("expired") ? "Invitation Expired" : "Invalid Invitation"}
              </h3>
              <p className="mt-1 text-sm text-neutral-400">
                {errorMessage}
              </p>
              {invitationError?.includes("expired") && (
                <p className="mt-2 text-xs text-neutral-500">
                  Please contact your administrator to request a new invitation.
                </p>
              )}
              <Link href="/sign-in">
                <Button className="mt-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-100">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-neutral-800 border-neutral-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-neutral-300" />
          </div>
          <CardTitle className="text-2xl text-neutral-100">Join {invitation.dealershipName}</CardTitle>
          <CardDescription className="text-neutral-400">
            You&apos;ve been invited to join as a{" "}
            <Badge variant="secondary" className="mx-1 bg-neutral-600 text-neutral-200">
              {invitation.role}
            </Badge>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-neutral-700 rounded-lg p-4 space-y-2">
            <div className="flex items-center text-sm text-neutral-300">
              <Mail className="h-4 w-4 mr-2" />
              {invitation.email}
            </div>
            <div className="flex items-center text-sm text-neutral-300">
              <Building2 className="h-4 w-4 mr-2" />
              {invitation.dealershipName}
            </div>
          </div>

          {/* Step: Verify (check if user exists) */}
          {currentStep === "verify" && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400 text-center">
                Do you already have an account with this email?
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={handleExistingUserSignIn} 
                  variant="outline" 
                  className="w-full bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600"
                >
                  Yes, I have an account
                </Button>
                <Button 
                  onClick={() => setStep("signup")} 
                  className="w-full bg-neutral-600 hover:bg-neutral-500 text-neutral-100"
                >
                  No, create new account
                </Button>
              </div>
            </div>
          )}

          {/* Step: Sign Up */}
          {currentStep === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-neutral-200">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                    className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder:text-neutral-400"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-neutral-200">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                    className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder:text-neutral-400"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-neutral-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  required
                  minLength={8}
                  className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder:text-neutral-400"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-neutral-600 hover:bg-neutral-500 text-neutral-100" 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep("verify")} 
                className="w-full text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
              >
                Back
              </Button>
            </form>
          )}

          {/* Step: Verify Email */}
          {currentStep === "verify-email" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-neutral-100 mb-2">Check your email</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  We sent a verification code to {invitation.email}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-neutral-200">Verification Code</Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  className="bg-neutral-700 border-neutral-600 text-neutral-100 placeholder:text-neutral-400 text-center text-lg"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-neutral-600 hover:bg-neutral-500 text-neutral-100" 
                disabled={isProcessing || verificationCode.length !== 6}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep("signup")} 
                className="w-full text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
              >
                Back
              </Button>
            </form>
          )}

          {/* Step: Complete (user is signed in) */}
          {currentStep === "complete" && user && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-neutral-100">Welcome!</h3>
                <p className="text-sm text-neutral-400 mt-1">
                  {userCreatedInClerk && isProcessing 
                    ? "Setting up your account..." 
                    : "Click below to complete your invitation and access the system."
                  }
                </p>
              </div>
              {!userCreatedInClerk ? (
                <Button 
                  onClick={handleInvitationAcceptance} 
                  className="w-full bg-green-700 hover:bg-green-600 text-neutral-100" 
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up your account...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-5 w-5 text-green-400 animate-spin" />
                  <span className="text-sm text-neutral-300">Finalizing your account...</span>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center">
          <p className="text-sm text-neutral-400 text-center w-full">
            Reload the page it did not reload automatically!
          </p>
          <p className="text-sm text-neutral-400 text-center w-full">
            We are working to fix it!
          </p>
        </CardFooter>
      </Card>


    </div>
  );
}