// components/inventory/_components/vehicle-import-dialog.tsx

'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface VehicleImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (count: number) => void;
}

export function VehicleImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: VehicleImportDialogProps) {
  // State for file selection and upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for preview data
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');

  // Get current user and dealership ID
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;
  
  // Convex action for importing vehicles
  const importVehicles = useAction(api.inventory.importVehicles);
  
  // Reset the dialog state when closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedFile(null);
      setIsUploading(false);
      setUploadProgress(0);
      setImportErrors([]);
      setImportStep('upload');
    }
    onOpenChange(open);
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Download template
  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const headers = [
      "Stock Number",
      "VIN",
      "Make",
      "Model",
      "Year",
      "Trim",
      "Mileage",
      "Price",
      "Exterior Color",
      "Interior Color",
      "Fuel Type",
      "Transmission",
      "Engine",
      "Description",
      "Status",
      "Featured",
      "Features"
    ];
    
    // Add sample row for reference
    const sampleRow = [
      "ABC123",
      "1HGBH41JXMN109186",
      "Honda",
      "Civic",
      "2022",
      "EX",
      "25000",
      "22500",
      "Silver",
      "Black",
      "Gasoline",
      "CVT",
      "2.0L 4-Cylinder",
      "Well-maintained Honda Civic in excellent condition",
      "AVAILABLE",
      "false",
      "Backup Camera\nBluetooth\nApple CarPlay"
    ];
    
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehicle_import_template.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle file upload and process
  const handleUpload = async () => {
    if (!selectedFile || !dealershipId) {
      return;
    }
    
    // Check file type
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(fileExt || '')) {
      alert('Please upload a CSV or Excel file');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress updates during file reading
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 100);
      
      // Read file as text
      const text = await selectedFile.text();
      
      // Clear progress interval
      clearInterval(progressInterval);
      setUploadProgress(90);
      
      console.log("🚀 Starting vehicle import");
      
      // Import vehicles
      const result = await importVehicles({
        fileContent: text,
        fileName: selectedFile.name,
        dealershipId,
      });
      
      setUploadProgress(100);
      
      console.log("📊 Import result:", result);
      
      if (result.success && result.importedCount > 0) {
        onImportComplete(result.importedCount);
        handleOpenChange(false);
      } else if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
        setImportStep('preview');
      } else {
        setImportErrors(["No vehicles were imported. Please check your file format."]);
        setImportStep('preview');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setImportErrors([error instanceof Error ? error.message : 'Failed to upload file']);
      setImportStep('preview');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Cancel import and reset
  const handleCancel = () => {
    setSelectedFile(null);
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Vehicles</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import vehicles into your inventory
          </DialogDescription>
        </DialogHeader>
        
        {importStep === 'upload' ? (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <input
                type="file"
                id="vehicle-file-upload"
                className="hidden"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
              <Label
                htmlFor="vehicle-file-upload"
                className="flex flex-col items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : 'Click to select file or drag and drop'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Supported formats: CSV, XLS, XLSX
                </span>
              </Label>
              {selectedFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Remove file
                </Button>
              )}
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Template Format</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('csv')}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    CSV Template
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your file should include columns like: 
                Stock Number, VIN, Make, Model, Year, Mileage, Price, Status, etc.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Required fields:</strong> Stock Number, VIN, Make, Model, Year, Price
              </p>
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {uploadProgress === 100 ? "Processing..." : "Uploading..."}
                  </span>
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Import Vehicles
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  There were errors during import. Please fix the issues and try again.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="max-h-[400px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importErrors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{index + 1}</TableCell>
                      <TableCell>{error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Back
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}