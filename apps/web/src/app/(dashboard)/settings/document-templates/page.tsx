"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,

  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { DocumentProgressCard } from "../_components/DcoumentProgressCard";
import { TemplateCard } from "../_components/TemplateCard";
import { EmptyState } from "../_components/EmptyState";

const CATEGORY_INFO = {
  bill_of_sale: {
    label: "Bill of Sale",
    description: "Primary sales agreement document",
    required: true,
  },
  odometer_disclosure: {
    label: "Odometer Disclosure",
    description: "Federal odometer mileage statement",
    required: false,
  },
  buyers_guide: {
    label: "Buyers Guide",
    description: "FTC-required buyer information",
    required: false,
  },
  power_of_attorney: {
    label: "Power of Attorney",
    description: "Authorization for title transactions",
    required: false,
  },
  trade_in: {
    label: "Trade-In Agreement",
    description: "Trade-in vehicle documentation",
    required: false,
  },
  finance_contract: {
    label: "Finance Contract",
    description: "Financing terms and conditions",
    required: false,
  },
  warranty: {
    label: "Warranty Agreement",
    description: "Extended warranty documentation",
    required: false,
  },
  custom: {
    label: "Custom Document",
    description: "Other dealership-specific forms",
    required: false,
  },
};

export default function DocumentTemplatesPage() {
  const { userId } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get user's dealership
  const user = useQuery(
    api.users.getCurrentUser,
    userId ? {} : "skip"
  );

  // Get templates
  const templates = useQuery(
    api.documents.templates.getTemplates,
    user?.dealershipId
      ? {
          dealershipId: user.dealershipId,
          category: selectedCategory === "all" ? undefined : selectedCategory,
        }
      : "skip"
  );

  // Get setup progress
  const progress = useQuery(
    api.documents.templates.getSetupProgress,
    user?.dealershipId ? { dealershipId: user.dealershipId } : "skip"
  );

  const isLoading = !user || templates === undefined || progress === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Document Templates</h1>
            <p className="mt-1 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Group templates by category
  const templatesByCategory = templates?.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Upload and manage PDF templates for deal documents
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href="/settings/document-templates/upload">
            <Upload className="w-4 h-4" />
            Upload Template
          </Link>
        </Button>
      </div>

      {/* Progress Card */}
      <DocumentProgressCard progress={progress} />

      {/* Missing Required Alert */}
      {!progress.hasRequired && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Bill of Sale Required</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>
              You must upload a Bill of Sale template before you can create deals.
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/document-templates/upload">
                Upload Now
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="overflow-x-auto justify-start w-full">
          <TabsTrigger value="all" className="gap-2">
            All Templates
            <Badge variant="secondary">{templates?.length || 0}</Badge>
          </TabsTrigger>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => {
            const count = templatesByCategory?.[key]?.length || 0;
            const hasActive = templatesByCategory?.[key]?.some((t) => t.isActive);

            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                {info.label}
                {hasActive && <CheckCircle className="w-3 h-3 text-green-600" />}
                <Badge variant="secondary">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* All Templates Tab */}
        <TabsContent value="all" className="mt-6 space-y-6">
          {Object.entries(CATEGORY_INFO).map(([category, info]) => {
            const categoryTemplates = templatesByCategory?.[category] || [];
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{info.label}</h2>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                    {info.required && (
                      <Badge variant="destructive">Required</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map((template) => (
                    <TemplateCard
                      key={template._id}
                      template={template}
                      dealershipId={user.dealershipId!}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {templates?.length === 0 && (
            <EmptyState
              title="No Templates Yet"
              description="Upload your first document template to get started"
              actionLabel="Upload Template"
              actionHref="/settings/document-templates/upload"
            />
          )}
        </TabsContent>

        {/* Individual Category Tabs */}
        {Object.entries(CATEGORY_INFO).map(([category, info]) => {
          const categoryTemplates = templatesByCategory?.[category] || [];

          return (
            <TabsContent key={category} value={category} className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-start">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{info.label}</CardTitle>
                        <CardDescription className="mt-2">
                          {info.description}
                        </CardDescription>
                        {info.required && (
                          <Badge variant="destructive" className="mt-2">
                            Required for Deal Creation
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" className="gap-2">
                      <Link
                        href={`/settings/document-templates/upload?category=${category}`}
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <div className="mt-6 space-y-4">
                {categoryTemplates.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryTemplates.map((template) => (
                      <TemplateCard
                        key={template._id}
                        template={template}
                        dealershipId={user.dealershipId!}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={`No ${info.label} Templates`}
                    description={`Upload a ${info.label} template to use in your deals`}
                    actionLabel="Upload Template"
                    actionHref={`/settings/document-templates/upload?category=${category}`}
                  />
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Learn how to prepare and upload document templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Template Requirements</h4>
              <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                <li>PDF format with fillable form fields</li>
                <li>Maximum file size: 25MB</li>
                <li>Form fields should have descriptive names</li>
                <li>Test your PDF in a form editor first</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">After Upload</h4>
              <ul className="space-y-1 text-sm list-disc list-inside text-muted-foreground">
                <li>System extracts form fields automatically</li>
                <li>Fields are mapped to deal data</li>
                <li>Review and adjust mappings if needed</li>
                <li>Activate template to use in deals</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/docs/templates" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}