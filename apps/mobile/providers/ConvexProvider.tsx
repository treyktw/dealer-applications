// providers/ConvexProvider.tsx
import { ConvexReactClient, ConvexProvider } from "convex/react";
import type React from "react";
import Constants from "expo-constants";

const convexUrl =
  Constants.expoConfig?.extra?.convexUrl ||
  process.env.EXPO_PUBLIC_CONVEX_URL ||
  "";

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convex = new ConvexReactClient(convexUrl);

export const ConvexContextProvider = ({ children }: { children: React.ReactNode }) => {
  // Note: Auth is handled automatically by Convex through Clerk integration
  // The Clerk token is passed via the Authorization header in requests
  // Convex will automatically authenticate requests when Clerk is configured
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};

