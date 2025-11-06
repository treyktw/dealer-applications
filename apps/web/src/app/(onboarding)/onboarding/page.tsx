// app/(onboarding)/onboarding/page.tsx - REVERTED: Create Dealership First
'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, Cloud, CreditCard, ArrowRight } from 'lucide-react';
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function OnboardingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dealershipName, setDealershipName] = useState('');
  const [description, setDescription] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  // Move useId calls to top level
  const dealershipNameId = useId();
  const descriptionId = useId();

  // Convex mutations and queries
  const createDealership = useMutation(api.dealerships.createDealership);
  const updateCurrentUserByClerkId = useMutation(api.users.updateCurrentUserByClerkId);
  const createUser = useMutation(api.users.createUser);
  const currentDealership = useQuery(api.dealerships.getCurrentDealership, {});

  // Create user when component mounts
  useEffect(() => {
    if (user && isLoaded) {
      console.log("Creating user during onboarding for:", user.id);
      createUser({
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
        clerkId: user.id,
      }).catch((error) => {
        console.error("Error creating user during onboarding:", error);
      });
    }
  }, [user, isLoaded, createUser]);

  // Redirect if user already has a dealership
  useEffect(() => {
    if (currentDealership) {
      console.log("User already has dealership, redirecting to dashboard");
      router.push('/dashboard');
    }
  }, [currentDealership, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dealershipName.trim()) {
      toast.error('Dealership name is required');
      return;
    }

    if (!user) {
      toast.error('User not loaded');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Starting onboarding process for user:", user.id);

      // Step 1: Create dealership
      setCurrentStep(1);
      const now = Date.now();

      console.log("Creating dealership with name:", dealershipName);
      const convexDealershipId = await createDealership({
        name: dealershipName,
        description: description || undefined,
        createdAt: now,
        updatedAt: now,
      });

      console.log("Created dealership with ID:", convexDealershipId);

      // Step 2: Update user with dealership
      setCurrentStep(2);
      console.log("Updating user with dealership ID");
      await updateCurrentUserByClerkId({
        clerkId: user.id,
        dealershipId: convexDealershipId,
      });

      console.log("Updated user successfully");

      // Step 3 used to create buckets; now storage is centrally managed.
      setCurrentStep(3);

      // Step 4: Update Clerk metadata
      setCurrentStep(4);
      console.log("Updating Clerk metadata");
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          dealershipId: convexDealershipId,
          onboardingComplete: true,
        },
      });

      console.log("Updated Clerk metadata successfully");

      toast.success('Dealership setup complete! Next: Choose your subscription plan.');

      // Redirect to dashboard (subscription flow will handle the rest)
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
      setCurrentStep(1);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  const getStepIcon = (step: number) => {
    if (currentStep === step && isSubmitting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    switch (step) {
      case 1: return <Building2 className="h-4 w-4" />;
      case 2: return <Building2 className="h-4 w-4" />;
      case 3: return <Cloud className="h-4 w-4" />;
      case 4: return <CreditCard className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const getStepText = (step: number) => {
    switch (step) {
      case 1: return "Creating dealership...";
      case 2: return "Setting up user account...";
      case 3: return "Configuring your account...";
      case 4: return "Finalizing setup...";
      default: return "Processing...";
    }
  };

  return (
    <div className="container max-w-lg py-20 mx-auto min-h-screen flex items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Welcome to DMS Pro
          </CardTitle>
          <CardDescription>
            Let&apos;s set up your dealership account with secure file storage and API access
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Progress indicator when submitting */}
            {isSubmitting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {getStepIcon(currentStep)}
                  <span className="text-sm font-medium text-blue-900">
                    {getStepText(currentStep)}
                  </span>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-blue-600 mb-1">
                    <span>Setting up your dealership</span>
                    <span>{Math.round((currentStep / 4) * 100)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(currentStep / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dealership-name">Dealership Name</Label>
              <Input
                id={`dealership-name-${dealershipNameId}`}
                placeholder="Enter your dealership name"
                value={dealershipName}
                onChange={(e) => setDealershipName(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                This will be used for your API endpoints and file storage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id={`description-${descriptionId}`}
                placeholder="Briefly describe your dealership"
                className="min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* What happens next */}
            <div className="bg-zinc-900 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3">What we&apos;ll set up for you:</h4>
              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  <span>Dealership management system</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cloud className="h-3 w-3" />
                  <span>Secure file storage (S3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3 w-3" />
                  <span>REST API for your website</span>
                </div>
              </div>
            </div>

            {/* Next step preview */}
            <div className="bg-zinc-900 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-white mb-2">
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium text-sm">Next Step</span>
              </div>
              <p className="text-sm text-white">
                After creating your dealership, you&apos;ll choose a subscription plan to unlock all features.
              </p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your dealership...
                </>
              ) : (
                'Create My Dealership'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}