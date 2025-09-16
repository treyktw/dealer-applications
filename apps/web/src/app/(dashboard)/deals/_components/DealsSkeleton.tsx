// app/(dashboard)/deals/_components/DealsSkeleton.tsx
export function DealsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-10 w-64 bg-muted rounded animate-pulse"></div>
        <div className="h-10 w-40 bg-muted rounded animate-pulse"></div>
      </div>
      
      <div className="h-96 bg-muted rounded animate-pulse"></div>
    </div>
  );
}