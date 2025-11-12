// app/providers/ConvexProvider.tsx
import { ConvexReactClient, ConvexProvider } from "convex/react";
import type React from "react";

if (!process.env.EXPO_PUBLIC_CONVEX_URL) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL);

export const ConvexContextProvider = ({ children }: { children: React.ReactNode }) => {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};
