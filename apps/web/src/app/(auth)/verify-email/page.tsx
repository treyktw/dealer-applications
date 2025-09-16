"use client";

import { useState, useEffect } from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface EmployeeData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  address?: string;
  jobTitle: string;
  department: string;
  startDate: string;
  invitationToken: string;
  dealershipId: string;
  role: "ADMIN" | "STAFF" | "READONLY";
}

interface ClerkWindow extends Window {
  Clerk: {
    signOut: () => Promise<void>;
  }
}

export default function VerifyEmailPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const createEmployee = useMutation(api.users.createEmployee);

  useEffect(() => {
    // Get stored employee data
    const storedData = sessionStorage.getItem('employeeData');
    if (storedData) {
      setEmployeeData(JSON.parse(storedData));
    }
    
    // If already signed in, redirect to dashboard
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded || !verificationCode.trim()) {
      toast.error("Please enter the verification code from your email");
      return;
    }
    
    try {
      setIsVerifying(true);
      
      // Attempt to verify the email address
      const verifyResult = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      
      if (verifyResult.status === "complete") {
        // Set active session
        await setActive({ session: verifyResult.createdSessionId });
        
        toast.success("Email verified successfully!");
        let userId;

        const clerkUserId = verifyResult.createdUserId;

        if (!clerkUserId) {
          console.error("No Clerk user ID available after verification");
          toast.error("Verification successful but user ID is missing");
          return;
        }
        
        // Now create the employee record if we have the data
        if (employeeData) {
          try {
            const {
              firstName,
              lastName,
              emailAddress,
              phoneNumber,
              address,
              jobTitle,
              department,
              startDate,
              invitationToken,
              dealershipId,
              role
            } = employeeData;
            
            const result = await createEmployee({
              firstName,
              lastName,
              emailAddress,
              phoneNumber,
              address,
              jobTitle,
              department,
              startDate,
              invitationToken,
              dealershipId: dealershipId as Id<"dealerships">,
              role,
              clerkId: clerkUserId,
            });
            
            userId = result.userId;
            
            // Clear stored data
            sessionStorage.removeItem('employeeData');
            
            // Redirect to onboarding or dashboard
            router.push(`/onboarding?userId=${userId}`);
          } catch (error) {
            console.error("Error creating employee record:", error);
            toast.error("Account verified but employee record creation failed. Please contact support.");
            
            // Log the user out since we couldn't create the employee record
            if ('Clerk' in window) {
              await ((window as ClerkWindow).Clerk.signOut());
            }
            
            router.push(`/employee-signup?token=${token}&error=employee_creation_failed`);
          }
        } else {
          // No employee data found, just redirect to dashboard
          router.push('/dashboard');
        }
      } else {
        toast.error("Verification failed. Please try again with a valid code.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            Please enter the verification code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                disabled={isVerifying}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}