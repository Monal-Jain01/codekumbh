"use client";

import { IndianRupee } from "lucide-react";

/* ── Property Type Distribution ──────────────────────────────────────── */

interface TypeDistribution {
  type: string;
  count: number;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  apartment: "bg-blue-500",
  villa: "bg-emerald-500",
  plot: "bg-amber-500",
  commercial: "bg-purple-500",
  house: "bg-rose-500",
  other: "bg-slate-400",
};

const TYPE_EMOJI: Record<string, string> = {
  apartment: "🏢",
  villa: "🏡",
  plot: "🌳",
  commercial: "🏪",
  house: "🏠",
};

export function PropertyTypeChart({
  properties,
}: {
  properties: { property_type: string | null }[];
}) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No properties to display
      </div>
    );
  }

  const typeCounts: Record<string, number> = {};
  for (const p of properties) {
    const t = p.property_type || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  const data: TypeDistribution[] = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      count,
      color: TYPE_COLORS[type] ?? TYPE_COLORS.other,
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...data.map((d) => d.count));
  const total = properties.length;

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.type} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="capitalize text-foreground font-medium flex items-center gap-1.5">
              <span>{TYPE_EMOJI[d.type] ?? "🏠"}</span>
              {d.type}
            </span>
            <span className="text-muted-foreground">
              {d.count} ({Math.round((d.count / total) * 100)}%)
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${d.color}`}
              style={{ width: `${(d.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Offer Status Breakdown ──────────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { color: string; bgColor: string }> = {
  pending: { color: "bg-amber-500", bgColor: "bg-amber-100 text-amber-700" },
  accepted: { color: "bg-emerald-500", bgColor: "bg-emerald-100 text-emerald-700" },
  rejected: { color: "bg-red-500", bgColor: "bg-red-100 text-red-700" },
};

export function OfferStatusChart({
  offers,
}: {
  offers: { status: string; offer_price?: number | string }[];
}) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No offers to display
      </div>
    );
  }

  const statusCounts: Record<string, { count: number; totalValue: number }> = {};
  for (const o of offers) {
    const s = o.status || "pending";
    if (!statusCounts[s]) statusCounts[s] = { count: 0, totalValue: 0 };
    statusCounts[s].count++;
    statusCounts[s].totalValue += Number(o.offer_price) || 0;
  }

  const total = offers.length;
  const statuses = Object.entries(statusCounts).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-4">
      {/* Segmented bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {statuses.map(([status, { count }]) => {
          const pct = (count / total) * 100;
          const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
          return (
            <div
              key={status}
              className={`h-full transition-all duration-700 ease-out ${cfg.color}`}
              style={{ width: `${pct}%` }}
              title={`${status}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {statuses.map(([status, { count, totalValue }]) => {
          const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
          return (
            <div
              key={status}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                <span className="capitalize text-foreground font-medium">
                  {status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {count} ({Math.round((count / total) * 100)}%)
                </span>
                <span className="text-muted-foreground flex items-center gap-0.5">
                  <IndianRupee size={9} />
                  {formatCompact(totalValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Portfolio Value by Property ──────────────────────────────────────── */

export function ListingsValueChart({
  properties,
}: {
  properties: { title: string; asking_price?: number | string | null; property_type: string | null }[];
}) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No properties to display
      </div>
    );
  }

  const sorted = [...properties]
    .map((p) => ({ ...p, price: Number(p.asking_price) || 0 }))
    .filter((p) => p.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 6);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No priced properties
      </div>
    );
  }

  const maxPrice = Math.max(...sorted.map((p) => p.price));

  return (
    <div className="space-y-3">
      {sorted.map((p, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium truncate max-w-[60%]">
              {TYPE_EMOJI[p.property_type ?? ""] ?? "🏠"} {p.title}
            </span>
            <span className="text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
              <IndianRupee size={10} />
              {formatCompact(p.price)}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
              style={{ width: `${(p.price / maxPrice) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Offer Activity Timeline (mini sparkline-style) ──────────────────── */

export function OfferActivityChart({
  offers,
}: {
  offers: { created_at: string }[];
}) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No offer activity
      </div>
    );
  }

  // Group by last 7 days
  const now = new Date();
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const count = offers.filter(
      (o) => o.created_at.slice(0, 10) === dateStr
    ).length;
    days.push({ label, count });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-1.5 h-24">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground font-medium">
              {d.count > 0 ? d.count : ""}
            </span>
            <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
              <div
                className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ease-out ${
                  d.count > 0
                    ? "bg-gradient-to-t from-primary/60 to-primary"
                    : "bg-muted"
                }`}
                style={{
                  height: d.count > 0 ? `${Math.max((d.count / maxCount) * 100, 15)}%` : "4px",
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Last 7 days &middot; {offers.filter(o => {
          const d = new Date(o.created_at);
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        }).length} offers this week
      </p>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatCompact(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
