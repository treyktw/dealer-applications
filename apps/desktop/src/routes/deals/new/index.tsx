// src/routes/deals/new/index.tsx

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexClient } from '@/lib/convex';
import { api, type Id } from '@dealer/convex';
import { Layout } from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowRight, Car, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

export const Route = createFileRoute('/deals/new/')({
  component: NewDealPage,
});

function NewDealPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dealType, setDealType] = useState<'cash' | 'finance' | 'lease'>('cash');
  
  const createDeal = useMutation({
    mutationFn: async (data: {
      clientFirstName: string;
      clientLastName: string;
      clientEmail?: string;
      clientPhone?: string;
      vin?: string;
      stockNumber?: string;
      saleAmount: number;
    }) => {
      if (!user?.dealershipId) {
        throw new Error("User not associated with a dealership");
      }

      // First, create client
      const newClient = await convexClient.mutation(api.api.clients.createClient, {
        dealershipId: user.dealershipId,
        firstName: data.clientFirstName,
        lastName: data.clientLastName,
        email: data.clientEmail,
        phone: data.clientPhone,
        clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      const clientId = newClient.clientId;

      // Create vehicle with required fields
      const vin = data.vin || `TEMP-${Date.now()}`;
      const stock = data.stockNumber || `STOCK-${Date.now()}`;
      const newVehicle = await convexClient.mutation(api.api.inventory.createVehicle, {
        dealershipId: user.dealershipId as Id<"dealerships">,
        vin,
        stock,
        make: 'Unknown',
        model: 'Unknown',
        year: new Date().getFullYear(),
        mileage: 0,
        price: data.saleAmount,
        status: 'available',
        featured: false,
      });
      const vehicleId = newVehicle.id;

      // Now create the deal
      const result = await convexClient.mutation(api.api.deals.createDeal, {
        clientId,
        vehicleId,
        dealershipId: user.dealershipId,
        type: dealType,
        saleAmount: data.saleAmount,
        salesTax: 0,
        docFee: 0,
        totalAmount: data.saleAmount,
        saleDate: Date.now(),
      });
      
      return result.dealId;
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success('Deal created successfully');
      navigate({ 
        to: '/deals/$dealsId/documents', 
        params: { dealsId: dealId as string },
        search: { token: undefined },
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create deal', {
        description: error.message,
      });
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
                  variant={dealType === 'cash' ? 'default' : 'outline'}
                  onClick={() => setDealType('cash')}
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
                const saleAmount = parseFloat(formData.get('saleAmount') as string) || 0;
                
                if (saleAmount <= 0) {
                  toast.error('Please enter a valid sale amount');
                  return;
                }

                createDeal.mutate({
                  clientFirstName: formData.get('firstName') as string,
                  clientLastName: formData.get('lastName') as string,
                  clientEmail: formData.get('email') as string || undefined,
                  clientPhone: formData.get('phone') as string || undefined,
                  vin: formData.get('vin') as string || undefined,
                  stockNumber: formData.get('stockNumber') as string || undefined,
                  saleAmount,
                });
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id={useId()} name="firstName" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id={useId()} name="lastName" required />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id={useId()} name="email" type="email" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id={useId()} name="phone" type="tel" />
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
                      <Input id={useId()} name="vin" />
                    </div>
                    <div>
                      <Label htmlFor="stockNumber">Stock Number</Label>
                      <Input id={useId()} name="stockNumber" />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Deal Information</h3>
                  <div>
                    <Label htmlFor="saleAmount">Sale Amount *</Label>
                    <Input 
                      id={useId()} 
                      name="saleAmount" 
                      type="number" 
                      step="0.01"
                      required 
                    />
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