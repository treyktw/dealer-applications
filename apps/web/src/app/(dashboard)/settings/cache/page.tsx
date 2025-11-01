"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Trash2, AlertTriangle } from "lucide-react";

export default function CacheManagementPage() {
  // Get current dealership
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = dealership?._id;

  // State
  const [purgeType, setPurgeType] = useState<"all" | Id<"vehicles"> | null>(null);

  // Mutation
  const manualPurgeCache = useMutation(api.internal.manualPurgeCache);

  // Handlers
  const handlePurgeCache = useCallback(
    async (vehicleId?: Id<"vehicles">) => {
      if (!dealershipId) return;

      try {
        await manualPurgeCache({
          dealershipId,
          vehicleId,
        });

        toast.success("Cache Purged", {
          description: vehicleId
            ? "Vehicle cache cleared successfully"
            : "All inventory cache cleared successfully"
        });

        setPurgeType(null);
      } catch (error: unknown) {
        toast.error("Failed to purge cache", {
          description: error instanceof Error ? error.message : "Failed to purge cache"
        });
      }
    },
    [dealershipId, manualPurgeCache]
  );

  if (!dealership) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cache Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manually clear cached inventory data for your public API
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CDN Cache Control</CardTitle>
          <CardDescription>
            Force refresh cached data on Vercel&apos;s edge network
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cache Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Status</h3>
            <div className="flex gap-2 items-center">
              <Badge>Active</Badge>
              <span className="text-sm text-muted-foreground">
                Cache TTL: 5 minutes (browser), 10 minutes (CDN)
              </span>
            </div>
          </div>

          {/* Purge Options */}
          <div className="space-y-4">
            <div className="p-4 space-y-3 rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">Purge All Inventory</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Clear all cached vehicle data for your dealership. Use this after
                    bulk updates.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setPurgeType("all")}
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Purge All
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-3 rounded-lg border opacity-60">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">Purge Single Vehicle</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Clear cache for a specific vehicle. Available from vehicle edit
                    page.
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Per-Vehicle
                </Button>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Automatic Cache Invalidation
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cache is automatically purged when you update or delete vehicles.
                  Manual purging is only needed in special cases.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!purgeType} onOpenChange={() => setPurgeType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex gap-2 items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Purge Cache?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {purgeType === "all" ? (
                <>
                  This will clear <strong>all cached inventory data</strong> for your
                  dealership. Visitor requests will be slower until the cache is
                  rebuilt.
                </>
              ) : (
                <>
                  This will clear the cached data for this vehicle. It will be
                  re-cached on the next request.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handlePurgeCache(
                  purgeType === "all" ? undefined : (purgeType as Id<"vehicles">)
                )
              }
            >
              Purge Cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}