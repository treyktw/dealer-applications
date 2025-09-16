"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignUp } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

const employeeSignUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  emailAddress: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  startDate: z.string().optional(),
});

type EmployeeSignUpForm = z.infer<typeof employeeSignUpSchema>;

const departments = [
  "Sales",
  "Service",
  "Finance",
  "Management",
  "Administration",
  "Parts",
  "Marketing",
  "Other",
] as const;

export default function EmployeeSignUpPage() {
  const { isLoaded, signUp } = useSignUp();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Use Convex query to get invitation data
  const invitationData = useQuery(api.users.getInvitationByToken, token ? { token } : "skip");
  const createEmployee = useMutation(api.users.createEmployee);

  const form = useForm<EmployeeSignUpForm>({
    resolver: zodResolver(employeeSignUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      emailAddress: "",
      password: "",
      phoneNumber: "",
      address: "",
      jobTitle: "",
      department: "",
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (invitationData) {
      form.setValue("emailAddress", invitationData.email);
    }
  }, [invitationData, form]);

  const onSubmit = async (data: EmployeeSignUpForm) => {
    if (!isLoaded || !invitationData) return;

    try {
      setIsLoading(true);

      // Step 1: Create the Clerk user
      const clerkResponse = await signUp.create({
        emailAddress: data.emailAddress,
        password: data.password,
      });

      // Update user metadata
      await signUp.update({
        unsafeMetadata: {
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          address: data.address,
          jobTitle: data.jobTitle,
          department: data.department,
          startDate: data.startDate,
          dealershipId: invitationData.dealershipId,
          role: invitationData.role,
          invitationToken: invitationData.token
        },
      });

      // Check if email verification is needed
      if (clerkResponse.status === "missing_requirements") {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code"
        });

        // Store user data in sessionStorage
        sessionStorage.setItem('employeeData', JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          emailAddress: data.emailAddress,
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          jobTitle: data.jobTitle,
          department: data.department,
          startDate: data.startDate || new Date().toISOString().split('T')[0],
          dealershipId: invitationData.dealershipId,
          role: invitationData.role,
          invitationToken: invitationData.token,
          clerkUserId: clerkResponse.createdUserId
        }));

        toast.success("Please check your email for the verification code");
        router.push(`/verify-email?token=${invitationData.token}`);
        return;
      }

      // If no verification needed
      if (clerkResponse.status === "complete") {
        await createEmployeeRecord(
          data.firstName,
          data.lastName,
          data.emailAddress,
          data.phoneNumber,
          data.address,
          data.jobTitle,
          data.department,
          data.startDate,
          invitationData.token,
          invitationData.dealershipId,
          invitationData.role as "ADMIN" | "STAFF" | "READONLY",
          clerkResponse.createdUserId!
        );
      }
    } catch (error) {
      console.error("Error during sign-up process:", error);
      let errorMessage = "Failed to create account. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("email")) {
          errorMessage = "There was a problem with the email address. Please try again.";
        } else if (error.message.includes("password")) {
          errorMessage = "There was a problem with the password. Please ensure it meets the requirements.";
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to create employee record using Convex
  const createEmployeeRecord = async (
    firstName: string,
    lastName: string,
    emailAddress: string,
    phoneNumber: string | undefined,
    address: string | undefined,
    jobTitle: string,
    department: string,
    startDate: string | undefined,
    invitationToken: string,
    dealershipId: string,
    role: "ADMIN" | "STAFF" | "READONLY",
    clerkId: string
  ) => {
    try {
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
        clerkId,
      });

      toast.success("Account created successfully!");
      router.push(`/onboarding?userId=${result.userId}`);
    } catch (error) {
      console.error("Error creating employee record:", error);
      throw error;
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This link is invalid or has expired. Please contact your administrator for a new invitation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            Create your account to join your dealership&apos;s team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  disabled={isLoading}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  disabled={isLoading}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("emailAddress")}
                disabled={true}
              />
              {form.formState.errors.emailAddress && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.emailAddress.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                disabled={isLoading}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                {...form.register("phoneNumber")}
                disabled={isLoading}
                placeholder="(123) 456-7890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                disabled={isLoading}
                placeholder="Enter your address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                {...form.register("jobTitle")}
                disabled={isLoading}
                placeholder="Enter your job title"
              />
              {form.formState.errors.jobTitle && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.jobTitle.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                onValueChange={(value) => form.setValue("department", value)}
                defaultValue={form.getValues("department")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.department && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.department.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                disabled={isLoading}
              />
            </div>

            {/* Clerk CAPTCHA element */}
            <div id="clerk-captcha" className="mt-4" />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 
