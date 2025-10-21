"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FileText,
  MoreVertical,
  Eye,
  Download,
  Settings,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import type { Id, Doc } from "@/convex/_generated/dataModel";

interface TemplateCardProps {
  template: Doc<"documentTemplates"> & {
    uploadedByUser?: {
      name: string;
      email: string;
    } | null;
  };
  dealershipId: Id<"dealerships">;
}

export function TemplateCard({ template, dealershipId }: TemplateCardProps) {
  // Use dealershipId for potential future features like dealership-specific actions
  console.debug("Template card for dealership:", dealershipId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activateTemplate = useMutation(api.documents.templates.activateTemplate);
  const deactivateTemplate = useMutation(api.documents.templates.deactivateTemplate);
  const deleteTemplate = useMutation(api.documents.templates.deleteTemplate);
  const getDownloadUrl = useAction(api.documents.templates.getTemplateDownloadUrl);

  const handleToggleActive = async () => {
    try {
      if (template.isActive) {
        await deactivateTemplate({ templateId: template._id });
        toast.success("Template deactivated");
      } else {
        await activateTemplate({ templateId: template._id });
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
      const { downloadUrl } = await getDownloadUrl({ templateId: template._id });
      window.open(downloadUrl, "_blank");
    } catch (error: unknown) {
      console.error("Failed to download template:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to download template";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTemplate({ templateId: template._id });
      toast.success("Template deleted successfully", {
        description: "The template and its PDF file have been permanently removed.",
        duration: 5000,
      });
      setShowDeleteDialog(false);
    } catch (error: unknown) {
      console.error("Failed to delete template:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete template";
      toast.error("Failed to delete template", {
        description: errorMessage,
        duration: 7000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all",
          template.isActive && "border-primary ring-2 ring-primary/20"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex gap-2 justify-between items-start">
            <div className="flex flex-1 gap-3 items-start min-w-0">
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  template.isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  {template.isActive && (
                    <Badge variant="default" className="text-xs shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 w-8 h-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/settings/document-templates/${template._id}`}
                    className="cursor-pointer"
                  >
                    <Eye className="mr-2 w-4 h-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 w-4 h-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`/settings/document-templates/${template._id}/map-fields`}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 w-4 h-4" />
                    Edit Mappings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleActive}>
                  {template.isActive ? (
                    <>
                      <XCircle className="mr-2 w-4 h-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 w-4 h-4" />
                      Set as Active
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Version</div>
              <div className="font-medium">v{template.version}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Fields</div>
              <div className="font-medium">
                {template.pdfFields?.length || 0}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Size</div>
              <div className="font-medium">
                {(template.fileSize / 1024).toFixed(0)}KB
              </div>
            </div>
          </div>

          {/* Upload Info */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              Uploaded {formatDistanceToNow(template.createdAt, { addSuffix: true })}
            </span>
            {template.uploadedByUser && (
              <span className="truncate">by {template.uploadedByUser.name}</span>
            )}
          </div>

          {/* Field Mappings Status */}
          {template.fieldMappings?.length > 0 && (
            <div className="flex gap-2 items-center text-xs">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="font-medium text-green-600">
                {template.fieldMappings.length} fields mapped
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Template?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Are you sure you want to permanently delete &quot;{template.name}&quot; (v{template.version})?
              </span>
              <span className="text-sm text-muted-foreground">
                This will remove:
              </span>
              <ul className="ml-4 space-y-1 text-sm list-disc list-inside text-muted-foreground">
                <li>The template record from the database</li>
                <li>The PDF file from cloud storage</li>
                <li>All field mappings and configurations</li>
              </ul>
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone.
              </p>
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
                <>
                  <Trash2 className="mr-2 w-4 h-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}