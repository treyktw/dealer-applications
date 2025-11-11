import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  FileText,
  User,
  Car,
  DollarSign,
  Calendar,
  Download,
  Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  getDeal,
  deleteDeal,
  updateDeal,
} from "@/lib/sqlite/local-deals-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { getClient } from "@/lib/sqlite/local-clients-service";
import { getVehicle } from "@/lib/sqlite/local-vehicles-service";
import { getDocumentsByDeal, getDocumentBlob } from "@/lib/sqlite/local-documents-service";
import JSZip from "jszip";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export const Route = createFileRoute("/standalone/deals/$dealId/")({
  component: DealDetailPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function DealDetailPage() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useUnifiedAuth();

  const { data: dealData, isLoading, error: dealError } = useQuery({
    queryKey: ["standalone-deal", dealId, auth.user?.id],
    queryFn: async () => {
      if (!auth.user?.id) throw new Error("User not authenticated");
      const deal = await getDeal(dealId, auth.user.id);
      if (!deal) {
        throw new Error("Deal not found");
      }

      const client = await getClient(deal.client_id, auth.user.id);
      const vehicle = await getVehicle(deal.vehicle_id);

      return {
        deal,
        client,
        vehicle,
      };
    },
  });

  // Load documents for this deal
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["standalone-documents", dealId],
    queryFn: async () => {
      try {
        return await getDocumentsByDeal(dealId);
      } catch (error) {
        console.error("❌ [DEAL-DETAIL] Error loading documents:", error);
        return [];
      }
    },
  });

  if (dealError) {
    console.error("❌ [DEAL-DETAIL] Error loading deal:", dealError);
  }

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => updateDeal(dealId, { status }, auth.user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-deal", dealId] });
      queryClient.invalidateQueries({ queryKey: ["standalone-deals"] });
      toast.success("Deal status updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update deal status", {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeal(dealId, auth.user?.id),
    onSuccess: () => {
      toast.success("Deal deleted successfully");
      navigate({ to: "/standalone/deals" });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete deal", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this deal? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const handleDownloadZip = async () => {
    if (documents.length === 0) {
      toast.error("No documents to download");
      return;
    }

    setIsDownloadingZip(true);
    const loadingToast = toast.loading("Creating ZIP file...");

    try {
      const zip = new JSZip();
      let addedCount = 0;

      // Add each document to the ZIP
      for (const doc of documents) {
        try {
          const blob = await getDocumentBlob(doc.id);
          if (blob) {
            zip.file(doc.filename, blob);
            addedCount++;
          }
        } catch (error) {
          console.error(`Failed to load document ${doc.id}:`, error);
        }
      }

      if (addedCount === 0) {
        toast.error("No documents could be loaded", { id: loadingToast });
        setIsDownloadingZip(false);
        return;
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipArrayBuffer = await zipBlob.arrayBuffer();
      const zipUint8Array = new Uint8Array(zipArrayBuffer);

      // Get default downloads directory
      let defaultDir: string;
      try {
        defaultDir = await invoke<string>("get_downloads_dir");
      } catch (error) {
        console.warn("Could not get downloads dir, using fallback", error);
        defaultDir = "";
      }

      // Generate filename
      const clientName = dealData?.client
        ? `${dealData.client.first_name}-${dealData.client.last_name}`
        : "client";
      const defaultFileName = `deal-${clientName}-${new Date().toISOString().split("T")[0]}.zip`;
      const defaultPath = defaultDir ? `${defaultDir}/${defaultFileName}` : defaultFileName;

      // Use Tauri dialog to save file
      const filePath = await save({
        defaultPath,
        filters: [
          {
            name: "ZIP Archive",
            extensions: ["zip"],
          },
        ],
      });

      if (filePath) {
        // Write file using Tauri FS
        await writeFile(filePath, zipUint8Array);

        toast.success(
          <div className="flex items-center gap-2">
            <span>Downloaded {addedCount} document{addedCount > 1 ? "s" : ""}!</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await invoke("reveal_in_explorer", { filePath });
                } catch (error) {
                  console.error("Failed to reveal file:", error);
                }
              }}
              className="text-xs underline hover:no-underline"
            >
              Show in folder
            </button>
          </div>,
          { id: loadingToast, duration: 5000 }
        );

        // Open file explorer
        try {
          await invoke("reveal_in_explorer", { filePath });
        } catch (error) {
          console.warn("Failed to open file explorer:", error);
        }
      } else {
        toast.dismiss(loadingToast);
      }
    } catch (error) {
      console.error("Error creating ZIP:", error);
      toast.error("Failed to create ZIP file", {
        id: loadingToast,
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading deal...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!dealData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found</p>
          <Button
            onClick={() => navigate({ to: "/standalone/deals" })}
            className="mt-4"
          >
            Back to Deals
          </Button>
        </div>
      </Layout>
    );
  }

  const { deal, client, vehicle } = dealData;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/standalone/deals" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Deal #{dealId.slice(-8)}</h1>
              <p className="text-muted-foreground mt-1">
                Created {new Date(deal.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`${statusColors[deal.status]} text-white`}
                >
                  {statusLabels[deal.status] || deal.status}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("draft")}>
                  Set as Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("pending")}>
                  Set as Pending
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateStatusMutation.mutate("in_progress")}
                >
                  Set as In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("completed")}>
                  Set as Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate("cancelled")}>
                  Set as Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Deal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold">Client Information</h3>
            </div>
            {client ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {client.first_name} {client.last_name}
                  </p>
                </div>
                {client.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                )}
                {client.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {client.address}
                      {client.city && client.state && (
                        <>
                          <br />
                          {client.city}, {client.state} {client.zip_code}
                        </>
                      )}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate({ to: `/standalone/clients/${client.id}` })}
                >
                  View Client Details
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">Client not found</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Car className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold">Vehicle Information</h3>
            </div>
            {vehicle ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  {vehicle.trim && (
                    <p className="text-sm text-muted-foreground">{vehicle.trim}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">VIN</p>
                  <p className="font-medium font-mono text-sm">{vehicle.vin}</p>
                </div>
                {vehicle.stock_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Number</p>
                    <p className="font-medium">{vehicle.stock_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-medium">{vehicle.mileage.toLocaleString()} mi</p>
                </div>
                {vehicle.color && (
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="font-medium">{vehicle.color}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate({ to: `/standalone/vehicles/${vehicle.id}` })}
                >
                  View Vehicle Details
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">Vehicle not found</p>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold">Financial Details</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deal Type:</span>
                <Badge variant="outline">{deal.type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sale Amount:</span>
                <span className="font-medium">
                  ${(deal.sale_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sales Tax:</span>
                <span className="font-medium">
                  ${(deal.sales_tax || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Doc Fee:</span>
                <span className="font-medium">
                  ${(deal.doc_fee || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {deal.trade_in_value ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Trade-In Value:</span>
                  <span className="font-medium text-red-600">
                    -${deal.trade_in_value.toLocaleString()}
                  </span>
                </div>
              ) : null}
              {deal.down_payment ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Down Payment:</span>
                  <span className="font-medium">
                    ${deal.down_payment.toLocaleString()}
                  </span>
                </div>
              ) : null}
              {deal.financed_amount ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount Financed:</span>
                  <span className="font-medium text-primary">
                    ${deal.financed_amount.toLocaleString()}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-xl font-bold">
                  ${deal.total_amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="font-semibold">Timeline</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">
                {new Date(deal.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="font-medium">
                {new Date(deal.updated_at).toLocaleString()}
              </span>
            </div>
            {deal.sale_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sale Date:</span>
                <span className="font-medium">
                  {new Date(deal.sale_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Documents</h3>
                <p className="text-sm text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? "s" : ""} generated
                </p>
              </div>
            </div>
            {documents.length > 0 && (
              <Button
                onClick={handleDownloadZip}
                disabled={isDownloadingZip}
                variant="outline"
                className="gap-2"
              >
                {isDownloadingZip ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating ZIP...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download All ({documents.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {isLoadingDocuments ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-1">No documents generated yet</p>
              <p className="text-xs text-muted-foreground">
                Documents are automatically generated when you create a deal
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {doc.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const blob = await getDocumentBlob(doc.id);
                          if (!blob) {
                            toast.error("Failed to load document");
                            return;
                          }
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = doc.filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          toast.success("Document downloaded");
                        } catch {
                          toast.error("Failed to download document");
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
