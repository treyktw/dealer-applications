// app/(dashboard)/deals/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { DealsTable } from "./_components/DealsTable";
import { DealsSkeleton } from "./_components/DealsSkeleton";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export const metadata: Metadata = {
  title: "Deals | Dealership CMS",
  description: "Manage your vehicle sales and deals",
};

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <FeatureGate requiredPlan="premium">
        <Suspense fallback={<DealsSkeleton />}>
          <DealsTable />
        </Suspense>
      </FeatureGate>
    </div>
  );
}
