import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/schema/property.schema";
import { PropertySearch } from "@/components/property-search";
import { NewlyLaunched } from "@/components/newly-launched";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Bot,
  Search,
  TrendingUp,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-up");
  }

  // Fetch recent properties for Newly Launched section
  const { data: recentProperties } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full  py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            AI-Powered Real Estate Intelligence
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Find, evaluate, and invest in properties with confidence using our
            AI agents and real-time market data.
          </p>
          {/* Search */}
          <div className="flex justify-center">
            <PropertySearch />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="w-full max-w-5xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickCard
            href="/properties"
            icon={<Building2 size={22} className="text-chart-1" />}
            title="Browse Properties"
            description="Explore active listings across cities"
          />
          <QuickCard
            href="/agents"
            icon={<Bot size={22} className="text-chart-2" />}
            title="AI Agents"
            description="Property valuation, market intelligence & more"
          />
          <QuickCard
            href="/search"
            icon={<Search size={22} className="text-chart-4" />}
            title="Smart Search"
            description="Find properties by location, type, or budget"
          />
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl mx-auto py-6 px-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Why CodeHunt?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={<TrendingUp size={18} className="text-chart-1" />}
            title="Smart Valuations"
            description="AI models trained on 10M+ data points for accurate property price estimates."
          />
          <FeatureCard
            icon={<ShieldCheck size={18} className="text-chart-2" />}
            title="Risk Analysis"
            description="Comprehensive fraud detection and offer risk scoring before you commit."
          />
          <FeatureCard
            icon={<BarChart3 size={18} className="text-chart-4" />}
            title="Market Insights"
            description="Real-time trends, demand-supply metrics, and micro-market analytics."
          />
        </div>
      </section>

      {/* Newly Launched */}
      <section className="w-full max-w-5xl mx-auto py-6 px-4">
        <NewlyLaunched properties={(recentProperties ?? []) as Property[]} />
      </section>
    </div>
  );
}

/* ── Helper Components ───────────────────────────────────────────────── */

function QuickCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-card border border-border rounded-xl p-5 flex items-start gap-3.5 hover:shadow-md hover:border-primary/20 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          {title} <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
