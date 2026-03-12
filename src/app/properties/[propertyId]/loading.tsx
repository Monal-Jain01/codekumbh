function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function PropertyDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-32 mb-6" />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: images + description */}
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-72 w-full" />

            {/* Thumbnails */}
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-20 shrink-0" />
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>

            {/* AI valuation card */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <Skeleton className="h-4 w-36" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>

            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
