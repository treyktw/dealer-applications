'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";

interface ClientExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClientIds?: Id<"clients">[];
  filters?: {
    search?: string;
    status?: string;
  };
}

export function ClientExportDialog({
  open,
  onOpenChange,
  selectedClientIds = [],
  filters = {},
}: ClientExportDialogProps) {
  // State for export options
  const [exportOption, setExportOption] = useState<'all' | 'selected' | 'filtered'>(
    selectedClientIds.length > 0 ? 'selected' : 'filtered'
  );
  
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  // Field selection state
  const [includeFields, setIncludeFields] = useState({
    basic: true,      // First Name, Last Name
    contact: true,    // Email, Phone
    address: true,    // Address, City, State, Zip
    source: true,     // Source
    status: true,     // Status
  });

  // Get current user and dealership ID
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;
  
  // Convex query for exporting clients
  const exportClients = useQuery(api.clients.exportClients, {
    dealershipId: dealershipId || "",
    search: filters?.search,
    status: filters?.status,
    selectedIds: exportOption === 'selected' ? selectedClientIds : undefined,
  });
  
  // Reset dialog state when closed
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };
  
  // Handle export action
  const handleExport = async () => {
    if (!dealershipId || !exportClients) return;
    
    setIsExporting(true);
    
    try {
      // Convert client data to CSV
      const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip', 'Source', 'Status'];
      const csvContent = [
        headers.join(','),
        ...exportClients.map(client => [
          client.firstName,
          client.lastName,
          client.email || '',
          client.phone || '',
          client.address || '',
          client.city || '',
          client.state || '',
          client.zipCode || '',
          client.source || '',
          client.status
        ].join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `clients_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting clients:', error);
      alert('Failed to export clients. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Clients</DialogTitle>
          <DialogDescription>
            Choose export options and download your client data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* What to export */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">What to Export</h3>
            
            <RadioGroup 
              value={exportOption}
              onValueChange={(value) => setExportOption(value as 'all' | 'selected' | 'filtered')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All Clients</Label>
              </div>
              
              {selectedClientIds.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected">Selected Clients ({selectedClientIds.length})</Label>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered">Current Filtered View</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Fields to include */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Fields to Include</h3>
            
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="field-basic"
                  checked={includeFields.basic}
                  onCheckedChange={(checked) => setIncludeFields({ ...includeFields, basic: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="field-basic">Basic Info</Label>
                  <p className="text-xs text-muted-foreground">First Name, Last Name</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="field-contact"
                  checked={includeFields.contact}
                  onCheckedChange={(checked) => setIncludeFields({ ...includeFields, contact: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="field-contact">Contact Details</Label>
                  <p className="text-xs text-muted-foreground">Email, Phone</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="field-address"
                  checked={includeFields.address}
                  onCheckedChange={(checked) => setIncludeFields({ ...includeFields, address: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="field-address">Address</Label>
                  <p className="text-xs text-muted-foreground">Street, City, State, Zip</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="field-source"
                  checked={includeFields.source}
                  onCheckedChange={(checked) => setIncludeFields({ ...includeFields, source: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="field-source">Source</Label>
                  <p className="text-xs text-muted-foreground">How the client found you</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="field-status"
                  checked={includeFields.status}
                  onCheckedChange={(checked) => setIncludeFields({ ...includeFields, status: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="field-status">Status</Label>
                  <p className="text-xs text-muted-foreground">Lead, Customer, Previous</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Export format */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Export Format</h3>
            
            <RadioGroup 
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as 'csv' | 'excel')}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" disabled />
                <Label htmlFor="excel" className="text-muted-foreground">Excel (Coming Soon)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !Object.values(includeFields).some(Boolean)}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
