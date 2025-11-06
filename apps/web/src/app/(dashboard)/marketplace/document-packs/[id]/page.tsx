// apps/web/src/app/(dashboard)/marketplace/document-packs/[id]/page.tsx
"use client";

import { use } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import DocumentPackDetailClient from "./DocumentPackDetailClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DocumentPackDetailPage({ params }: PageProps) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const packId = unwrappedParams.id as Id<"document_pack_templates">;

  return <DocumentPackDetailClient packId={packId} />;
}
