function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Avatar + name header */}
        <div className="flex items-center gap-5">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>

        {/* Tabs bar */}
        <div className="flex gap-2 border-b border-border pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" />
          ))}
        </div>

        {/* Form card */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-9 w-28 rounded-lg mt-2" />
        </div>

        {/* Investment preferences card */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-9 w-28 rounded-lg mt-2" />
        </div>
      </div>
    </div>
  );
}
