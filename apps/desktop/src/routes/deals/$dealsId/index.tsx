// src/routes/deals/$dealId.tsx (rename from $dealsId if needed)
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/deals/$dealsId/')({
  component: () => {
    // This route redirects to documents
    const { dealsId } = Route.useParams();
    const navigate = useNavigate();
    
    useEffect(() => {
      navigate({ 
        to: '/deals/$dealsId/documents', 
        params: { dealsId },
        search: { token: undefined },
        replace: true 
      });
    }, [dealsId, navigate]);
    
    return null;
  },
});