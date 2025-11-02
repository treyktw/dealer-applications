"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function SignatureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Signature page error:", error);
  }, [error]);

  return (
    <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader>
          <div className="flex gap-3 items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Something Went Wrong</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2 font-mono text-xs">
              {error.message}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            We encountered an error while loading the signature page. This could be
            due to a network issue or an expired session.
          </p>

          <Button onClick={reset} className="gap-2 w-full">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <div className="text-xs text-center text-muted-foreground">
            If this problem persists, please contact the dealership for assistance.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}