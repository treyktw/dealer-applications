// src/routes/deals/new/index.tsx

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { convexMutation } from '@/lib/convex';
import { api } from '@dealer/convex';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { ArrowRight, Car, User } from 'lucide-react';

export const Route = createFileRoute('/deals/new/')({
  component: NewDealPage,
});

function NewDealPage() {
  const navigate = useNavigate();
  const [dealType, setDealType] = useState('cash_sale');
  
  const createDeal = useMutation({
    mutationFn: async (data: any) => {
      // Create the deal
      const dealsId = await convexMutation(api.api.deals.createDeal, data);
      
      // Create document pack immediately
      await convexMutation(api.api.documentPacks.createDocumentPack, {
        dealId: dealsId,
        packType: dealType,
        jurisdiction: 'GA', // Should come from dealership settings
      });
      
      return dealsId;
    },
    onSuccess: (dealsId) => {
      toast.success('Deal created successfully');
      navigate({ 
        to: '/deals/$dealsId/documents', 
        params: { dealsId } 
      });
    },
    onError: (error) => {
      toast.error(`Failed to create deal: ${error.message}`);
    },
  });

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Deal</h1>
        
        <div className="space-y-6">
          {/* Deal Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={dealType === 'cash_sale' ? 'default' : 'outline'}
                  onClick={() => setDealType('cash_sale')}
                >
                  Cash Sale
                </Button>
                <Button
                  variant={dealType === 'finance' ? 'default' : 'outline'}
                  onClick={() => setDealType('finance')}
                >
                  Finance
                </Button>
                <Button
                  variant={dealType === 'lease' ? 'default' : 'outline'}
                  onClick={() => setDealType('lease')}
                >
                  Lease
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Create Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createDeal.mutate({
                  type: dealType,
                  clientFirstName: formData.get('firstName'),
                  clientLastName: formData.get('lastName'),
                  clientEmail: formData.get('email'),
                  clientPhone: formData.get('phone'),
                  vin: formData.get('vin'),
                  stockNumber: formData.get('stockNumber'),
                });
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle Information (Optional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vin">VIN</Label>
                      <Input id="vin" name="vin" />
                    </div>
                    <div>
                      <Label htmlFor="stockNumber">Stock Number</Label>
                      <Input id="stockNumber" name="stockNumber" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate({ to: '/deals' })}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDeal.isPending}>
                    Create Deal & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}