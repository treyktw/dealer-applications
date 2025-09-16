"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { UserSync } from "@/components/user-sync";


const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <UserSync />
      {children}
    </ConvexProviderWithClerk>
  );
}