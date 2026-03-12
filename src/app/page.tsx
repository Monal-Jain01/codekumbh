import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/schema/property.schema";
import { PropertySearch } from "@/components/property-search";
import { NewlyLaunched } from "@/components/newly-launched";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, TrendingUp, ShieldCheck, BarChart3,
  Wand2, Sparkles, MapPin, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Logged-in but not onboarded → complete setup first */
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();
    if (!profile?.onboarding_completed) redirect("/onboarding");
  }

  const { data: recentProperties } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("status", "active");

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 py-20 px-4 overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/10 text-xs px-3 py-1">
            🇮🇳 India&apos;s Real Estate Platform
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Find Your Perfect
            <span className="block text-indigo-300">Property in India</span>
          </h1>

          <p className="text-slate-300 text-base max-w-xl mx-auto leading-relaxed">
            Discover, buy, and sell properties across India with smart search,
            verified listings, and zero brokerage.
          </p>

          <div className="flex justify-center">
            <PropertySearch />
          </div>

          {/* Trust stats */}
          <div className="flex items-center justify-center flex-wrap gap-6 pt-2">
            <Stat value={String(totalCount ?? 0) + "+"} label="Active Listings" />
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <Stat value="50+" label="Cities Covered" />
            <div className="w-px h-8 bg-white/20 hidden sm:block" />
            <Stat value="₹0" label="Brokerage" />
          </div>
        </div>
      </section>

      {/* ── Category chips ── */}
      <section className="w-full max-w-5xl mx-auto py-8 px-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Browse by type</p>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/properties?type=${cat.value}`}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-sm"
            >
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {cat.label}
              </span>
            </Link>
          ))}
          <Link
            href="/properties"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-200"
          >
            View All <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ── Newly Launched ── */}
      <section className="w-full max-w-5xl mx-auto py-2 px-4">
        <NewlyLaunched properties={(recentProperties ?? []) as Property[]} />
      </section>

      {/* ── Why Estator ── */}
      <section className="w-full max-w-5xl mx-auto py-10 px-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-border p-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Why Estator</p>
          <h2 className="text-2xl font-bold text-foreground mb-8">
            The smarter way to find property
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Feature
              icon={<TrendingUp size={20} className="text-indigo-500" />}
              bg="bg-indigo-100 dark:bg-indigo-900/40"
              title="Smart Valuations"
              description="Get accurate price estimates based on thousands of real listings and local market data."
            />
            <Feature
              icon={<ShieldCheck size={20} className="text-emerald-500" />}
              bg="bg-emerald-100 dark:bg-emerald-900/40"
              title="Verified Listings"
              description="Every listing is reviewed for authenticity. Buy and sell with complete confidence."
            />
            <Feature
              icon={<BarChart3 size={20} className="text-blue-500" />}
              bg="bg-blue-100 dark:bg-blue-900/40"
              title="Market Insights"
              description="Real-time price trends and demand signals for every city and neighbourhood."
            />
          </div>
        </div>
      </section>

      {/* ── AI Features ── */}
      <section className="w-full max-w-5xl mx-auto py-10 px-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-white/10 p-8 overflow-hidden relative">
          {/* decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">
                Powered by AI
              </p>
            </div>
            <h2 className="text-2xl font-bold text-white mb-8">
              Smart tools built into every listing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AIFeature
                icon={<Wand2 size={18} className="text-violet-300" />}
                bg="bg-violet-500/20"
                title="AI Image Studio"
                description="Stage rooms, swap furniture, enhance photos or compare before/after — all from your browser."
                tag="Photo Tools"
                tagColor="text-violet-400 bg-violet-500/20"
              />
              <AIFeature
                icon={<TrendingUp size={18} className="text-indigo-300" />}
                bg="bg-indigo-500/20"
                title="Smart Valuation"
                description="Instant AI price estimate with confidence score, comparable analysis, and key market factors."
                tag="Pricing"
                tagColor="text-indigo-400 bg-indigo-500/20"
              />
              <AIFeature
                icon={<MapPin size={18} className="text-blue-300" />}
                bg="bg-blue-500/20"
                title="Neighbourhood Intel"
                description="Safety index, school distance, metro access, rental yield, and 5-year growth forecast."
                tag="Location"
                tagColor="text-blue-400 bg-blue-500/20"
              />
              <AIFeature
                icon={<FileText size={18} className="text-teal-300" />}
                bg="bg-teal-500/20"
                title="Auto Description"
                description="One click to generate an optimised, buyer-ready listing description tailored to your property type."
                tag="Listing"
                tagColor="text-teal-400 bg-teal-500/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full max-w-5xl mx-auto py-4 px-4 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-white">Ready to list your property?</h3>
            <p className="text-indigo-200 text-sm mt-1">Reach thousands of verified buyers. Zero brokerage, always.</p>
          </div>
          <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shrink-0">
            <Link href="/properties/new">
              List Your Property <ArrowRight size={16} className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { value: "apartment", label: "Apartment", emoji: "🏢" },
  { value: "villa", label: "Villa", emoji: "🏡" },
  { value: "independent_house", label: "House", emoji: "🏠" },
  { value: "plot", label: "Plot", emoji: "🌳" },
  { value: "commercial", label: "Commercial", emoji: "🏪" },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function Feature({
  icon, bg, title, description,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function AIFeature({
  icon, bg, title, description, tag, tagColor,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
}) {
  return (
    <div className="flex flex-col gap-3 bg-white/5 hover:bg-white/[0.08] transition-colors rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagColor}`}>
          {tag}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
