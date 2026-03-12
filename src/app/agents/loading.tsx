import type React from "react";

function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} style={style} />;
}

export default function AgentsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Agent list sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <Skeleton className="h-4 w-20 mb-3" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border flex flex-col" style={{ minHeight: "520px" }}>
            {/* Chat header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4">
              {[60, 80, 50, 70].map((w, i) => (
                <div key={i} className={`flex ${i % 2 === 1 ? "justify-end" : ""}`}>
                  <Skeleton className={`h-10 rounded-xl`} style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border flex gap-3">
              <Skeleton className="flex-1 h-11 rounded-xl" />
              <Skeleton className="w-11 h-11 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
