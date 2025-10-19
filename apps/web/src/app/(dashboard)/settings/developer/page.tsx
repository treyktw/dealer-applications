// src/app/(dashboard)/settings/developer/page.tsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { 
  Trash2, 
  AlertTriangle, 
  Database, 
  Users, 
  Building2, 
  Loader2,
  Shield,
  Code,
  Copy,
  ExternalLink
} from "lucide-react";

interface BucketCheckResult {
  totalDealerships: number;
  dealershipsWithBuckets: number;
  dealershipsWithoutBuckets: number;
  created: string[];
  failed: string[];
}

export default function DeveloperToolsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [bucketCheckResult, setBucketCheckResult] = useState<BucketCheckResult | null>(null);
  
  const { user } = useUser();
  const currentDealership = useQuery(api.dealerships.getCurrentDealership, {});
  const deleteUserData = useMutation(api.developer.deleteCurrentUserData);
  const checkAndCreateMissingBuckets = useAction(api.secure_s3.checkAndCreateMissingBuckets);

  const handleBulkBucketCheck = async (dryRun: boolean = true) => {
    try {
      toast.loading(dryRun ? "Checking all dealership buckets..." : "Creating missing buckets...");
      
      const result = await checkAndCreateMissingBuckets({ dryRun });
      setBucketCheckResult(result);
      
      toast.dismiss();
      
      if (dryRun) {
        toast.success(`Found ${result.dealershipsWithoutBuckets} dealerships missing buckets`);
      } else {
        if (result.created.length > 0) {
          toast.success(`Created ${result.created.length} buckets successfully!`);
        } else if (result.dealershipsWithoutBuckets === 0) {
          toast.success("All dealerships already have buckets!");
        } else {
          toast.warning(`${result.failed.length} bucket creations failed`);
        }
      }
    } catch (error) {
      toast.dismiss();
      console.error("Bucket check error:", error);
      toast.error("Failed to check buckets: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // Get API endpoints for this dealership
  const getApiEndpoints = () => {
    if (!currentDealership) return [];
    
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-app.convex.site' 
      : 'http://localhost:3000';
    
    return [
      {
        method: 'GET',
        endpoint: `/api/vehicles/${currentDealership._id}`,
        description: 'Get all available vehicles',
        example: `${baseUrl}/api/vehicles/${currentDealership._id}?page=1&limit=20`
      },
      {
        method: 'GET', 
        endpoint: `/api/vehicle/${currentDealership._id}/{vehicleId}`,
        description: 'Get specific vehicle details',
        example: `${baseUrl}/api/vehicle/${currentDealership._id}/vehicle123`
      },
      {
        method: 'GET',
        endpoint: `/api/dealership/${currentDealership._id}`,
        description: 'Get dealership information',
        example: `${baseUrl}/api/dealership/${currentDealership._id}`
      },
      {
        method: 'GET',
        endpoint: `/api/search/${currentDealership._id}?q=honda`,
        description: 'Search vehicles',
        example: `${baseUrl}/api/search/${currentDealership._id}?q=honda&limit=10`
      }
    ];
  };

  const handleDeleteUserData = async () => {
    if (!user || confirmText !== "DELETE MY DATA") {
      toast.error("Please type 'DELETE MY DATA' to confirm");
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete from Convex
      await deleteUserData();
      
      // Delete from Clerk
      await user.delete();
      
      toast.success("All your data has been deleted successfully");
      
      // Redirect to sign-in
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Error deleting user data:", error);
      toast.error("Failed to delete data: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Tools</h1>
        <p className="text-muted-foreground mt-1">
          Development utilities and API information for testing
        </p>
      </div>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <CardTitle>REST API Endpoints</CardTitle>
          </div>
          <CardDescription>
            External API endpoints for your dealer website integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentDealership ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Dealership ID: {currentDealership._id}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => copyToClipboard(currentDealership._id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              
              {getApiEndpoints().map((endpoint, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{endpoint.method}</Badge>
                    <code className="text-sm bg-zinc-900 px-2 py-1 rounded">
                      {endpoint.endpoint}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {endpoint.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-zinc-900 px-2 py-1 rounded flex-1">
                      {endpoint.example}
                    </code>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(endpoint.example)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => window.open(endpoint.example, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No dealership found. Complete onboarding to see API endpoints.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* S3 Bucket Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>S3 Bucket Management</CardTitle>
          </div>
          <CardDescription>
            Manage S3 buckets for all dealerships
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={() => handleBulkBucketCheck(true)}
              variant="outline"
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              Check All Buckets (Dry Run)
            </Button>
            <Button 
              onClick={() => handleBulkBucketCheck(false)}
              variant="default"
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              Create Missing Buckets
            </Button>
          </div>
          
          {bucketCheckResult && (
            <div className="mt-4 p-4 bg-zinc-900 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Last Bucket Check Results:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-blue-600">{bucketCheckResult.totalDealerships}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="font-medium text-green-600">{bucketCheckResult.dealershipsWithBuckets}</div>
                  <div className="text-muted-foreground">With Buckets</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-600">{bucketCheckResult.dealershipsWithoutBuckets}</div>
                  <div className="text-muted-foreground">Missing Buckets</div>
                </div>
                <div>
                  <div className="font-medium text-purple-600">{bucketCheckResult.created.length}</div>
                  <div className="text-muted-foreground">Created</div>
                </div>
              </div>
              
              {bucketCheckResult.created.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-green-700 mb-1">Created Buckets:</div>
                  <div className="text-xs text-green-600">
                    {bucketCheckResult.created.join(', ')}
                  </div>
                </div>
              )}
              
              {bucketCheckResult.failed.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-red-700 mb-1">Failed:</div>
                  <div className="text-xs text-red-600">
                    {bucketCheckResult.failed.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Current Data Overview</CardTitle>
          </div>
          <CardDescription>
            Summary of your current data in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{user ? 1 : 0}</div>
              <div className="text-sm text-muted-foreground">User Account</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{currentDealership ? 1 : 0}</div>
              <div className="text-sm text-muted-foreground">Dealership</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">Active</div>
              <div className="text-sm text-muted-foreground">S3 Storage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions for development and testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDangerZone ? (
            <Button 
              variant="outline" 
              onClick={() => setShowDangerZone(true)}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Show Danger Zone
            </Button>
          ) : (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>⚠️ WARNING:</strong> This will permanently delete ALL your data including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Your user account (both Convex and Clerk)</li>
                    <li>Your dealership and all associated data</li>
                    <li>All vehicles, clients, deals, and documents</li>
                    <li>Your subscription and billing information</li>
                    <li>S3 bucket and all uploaded files</li>
                  </ul>
                  <p className="mt-2 font-medium">This action cannot be undone!</p>
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="confirm-delete">
                    Type <code className="bg-red-100 px-1 rounded">DELETE MY DATA</code> to confirm:
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE MY DATA"
                    className="mt-2 border-red-200 focus:border-red-500"
                  />
                </div>

                <Button
                  onClick={handleDeleteUserData}
                  disabled={isDeleting || confirmText !== "DELETE MY DATA"}
                  variant="destructive"
                  className="w-full"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting All Data...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All My Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}