// src/App.tsx - DESKTOP DOCUMENT SIGNING APP
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { routeTree } from "./routeTree.gen";
import { useEffect } from "react";
import { setConvexAuth } from "./lib/convex";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { SubscriptionProvider } from "./lib/subscription/SubscriptionProvider";
import { setupDeepLinkListener } from './lib/deeplink-listener'



const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_dGhvcm91Z2gtZWFnbGUtMTcuY2xlcmsuYWNjb3VudHMuZGV2JA';

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

const router = createRouter({
  routeTree,
  context: {
    auth: undefined as unknown as {
      isLoaded: boolean;
      isSignedIn: boolean;
      userId: string | null | undefined;
    },
  },
});

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      retry: 1,
      staleTime: 5000,
    },
  },
});
convexQueryClient.connect(queryClient);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();

  // Set Convex auth token when user signs in
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        getToken({ template: "convex" }).then((token) => {
          setConvexAuth(token);
        });
      } else {
        setConvexAuth(null);
      }
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    let unlisten: (() => void) | undefined
    
    setupDeepLinkListener().then((unlistenFn) => {
      unlisten = unlistenFn
    })
    
    return () => {
      if (unlisten) unlisten()
    }
  }, [])

  // Simple AuthGuard - only checks auth and dealership
  // No subscription checks - that's handled in web app
  return (
    <AuthGuard>
      <SubscriptionProvider>
        <RouterProvider
          router={router}
          context={{
            auth: {
              isLoaded,
              isSignedIn: isSignedIn ?? false,
              userId,
            },
          }}
        />
      </SubscriptionProvider>
    </AuthGuard>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-900">
        <div className="text-white text-center p-6">
          <h1 className="text-2xl font-bold mb-2">⚙️ Configuration Error</h1>
          <p className="mb-4">VITE_CLERK_PUBLISHABLE_KEY is not set</p>
          <p className="text-sm opacity-80">
            Please check your .env file and restart the app
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <InnerApp />
        </QueryClientProvider>
      </ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "",
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      />
    </ClerkProvider>
  );
}

export default App;
