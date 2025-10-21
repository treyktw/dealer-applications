"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Download,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  HardDrive,
  MapPin,
  Loader2,
  Eye,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as Id<"documentTemplates">;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const template = useQuery(api.documents.templates.getTemplateById, { templateId });

  // Mutations
  const activateTemplate = useMutation(api.documents.templates.activateTemplate);
  const deactivateTemplate = useMutation(api.documents.templates.deactivateTemplate);
  const deleteTemplate = useMutation(api.documents.templates.deleteTemplate);
  const getDownloadUrl = useAction(api.documents.templates.getTemplateDownloadUrl);

  const handleToggleActive = async () => {
    try {
      if (template?.isActive) {
        await deactivateTemplate({ templateId });
        toast.success("Template deactivated");
      } else {
        await activateTemplate({ templateId });
        toast.success("Template activated");
      }
    } catch (error: unknown) {
      console.error("Failed to toggle template active status:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update template";
      toast.error(errorMessage);
    }
  };

  const handleDownload = async () => {
    try {
      const { downloadUrl } = await getDownloadUrl({ templateId });
      window.open(downloadUrl, "_blank");
      toast.success("Opening PDF in new tab");
    } catch (error: unknown) {
      console.error("Failed to download template:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to download template";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTemplate({ templateId });
      toast.success("Template deleted");
      router.push("/settings/document-templates");
    } catch (error: unknown) {
      console.error("Failed to delete template:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete template";
      toast.error(errorMessage);
      setIsDeleting(false);
    }
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categoryLabel = template.category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex gap-4 items-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/document-templates">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Link>
            </Button>
          </div>
          <div className="flex gap-3 items-center">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
              <div className="flex gap-2 items-center mt-1">
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{categoryLabel}</Badge>
                <Badge variant="outline">v{template.version}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <Button
            variant={template.isActive ? "outline" : "default"}
            onClick={handleToggleActive}
            className="gap-2"
          >
            {template.isActive ? (
              <>
                <XCircle className="w-4 h-4" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Activate
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fields">
            PDF Fields
            <Badge variant="secondary" className="ml-2">
              {template.pdfFields?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="mappings">
            Field Mappings
            <Badge variant="secondary" className="ml-2">
              {template.fieldMappings?.length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
              <CardDescription>Basic details about this template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              {template.description && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              )}

              <Separator />

              {/* Metadata Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-sm text-muted-foreground">{categoryLabel}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-muted">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">File Size</p>
                      <p className="text-sm text-muted-foreground">
                        {(template.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-muted">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Storage Location</p>
                      <p className="font-mono text-sm truncate text-muted-foreground">
                        {template.s3Key.split("/").slice(-2).join("/")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-muted">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Uploaded By</p>
                      <p className="text-sm text-muted-foreground">
                        {template.uploadedByUser?.name}
                      </p>
                      {template.uploadedByUser?.email && (
                        <p className="text-xs text-muted-foreground">
                          {template.uploadedByUser.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(template.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(template.updatedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">PDF Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {template.pdfFields?.length || 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Form fields detected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Mapped Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {template.fieldMappings?.length || 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Auto-mapped to data
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center">
                  {template.isActive ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage this template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="gap-2 justify-start w-full" asChild>
                <Link href={`/settings/document-templates/${templateId}/map-fields`}>
                  <Settings className="w-4 h-4" />
                  Edit Field Mappings
                </Link>
              </Button>
              <Button variant="outline" className="gap-2 justify-start w-full" onClick={handleDownload}>
                <Eye className="w-4 h-4" />
                Preview PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Fields Tab */}
        <TabsContent value="fields" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PDF Form Fields</CardTitle>
              <CardDescription>
                Fields extracted from the PDF template
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.pdfFields && template.pdfFields.length > 0 ? (
                <div className="space-y-2">
                  {template.pdfFields.map((field, index) => (
                    <div
                      key={`${field.name}-${index}`}
                      className="flex justify-between items-center p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <code className="font-mono text-sm">{field.name}</code>
                        <div className="flex gap-2 items-center mt-1">
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Page {field.page}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-4 w-12 h-12 opacity-50" />
                  <p>No PDF fields detected</p>
                  <p className="mt-2 text-sm">
                    The PDF may not contain fillable form fields
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mappings Tab */}
        <TabsContent value="mappings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Field Mappings</CardTitle>
                  <CardDescription>
                    How PDF fields map to deal data
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="gap-2">
                  <Link href={`/settings/document-templates/${templateId}/map-fields`}>
                    <Edit className="w-4 h-4" />
                    Edit Mappings
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {template.fieldMappings && template.fieldMappings.length > 0 ? (
                <div className="space-y-2">
                  {template.fieldMappings.map((mapping, index) => (
                    <div
                      key={`${mapping.pdfFieldName}-${index}`}
                      className="flex justify-between items-center p-4 rounded-lg border"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex gap-2 items-center">
                          <code className="font-mono text-sm font-medium">
                            {mapping.pdfFieldName}
                          </code>
                          {mapping.autoMapped && (
                            <Badge variant="secondary" className="text-xs">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 items-center text-sm text-muted-foreground">
                          <span>→</span>
                          <code className="font-mono">{mapping.dataPath}</code>
                          {mapping.transform && (
                            <Badge variant="outline" className="text-xs">
                              {mapping.transform}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {mapping.required && (
                        <Badge variant="destructive" className="ml-4">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <MapPin className="mx-auto mb-4 w-12 h-12 opacity-50" />
                  <p>No field mappings configured</p>
                  <p className="mt-2 text-sm">
                    Map PDF fields to deal data to use this template
                  </p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href={`/settings/document-templates/${templateId}/map-fields`}>
                      Configure Mappings
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{template.name}&quot; (v{template.version})?
              This action cannot be undone. Any deals using this template will need to
              be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Template"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}