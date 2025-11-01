"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Upload, List } from "lucide-react";
import Link from "next/link";

interface SetupProgress {
  hasRequired: boolean;
  uploadedCount: number;
  totalRecommended: number;
  progress: number;
  missingRequired: string[];
  missingRecommended: string[];
}

interface DocumentProgressCardProps {
  progress: SetupProgress;
}

export function DocumentProgressCard({ progress }: DocumentProgressCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex gap-2 items-center">
            <div className="p-2 rounded-lg bg-primary/10">
              <List className="w-5 h-5 text-primary" />
            </div>
            Document Setup Progress
          </CardTitle>
          <div className="text-2xl font-bold text-primary">
            {progress.progress}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {progress.uploadedCount} of {progress.totalRecommended} templates uploaded
            </span>
            <span className="text-muted-foreground">
              {progress.totalRecommended - progress.uploadedCount} remaining
            </span>
          </div>
          <Progress value={progress.progress} className="h-3" />
        </div>

        {/* Status Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Required Status */}
          <div className="p-4 space-y-3 rounded-lg border bg-card">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Required</span>
              {progress.hasRequired ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Complete
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Missing
                </Badge>
              )}
            </div>
            {progress.hasRequired ? (
              <p className="text-xs text-muted-foreground">
                Bill of Sale template uploaded ✓
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-destructive">
                  Bill of Sale required to create deals
                </p>
                <Button asChild size="sm" variant="destructive" className="gap-2 w-full">
                  <Link href="/settings/document-templates/upload?category=bill_of_sale">
                    <Upload className="w-3 h-3" />
                    Upload Bill of Sale
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Recommended Status */}
          <div className="p-4 space-y-3 rounded-lg border bg-card">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Recommended</span>
              <Badge variant="secondary">
                {progress.totalRecommended - progress.missingRecommended.length - 1}/
                {progress.totalRecommended - 1}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {progress.missingRecommended.length} recommended templates missing
            </p>
            {progress.missingRecommended.length > 0 && (
              <Button asChild size="sm" variant="outline" className="gap-2 w-full">
                <Link href="/settings/document-templates/upload">
                  <Upload className="w-3 h-3" />
                  Upload More
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Missing Templates List (if any) */}
        {progress.missingRecommended.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Missing Recommended Templates:</p>
            <div className="flex flex-wrap gap-2">
              {progress.missingRecommended.slice(0, 5).map((category) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              ))}
              {progress.missingRecommended.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{progress.missingRecommended.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}