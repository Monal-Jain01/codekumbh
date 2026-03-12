import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  IndianRupee,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  LayoutGrid,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyMap } from "@/components/properties/property-map";
import type { Property } from "@/lib/schema/property.schema";

const ITEMS_PER_PAGE = 12;

const PROPERTY_TYPES = [
  { value: "", label: "All Types" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "House" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
];

const TYPE_GRADIENT: Record<string, string> = {
  apartment: "from-blue-500/20 via-indigo-500/10 to-blue-600/20",
  villa: "from-emerald-500/20 via-teal-500/10 to-emerald-600/20",
  independent_house: "from-amber-500/20 via-orange-400/10 to-amber-500/20",
  plot: "from-lime-500/20 via-green-400/10 to-lime-600/20",
  commercial: "from-purple-500/20 via-violet-400/10 to-purple-600/20",
};

const TYPE_EMOJI: Record<string, string> = {
  apartment: "🏢",
  villa: "🏡",
  independent_house: "🏠",
  plot: "🌳",
  commercial: "🏪",
};

interface Props {
  searchParams: Promise<{
    page?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    city?: string;
    view?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Onboarding check
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profileCheck?.onboarding_completed) redirect("/onboarding");

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const typeFilter = params.type ?? "";
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const cityFilter = params.city ?? "";
  const viewMode = params.view === "map" ? "map" : "list";

  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .eq("status", "active");

  if (typeFilter) query = query.eq("property_type", typeFilter);
  if (minPrice) query = query.gte("asking_price", minPrice);
  if (maxPrice) query = query.lte("asking_price", maxPrice);
  if (cityFilter) query = query.ilike("city", `%${cityFilter}%`);

  const from = (page - 1) * ITEMS_PER_PAGE;

  /* List view: paginated. Map view: all (up to 200) */
  const { data: properties, count } = viewMode === "map"
    ? await query.order("created_at", { ascending: false }).limit(200)
    : await query.order("created_at", { ascending: false }).range(from, from + ITEMS_PER_PAGE - 1);

  const items = (properties ?? []) as Property[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const hasFilters = !!(typeFilter || cityFilter || minPrice || maxPrice);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (typeFilter) p.set("type", typeFilter);
    if (minPrice) p.set("minPrice", String(minPrice));
    if (maxPrice) p.set("maxPrice", String(maxPrice));
    if (cityFilter) p.set("city", cityFilter);
    if (viewMode === "map") p.set("view", "map");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/properties${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount.toLocaleString()} propert{totalCount !== 1 ? "ies" : "y"} listed
            </p>
          </div>
          <div className="flex gap-2">
            {/* List / Map toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
              <Link
                href={buildUrl({ view: "", page: "1" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid size={13} /> List
              </Link>
              <Link
                href={buildUrl({ view: "map", page: "1" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "map"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Map size={13} /> Map
              </Link>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/search"><Search size={14} className="mr-1.5" /> Search</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/properties/new"><Plus size={14} className="mr-1.5" /> List Property</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Type chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {PROPERTY_TYPES.map((t) => (
            <Link
              key={t.value}
              href={buildUrl({ type: t.value, page: "1" })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                typeFilter === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Filter bar */}
        <form action="/properties" method="GET">
          <input type="hidden" name="type" value={typeFilter} />
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
            <SlidersHorizontal size={14} className="text-muted-foreground shrink-0" />
            <div className="flex gap-2 flex-1 flex-wrap">
              <input
                name="city"
                defaultValue={cityFilter}
                placeholder="City or locality..."
                className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <div className="h-4 w-px bg-border self-center" />
              <input
                name="minPrice"
                type="number"
                defaultValue={minPrice ?? ""}
                placeholder="Min ₹"
                className="w-24 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <div className="h-4 w-px bg-border self-center" />
              <input
                name="maxPrice"
                type="number"
                defaultValue={maxPrice ?? ""}
                placeholder="Max ₹"
                className="w-24 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
            >
              Filter
            </button>
            {hasFilters && (
              <Link href="/properties" className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                Clear
              </Link>
            )}
          </div>
        </form>

        {/* Grid / Map */}
        {viewMode === "map" ? (
          <PropertyMap properties={items} />
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-3xl">
              🏘️
            </div>
            <h2 className="text-base font-semibold text-foreground">No properties found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters ? "Try adjusting your filters" : "Be the first to list on Estator"}
            </p>
            <div className="flex gap-3 justify-center mt-5">
              {hasFilters && <Button variant="outline" asChild><Link href="/properties">Clear Filters</Link></Button>}
              <Button asChild><Link href="/properties/new"><Plus size={14} className="mr-1.5" />List Property</Link></Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}

        {/* Pagination — only in list view */}
        {viewMode === "list" && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {page > 1 ? (
              <Link href={buildUrl({ page: String(page - 1) })} className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft size={14} /> Prev
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg cursor-not-allowed">
                <ChevronLeft size={14} /> Prev
              </span>
            )}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <Link key={pageNum} href={buildUrl({ page: String(pageNum) })} className={`w-9 h-9 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${pageNum === page ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"}`}>
                    {pageNum}
                  </Link>
                );
              })}
            </div>
            {page < totalPages ? (
              <Link href={buildUrl({ page: String(page + 1) })} className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors">
                Next <ChevronRight size={14} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg cursor-not-allowed">
                Next <ChevronRight size={14} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Property Card ──────────────────────────────────────────────────────── */

function PropertyCard({ property: p }: { property: Property }) {
  const gradient = TYPE_GRADIENT[p.property_type ?? ""] ?? "from-slate-500/20 via-slate-400/10 to-slate-500/20";
  const emoji = TYPE_EMOJI[p.property_type ?? ""] ?? "🏠";

  return (
    <Link href={`/properties/${p.id}`} className="group block">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5">
        {/* Image / placeholder */}
        <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-end justify-between p-3`}>
          <div className="absolute inset-0 flex items-center justify-center opacity-20 text-7xl select-none">
            {emoji}
          </div>
          {/* Type badge */}
          <Badge variant="secondary" className="relative z-10 bg-white/80 dark:bg-slate-900/80 text-foreground border-0 backdrop-blur-sm text-[10px] font-semibold capitalize">
            {p.property_type?.replace("_", " ") ?? "Property"}
          </Badge>
          {/* Status pill */}
          <span className="relative z-10 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Active
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm">
              {p.title}
            </h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin size={11} />
              {p.city}, {p.state}
            </p>
          </div>

          {/* Specs pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {p.bedrooms != null && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                <BedDouble size={10} /> {p.bedrooms} BHK
              </span>
            )}
            {p.bathrooms != null && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                <Bath size={10} /> {p.bathrooms}
              </span>
            )}
            {p.area_sqft != null && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                <Ruler size={10} /> {p.area_sqft} sqft
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <p className="flex items-center gap-0.5 text-base font-bold text-foreground">
              <IndianRupee size={14} strokeWidth={2.5} />
              {p.asking_price ? formatPrice(Number(p.asking_price)) : "Price on Request"}
            </p>
            <span className="text-[10px] text-primary font-semibold group-hover:underline">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatPrice(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString("en-IN");
}
