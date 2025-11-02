import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function SignatureNotFound() {
  return (
    <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex gap-3 items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <CardTitle className="text-orange-900">Session Not Found</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The signature request you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>Possible reasons:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-orange-700">
              <li>The link has expired</li>
              <li>The session was cancelled</li>
              <li>The link is invalid</li>
            </ul>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Please ask the dealer to generate a new signature request.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}