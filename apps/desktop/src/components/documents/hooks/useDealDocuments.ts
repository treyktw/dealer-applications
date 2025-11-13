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
  const { token } = useAuth();

  // Fetch deal data with deep link token (one-time exchange) OR session token
  const dealQuery = useQuery({
    queryKey: ["deal", dealsId, deepLinkToken, token],
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
      } else if (token) {
        // Use session token for regular access
        return convexQuery(api.api.deals.getDeal, {
          dealId: dealsId as Id<"deals">,
          token: token,
        });
      } else {
        throw new Error("No authentication token provided");
      }
    },
    enabled: !!deepLinkToken || !!token,
    retry: (failureCount, error: any) => {
      const message = String(error?.message || "");
      // Retry a couple of times on transient network/auth lapses
      if (failureCount < 2 && (message.includes("Invalid or expired session") || message.includes("Network"))) {
        return true;
      }
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * attempt, 5000),
  });

  // Fetch deal details with SESSION token
  const dealDetailsQuery = useQuery({
    queryKey: ["dealDetails", dealsId, token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No session token");
      }
      
      return convexQuery(api.api.deals.getDeal, {
        dealId: dealsId as Id<"deals">,
        token: token,
      });
    },
    enabled: !!dealQuery.data && !!token,
    retry: (failureCount, error: any) => {
      const message = String(error?.message || "");
      if (failureCount < 2 && (message.includes("Invalid or expired session") || message.includes("Network"))) {
        return true;
      }
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * attempt, 5000),
  });

  // Fetch generated documents
  const documentsQuery = useQuery({
    queryKey: ["documents", dealsId, token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No session token");
      }
      
      return convexQuery(api.api.documents.generator.getDocumentsByDeal, {
        dealId: dealsId as Id<"deals">,
        token: token,
      });
    },
    enabled: !!dealQuery.data && !!token,
    retry: (failureCount, error: any) => {
      const message = String(error?.message || "");
      if (failureCount < 2 && (message.includes("Invalid or expired session") || message.includes("Network"))) {
        return true;
      }
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * attempt, 5000),
  });

  // Fetch custom uploaded documents
  const customDocumentsQuery = useQuery({
    queryKey: ["custom-documents", dealsId, token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No session token");
      }
      try {
        return await convexQuery(api.api.documents.getCustomDocumentsForDeal, {
          dealId: dealsId as Id<"deals">,
          token: token,
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
    enabled: !!dealQuery.data && !!token,
    retry: (failureCount, error: any) => {
      const message = String(error?.message || "");
      if (message.includes("Premium subscription")) return false;
      if (failureCount < 2 && (message.includes("Invalid or expired session") || message.includes("Network"))) {
        return true;
      }
      return false;
    },
    retryDelay: (attempt) => Math.min(2000 * attempt, 5000),
  });

  return {
    deal: dealQuery.data,
    dealDetails: dealDetailsQuery.data,
    documents: documentsQuery.data,
    customDocuments: customDocumentsQuery.data,
    isLoading: dealQuery.isLoading || dealDetailsQuery.isLoading || documentsQuery.isLoading,
    error:
      dealQuery.error || dealDetailsQuery.error || documentsQuery.error || customDocumentsQuery.error,
    sessionToken: token || undefined,
    refetchDocuments: documentsQuery.refetch,
    refetchAll: async () => {
      await Promise.all([
        dealQuery.refetch(),
        dealDetailsQuery.refetch(),
        documentsQuery.refetch(),
        customDocumentsQuery.refetch(),
      ]);
    },
  };
}