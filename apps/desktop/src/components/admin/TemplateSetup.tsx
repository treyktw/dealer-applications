// src/components/admin/TemplateSetup.tsx - A quick component to set up templates

import { useMutation } from '@tanstack/react-query';
import { convexMutation, convexQuery } from '@/lib/convex';
import { api } from '@dealer/convex';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
// import { useUser } from '@clerk/clerk-react';

export function TemplateSetup() {
  // const { user } = useUser();
  
  const setupTemplate = useMutation({
    mutationFn: async () => {
      // Get current user's dealership
      const currentUser = await convexQuery(api.api.users.getCurrentUser, {});
      if (!currentUser?.dealershipId) {
        throw new Error("No dealership associated");
      }
      
      return await convexMutation(api.api.pdfTemplates.registerGABillOfSaleTemplate, {
        dealershipId: currentUser.dealershipId,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('GA Bill of Sale template registered!');
      } else {
        toast.error(result.message || 'Template already exists');
      }
    },
    onError: (error) => {
      toast.error(`Failed to register template: ${error.message}`);
    },
  });

  return (
    <Button onClick={() => setupTemplate.mutate()}>
      Setup GA Bill of Sale Template
    </Button>
  );
}