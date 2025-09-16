// app/(dashboard)/deals/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import { DealsTable } from "./_components/DealsTable";
import { DealsSkeleton } from "./_components/DealsSkeleton";

export const metadata: Metadata = {
  title: "Deals | Dealership CMS",
  description: "Manage your vehicle sales and deals",
};

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
        <p className="text-muted-foreground">
          Manage your vehicle sales and document process
        </p>
      </div>
      
      <Suspense fallback={<DealsSkeleton />}>
        <DealsTable />
      </Suspense>
    </div>
  );
}