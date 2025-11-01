import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SignatureLoading() {
  return (
    <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardContent className="pt-12 pb-8 space-y-4 text-center">
          <Loader2 className="mx-auto w-16 h-16 animate-spin text-primary" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Loading Signature Request</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we verify your session...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}