"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function DataExportPage() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  // Get current user's dealership
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const dealershipId = currentUser?.dealershipId;

  // Get export metadata
  const exportMetadata = useQuery(
    api.lib.export.getExportMetadata,
    dealershipId ? { dealershipId } : "skip"
  );

  // Export mutation
  const exportData = useQuery(
    api.lib.export.exportDealershipData,
    dealershipId && isExporting ? { dealershipId } : "skip"
  );

  const handleExport = async () => {
    if (!dealershipId) {
      toast({
        title: "Error",
        description: "No dealership found",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportComplete(false);

    try {
      // Wait for export data to be fetched
      // The query will trigger automatically when isExporting becomes true
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
      setIsExporting(false);
    }
  };

  // Handle export completion
  if (exportData && isExporting && !exportComplete) {
    // Create downloadable JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `dealership-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportComplete(true);
    setIsExporting(false);

    toast({
      title: "Export Complete",
      description: "Your data has been exported successfully.",
    });
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Export & Backup</h1>
        <p className="text-muted-foreground">
          Export your dealership data for backup, migration, or standalone app usage
        </p>
      </div>

      {/* Export Info Alert */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Exported data includes all dealership information, clients, vehicles, deals, and
          documents. Sensitive credentials are automatically excluded from exports.
        </AlertDescription>
      </Alert>

      {/* Export Metadata Card */}
      {exportMetadata && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data Overview</CardTitle>
            <CardDescription>Current data that will be included in the export</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{exportMetadata.totalUsers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{exportMetadata.totalClients}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicles</p>
                <p className="text-2xl font-bold">{exportMetadata.totalVehicles}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deals</p>
                <p className="text-2xl font-bold">{exportMetadata.totalDeals}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{exportMetadata.totalTemplates}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Size</p>
                <p className="text-2xl font-bold">{exportMetadata.estimatedExportSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Full Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Full Export
            </CardTitle>
            <CardDescription>
              Export all dealership data as a JSON file for backup or migration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExport}
              disabled={isExporting || !dealershipId}
              className="w-full"
            >
              {isExporting ? "Exporting..." : "Export All Data"}
            </Button>

            {exportComplete && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Export completed successfully</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtered Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Deals Export
            </CardTitle>
            <CardDescription>
              Export deals within a specific date range or status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Filtered exports will be available in a future update
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Import
          </CardTitle>
          <CardDescription>
            Import previously exported data (contact support for assistance)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Data imports are currently managed by our support team to ensure data integrity.
              Please contact support with your export file to schedule an import.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Important Notes</h3>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>Exported files are in JSON format and can be large for dealerships with extensive data</li>
          <li>Sensitive information (API keys, passwords) is automatically excluded from exports</li>
          <li>Document files stored in S3 are not included; only metadata and URLs are exported</li>
          <li>Exports are instant and do not affect your live dealership operations</li>
          <li>Keep exported files secure as they contain your business data</li>
        </ul>
      </div>
    </div>
  );
}
