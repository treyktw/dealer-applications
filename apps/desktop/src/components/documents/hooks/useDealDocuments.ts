// src/components/deals/documents/hooks/useDealDocuments.ts

import { useQuery } from "@tanstack/react-query";
import { convexQuery, convexAction } from "@/lib/convex";
import { api } from "@dealer/convex";
import type { Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";

interface UseDealDocumentsProps {
  dealsId: string;
  deepLinkToken?: string;
}

export function useDealDocuments({ dealsId, deepLinkToken }: UseDealDocumentsProps) {
  const { session } = useAuth();

  // Fetch deal data with deep link token (one-time exchange) OR session token
  const dealQuery = useQuery({
    queryKey: ["deal", dealsId, deepLinkToken, session?.token],
    queryFn: async () => {
      if (deepLinkToken) {
        // Use deep link token for initial access
        const result = await convexAction(api.api.deeplink.exchangeDeepLinkToken, {
          dealId: dealsId,
          token: deepLinkToken,
        });
        
        if (!result.success) {
          throw new Error(result.error || "Failed to load deal");
        }
        
        return result.deal;
      } else if (session?.token) {
        // Use session token for regular access
        return convexQuery(api.api.deals.getDeal, {
          dealId: dealsId as Id<"deals">,
          token: session.token,
        });
      } else {
        throw new Error("No authentication token provided");
      }
    },
    enabled: !!deepLinkToken || !!session?.token,
  });

  // Fetch deal details with SESSION token
  const dealDetailsQuery = useQuery({
    queryKey: ["dealDetails", dealsId, session?.token],
    queryFn: async () => {
      if (!session?.token) {
        throw new Error("No session token");
      }
      
      return convexQuery(api.api.deals.getDeal, {
        dealId: dealsId as Id<"deals">,
        token: session.token,
      });
    },
    enabled: !!dealQuery.data && !!session?.token,
  });

  // Fetch generated documents
  const documentsQuery = useQuery({
    queryKey: ["documents", dealsId, session?.token],
    queryFn: async () => {
      if (!session?.token) {
        throw new Error("No session token");
      }
      
      return convexQuery(api.api.documents.generator.getDocumentsByDeal, {
        dealId: dealsId as Id<"deals">,
        token: session.token,
      });
    },
    enabled: !!dealQuery.data && !!session?.token,
  });

  // Fetch custom uploaded documents
  const customDocumentsQuery = useQuery({
    queryKey: ["custom-documents", dealsId, session?.token],
    queryFn: async () => {
      if (!session?.token) {
        throw new Error("No session token");
      }
      try {
        return await convexQuery(api.api.documents.getCustomDocumentsForDeal, {
          dealId: dealsId as Id<"deals">,
          token: session.token,
        });
      } catch (error) {
        // Gracefully handle subscription errors - return empty array if subscription required
        if (error instanceof Error && error.message.includes("Premium subscription")) {
          console.log("Custom documents not available:", error.message);
          return []; // Return empty array instead of throwing
        }
        // Re-throw other errors
        throw error;
      }
    },
    enabled: !!dealQuery.data && !!session?.token,
    retry: false, // Don't retry subscription errors
  });

  return {
    deal: dealQuery.data,
    dealDetails: dealDetailsQuery.data,
    documents: documentsQuery.data,
    customDocuments: customDocumentsQuery.data,
    isLoading: dealQuery.isLoading,
    error: dealQuery.error,
    sessionToken: session?.token,
    refetchDocuments: documentsQuery.refetch,
  };
}