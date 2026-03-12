function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

function PropertyListingCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function PropertiesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero / filter bar */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <Skeleton className="h-9 flex-1 min-w-40 max-w-72" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg ml-auto" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <PropertyListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
