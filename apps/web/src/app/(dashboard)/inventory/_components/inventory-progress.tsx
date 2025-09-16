import { Card, CardContent } from "@/components/ui/card";

interface ImportProgressProps {
  progress: number;
}

export function ImportProgress({ progress }: ImportProgressProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Importing vehicles...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}