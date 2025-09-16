// app/(dashboard)/deals/[id]/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import { DealDetailPage } from "@/components/dashboard/client/DealDetailPageComponent";
import { DealDetailSkeleton } from "../_components/DealDetailsSkeleton";


export const metadata: Metadata = {
  title: "Deal Details | Dealership CMS",
  description: "View deal details and documents",
};

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealDetailPage dealId={(await params).id} />
    </Suspense>
  );
}