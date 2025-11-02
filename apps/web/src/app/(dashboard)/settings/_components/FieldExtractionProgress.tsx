import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wand2 } from "lucide-react";

interface FieldExtractionProgressProps {
  templateName: string;
}

export function FieldExtractionProgress({
  templateName,
}: FieldExtractionProgressProps) {
  return (
    <Card>
      <CardContent className="pt-12 pb-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="relative p-4 bg-purple-100 rounded-full">
            <Wand2 className="w-12 h-12 text-purple-600" />
            <Loader2 className="absolute -right-1 -bottom-1 w-6 h-6 text-purple-600 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Extracting PDF Form Fields</h2>
          <p className="text-sm text-muted-foreground">{templateName}</p>
        </div>

        <div className="mx-auto space-y-3 max-w-md">
          <div className="space-y-2 text-sm text-left">
            <div className="flex gap-2 items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
              <span className="text-muted-foreground">Analyzing PDF structure...</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
              <span className="text-muted-foreground">Detecting form fields...</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-yellow-600 animate-pulse" />
              <span className="text-muted-foreground">
                Auto-mapping fields to data schema...
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          This usually takes 5-10 seconds...
        </p>
      </CardContent>
    </Card>
  );
}