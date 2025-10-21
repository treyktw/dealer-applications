import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload } from "lucide-react";

interface UploadProgressProps {
  fileName: string;
  progress: number;
}

export function UploadProgress({ fileName, progress }: UploadProgressProps) {
  return (
    <Card>
      <CardContent className="pt-12 pb-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="relative p-4 rounded-full bg-primary/10">
            <Upload className="w-12 h-12 text-primary" />
            <Loader2 className="absolute -right-1 -bottom-1 w-6 h-6 animate-spin text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Uploading Template</h2>
          <p className="text-sm text-muted-foreground">{fileName}</p>
        </div>

        <div className="mx-auto space-y-2 max-w-md">
          <Progress value={progress} className="h-3" />
          <p className="text-sm font-medium text-primary">{progress}%</p>
        </div>

        <p className="text-xs text-muted-foreground">
          Please don&apos;t close this page while uploading...
        </p>
      </CardContent>
    </Card>
  );
}