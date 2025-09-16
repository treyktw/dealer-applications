// src/components/documents/DealershipInfoForm.tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { convexMutation } from '@/lib/convex';
import { api, Id } from '@dealer/convex';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User,
  Save,
  Briefcase,
  BadgeCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DealershipInfoFormProps {
  packId: string;
  dealershipInfo: any;
  onUpdate: () => void;
}

export function DealershipInfoForm({ packId, dealershipInfo, onUpdate }: DealershipInfoFormProps) {
  const [formData, setFormData] = useState({
    salespersonName: dealershipInfo?.salespersonName || '',
    salespersonId: dealershipInfo?.salespersonId || '',
    financeManagerName: dealershipInfo?.financeManagerName || '',
    financeManagerId: dealershipInfo?.financeManagerId || '',
    notaryName: dealershipInfo?.notaryName || '',
    notaryId: dealershipInfo?.notaryId || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveDealershipInfo = useMutation({
    mutationFn: async () => {
      // Validate required fields
      const validationErrors: Record<string, string> = {};
      
      if (!formData.salespersonName) {
        validationErrors.salespersonName = 'Salesperson name is required';
      }
      if (!formData.salespersonId) {
        validationErrors.salespersonId = 'Salesperson ID is required';
      }
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        throw new Error('Validation failed');
      }
      
      await convexMutation(api.api.documentPacks.updateDealershipInfo, {
        packId: packId as Id<"document_packs">,
        dealershipInfo: formData,
      });
    },
    onSuccess: () => {
      toast.success('Dealership information saved');
      setErrors({});
      onUpdate();
    },
    onError: (error) => {
      if (error.message !== 'Validation failed') {
        toast.error(`Failed to save: ${error.message}`);
      }
    },
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <div className="space-y-6">
      {/* Salesperson Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Salesperson Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="salespersonName">Salesperson Name *</Label>
            <Input
              id="salespersonName"
              placeholder="John Smith"
              value={formData.salespersonName}
              onChange={(e) => updateField('salespersonName', e.target.value)}
              className={errors.salespersonName ? 'border-destructive' : ''}
            />
            {errors.salespersonName && (
              <p className="text-sm text-destructive mt-1">{errors.salespersonName}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="salespersonId">Salesperson ID/License *</Label>
            <Input
              id="salespersonId"
              placeholder="SP-12345"
              value={formData.salespersonId}
              onChange={(e) => updateField('salespersonId', e.target.value)}
              className={errors.salespersonId ? 'border-destructive' : ''}
            />
            {errors.salespersonId && (
              <p className="text-sm text-destructive mt-1">{errors.salespersonId}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Finance Manager Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Finance Manager Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="financeManagerName">Finance Manager Name</Label>
            <Input
              id="financeManagerName"
              placeholder="Jane Doe (Optional)"
              value={formData.financeManagerName}
              onChange={(e) => updateField('financeManagerName', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="financeManagerId">Finance Manager ID</Label>
            <Input
              id="financeManagerId"
              placeholder="FM-67890 (Optional)"
              value={formData.financeManagerId}
              onChange={(e) => updateField('financeManagerId', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notary Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5" />
            Notary Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="notaryName">Notary Name</Label>
            <Input
              id="notaryName"
              placeholder="Robert Johnson (Optional)"
              value={formData.notaryName}
              onChange={(e) => updateField('notaryName', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="notaryId">Notary Commission Number</Label>
            <Input
              id="notaryId"
              placeholder="NOT-11111 (Optional)"
              value={formData.notaryId}
              onChange={(e) => updateField('notaryId', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveDealershipInfo.mutate()}
          disabled={saveDealershipInfo.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Dealership Information
        </Button>
      </div>
    </div>
  );
}