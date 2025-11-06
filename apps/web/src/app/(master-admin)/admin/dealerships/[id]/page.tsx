// apps/web/src/app/(master-admin)/admin/dealerships/[id]/page.tsx
"use client";

import { use } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import DealershipDetailClient from "./DealershipDetailClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DealershipDetailPage({ params }: PageProps) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const dealershipId = unwrappedParams.id as Id<"dealerships">;

  return <DealershipDetailClient dealershipId={dealershipId} />;
}
