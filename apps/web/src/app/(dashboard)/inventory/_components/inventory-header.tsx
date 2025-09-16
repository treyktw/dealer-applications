// components/inventory/_components/inventory-header.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, UploadCloud, Download, ChevronDown, FileSpreadsheet } from "lucide-react";
import { VehicleImportDialog } from "./vehicle-import-dialog";

interface InventoryHeaderProps {
  onExportCSV: () => void;
  onImportComplete?: (count: number) => void;
}

export function InventoryHeader({ onExportCSV, onImportComplete }: InventoryHeaderProps) {
  const router = useRouter();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleImportComplete = (count: number) => {
    if (onImportComplete) {
      onImportComplete(count);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your vehicle inventory</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => router.push("/inventory/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import / Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Data Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Import Vehicles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export Vehicles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Vehicle Import Dialog */}
      <VehicleImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}