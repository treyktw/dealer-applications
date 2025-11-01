// src/components/deals/documents/DocumentsHeader.tsx

import { Button } from "@/components/ui/button";
import { User, Car } from "lucide-react";

interface DocumentsHeaderProps {
  dealDetails?: {
    client?: {
      firstName?: string;
      lastName?: string;
    };
    vehicle?: {
      year?: number;
      make?: string;
      model?: string;
    };
  };
  dealsId: string;
  onViewInWebApp: () => void;
}

export function DocumentsHeader({ dealDetails, dealsId, onViewInWebApp }: DocumentsHeaderProps) {
  return (
    <div className="p-6 border-b">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Deal Documents</h1>
          <div className="flex gap-2 items-center text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>
              {dealDetails?.client?.firstName} {dealDetails?.client?.lastName}
            </span>
            <span className="mx-2">•</span>
            <Car className="w-4 h-4" />
            <span>
              {dealDetails?.vehicle?.year} {dealDetails?.vehicle?.make}{" "}
              {dealDetails?.vehicle?.model}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={onViewInWebApp}>
          View in Web App
        </Button>
      </div>
    </div>
  );
}