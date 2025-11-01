// app/(dashboard)/deals/[id]/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { DealDetailSkeleton } from "../_components/DealDetailsSkeleton";
import DealDetailPage  from "../_components/DealDetailPageComponent";


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
      <DealDetailPage params={params} />
    </Suspense>
  );
}