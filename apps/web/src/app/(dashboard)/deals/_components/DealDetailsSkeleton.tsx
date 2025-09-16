// app/(dashboard)/deals/_components/DealDetailSkeleton.tsx
export function DealDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-10 w-64 bg-muted rounded animate-pulse"></div>
        <div className="h-10 w-40 bg-muted rounded animate-pulse"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-64 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
      
      <div className="h-96 bg-muted rounded animate-pulse"></div>
    </div>
  );
}