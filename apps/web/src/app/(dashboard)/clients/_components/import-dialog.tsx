'use client';

import { useState, useRef, useId } from 'react';
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

interface ClientImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (count: number) => void;
}

export function ClientImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ClientImportDialogProps) {
  // State for file selection and upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for preview data
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  
  // Generate unique IDs
  const fileUploadId = useId();

  // Get current user and dealership ID
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;
  
  // Convex action for importing clients
  const importClients = useAction(api.clients.importClients);
  
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
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Zip",
      "Source",
      "Status"
    ];
    
    const csvContent = headers.join(",");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_import_template.${format}`;
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
      
      // Import clients
      const result = await importClients({
        fileContent: text,
        fileName: selectedFile.name,
        dealershipId,
      });
      
      setUploadProgress(100);
      
      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to import clients');
      }
      const importedCount = result.importedCount ?? 0;
      if (importedCount > 0) {
        onImportComplete(importedCount);
        handleOpenChange(false);
      } else {
        setImportErrors(result.errors as string[]);
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
          <DialogTitle>Import Clients</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import clients
          </DialogDescription>
        </DialogHeader>
        
        {importStep === 'upload' ? (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <input
                type="file"
                id={fileUploadId}
                className="hidden"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
              <Label
                htmlFor={fileUploadId}
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
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('xlsx')}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Excel
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your file should include these columns (flexible naming supported):
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                <li><strong>First Name</strong> - accepts: First Name, first_name, firstname, first, fname</li>
                <li><strong>Last Name</strong> - accepts: Last Name, last_name, lastname, last, lname, surname</li>
                <li><strong>Email</strong> - accepts: Email, email, e-mail, emailaddress</li>
                <li><strong>Phone</strong> - accepts: Phone, phone, telephone, tel, mobile, cell</li>
                <li><strong>Address</strong> - accepts: Address, address, street, street_address</li>
                <li><strong>City</strong> - accepts: City, city, town</li>
                <li><strong>State</strong> - accepts: State, state, province, region</li>
                <li><strong>Zip Code</strong> - accepts: Zip, zip, zipcode, zip_code, postal, postalcode</li>
                <li><strong>Source</strong> - accepts: Source, source, leadsource</li>
                <li><strong>Status</strong> - accepts: Status, status, clientstatus</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Note:</strong> Column names are case-insensitive and can use spaces, underscores, or hyphens. Only First Name and Last Name are required.
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
                    Import
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
                    <TableRow key={`error-${index}-${error.substring(0, 20)}`}>
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