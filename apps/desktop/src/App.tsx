// src/App.tsx
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { routeTree } from "./routeTree.gen";
import { useEffect } from "react";
import { setConvexAuth } from "./lib/convex";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ThemeProvider } from "./theme/ThemeProvider";
// Removed custom session manager - using Clerk's built-in session management
import "./App.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const router = createRouter({
  routeTree,
  context: {
    auth: undefined as unknown as { isLoaded: boolean; isSignedIn: boolean; userId: string | null | undefined },
  },
});

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
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

  return (
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
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-900">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Configuration Error</h1>
          <p>Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file</p>
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
    </ClerkProvider>
  );
}

export default App;