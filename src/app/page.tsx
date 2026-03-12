import { createClient } from "@/lib/supabase/server";
import type { Property } from "@/lib/schema/property.schema";
import { PropertySearch } from "@/components/property-search";
import { NewlyLaunched } from "@/components/newly-launched";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, TrendingUp, ShieldCheck, BarChart3,
  Wand2, Sparkles, MapPin, FileText, Image as ImageIcon,
  MessageSquare, Building2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/fade-in";

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
    <div className="relative flex flex-col min-h-screen selection:bg-indigo-500/30">
      {/* ── Fixed Background Image ── */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1723796994732-b375f31ef231?w=1600&auto=format&fit=crop&q=80')" }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      </div>

      <main className="flex-grow w-full pb-20 pt-16 sm:pt-24 relative z-10 flex flex-col gap-24 sm:gap-32">
        
        {/* ── Hero ── */}
        <FadeIn>
          <section className="w-full flex items-center justify-center px-4 sm:px-6 md:px-8">
            <div className="w-full max-w-6xl mx-auto rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 p-8 sm:p-12 md:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-end min-h-[50vh] sm:min-h-[60vh] relative overflow-hidden">
              
              {/* Subtle gradient orb inside hero */}
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

              <div className="max-w-4xl mb-12 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider mb-6">
                  <Sparkles size={14} className="text-indigo-400" />
                  AI-Powered Real Estate
                </div>
                <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[1.05] text-white mb-6">
                  Real Estate <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400">Intelligence.</span>
                </h1>
                <p className="text-white/70 text-lg sm:text-xl font-medium tracking-wide max-w-2xl mb-8">
                  Discover, analyze and invest in properties using AI insights. Experience the future of property hunting.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
                  <Link href="/properties">
                    <button className="bg-white text-black px-8 py-3.5 rounded-full hover:bg-slate-200 transition-colors">
                      Explore Properties
                    </button>
                  </Link>
                  <Link href="/properties">
                    <button className="bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md">
                      Get AI Valuation
                    </button>
                  </Link>
                </div>
              </div>

              <div className="w-full relative z-10">
                <PropertySearch />
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Category Chips ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-6 px-2">Browse by type</p>
            <div className="flex flex-wrap gap-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/properties?type=${cat.value}`}
                  className="group flex items-center gap-2.5 px-6 py-3.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 backdrop-blur-md cursor-pointer"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform duration-300">{cat.emoji}</span>
                  <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors tracking-wide">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Newly Launched ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <NewlyLaunched properties={(recentProperties ?? []) as Property[]} />
          </section>
        </FadeIn>

        {/* ── Why FuturEstate AI ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">Why FuturEstate AI</h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">The smartest way to navigate the real estate market with predictive algorithms and verified data.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Feature
                icon={<TrendingUp size={24} className="text-indigo-400" />}
                title="Smart Valuations"
                description="Get accurate price estimates based on thousands of real listings and local market data."
              />
              <Feature
                icon={<ShieldCheck size={24} className="text-emerald-400" />}
                title="Verified Listings"
                description="Every listing is reviewed for authenticity. Buy and sell with complete confidence."
              />
              <Feature
                icon={<BarChart3 size={24} className="text-blue-400" />}
                title="Market Insights"
                description="Real-time price trends and demand signals for every city and neighbourhood."
              />
            </div>
          </section>
        </FadeIn>

        {/* ── AI Features ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-purple-900/20 border border-white/10 p-8 sm:p-12 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 mb-12 text-center md:text-left">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">Smart tools built into every listing</h2>
                <p className="text-white/60 text-lg max-w-2xl">Leverage generative AI to explore and list properties effortlessly.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <AIFeature
                  icon={<ImageIcon size={20} className="text-violet-400" />}
                  title="AI Image Studio"
                  description="Stage rooms, swap furniture, enhance photos or compare before/after — all from your browser."
                />
                <AIFeature
                  icon={<Wand2 size={20} className="text-indigo-400" />}
                  title="Smart Valuation"
                  description="Instant AI price estimate with confidence score, comparable analysis, and key market factors."
                />
                <AIFeature
                  icon={<MapPin size={20} className="text-blue-400" />}
                  title="Neighbourhood Intel"
                  description="Safety index, school distance, metro access, rental yield, and 5-year growth forecast."
                />
                <AIFeature
                  icon={<FileText size={20} className="text-teal-400" />}
                  title="Auto Description"
                  description="One click to generate an optimised, buyer-ready listing description tailored to your property."
                />
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── Stats ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12">
              <Stat value={String(totalCount ?? 0) + "+"} label="Properties analyzed" />
              <Stat value="14,200+" label="AI valuations generated" />
              <Stat value="50+" label="Cities covered" />
              <Stat value="8,500+" label="Active investors" />
            </div>
          </section>
        </FadeIn>

        {/* ── AI Assistant ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                <MessageSquare size={28} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">Talk to Your AI Real Estate Advisor</h2>
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-6 mb-8 max-w-lg w-full text-left inline-block relative">
                <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-black/40 border-b-[8px] border-b-transparent hidden sm:block"></div>
                <p className="text-white/80 font-mono text-sm sm:text-base">
                  &quot;Find me a 3BHK under ₹1.5Cr in Bangalore with a high rental yield and upcoming metro connectivity.&quot;
                </p>
              </div>
              <Link href="/agents">
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-8 rounded-full transition-all shadow-lg hover:shadow-indigo-500/25">
                  Try AI Assistant
                </button>
              </Link>
            </div>
          </section>
        </FadeIn>

        {/* ── CTA ── */}
        <FadeIn delay={0.1}>
          <section className="w-full max-w-5xl mx-auto px-4 sm:px-6">
            <div className="rounded-[2.5rem] bg-gradient-to-r from-indigo-600 to-purple-600 p-10 sm:p-16 flex flex-col items-center justify-center text-center shadow-[0_10px_40px_rgba(79,70,229,0.3)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <Building2 size={200} />
              </div>
              <h3 className="text-4xl sm:text-5xl font-bold text-white mb-6 relative z-10 tracking-tight">
                Find Your Next Property Investment With AI
              </h3>
              <p className="text-indigo-100 text-lg mb-10 relative z-10 max-w-2xl">
                Join thousands of modern buyers bypassing the noise and using data to make smarter real estate decisions.
              </p>
              <Link href="/properties" className="relative z-10">
                <button className="bg-white text-indigo-900 border-0 hover:bg-slate-100 hover:scale-105 font-bold px-10 py-4 rounded-full transition-all shadow-xl">
                  Explore Properties
                </button>
              </Link>
            </div>
          </section>
        </FadeIn>

      </main>
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
    <div className="text-center flex flex-col items-center justify-center">
      <p className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2 drop-shadow-md">{value}</p>
      <p className="text-sm text-white/60 uppercase tracking-widest font-semibold">{label}</p>
    </div>
  );
}

function Feature({
  icon, title, description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 hover:bg-white/10 transition-colors group hover:-translate-y-1 duration-300">
      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-base text-white/60 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function AIFeature({
  icon, title, description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 bg-black/20 hover:bg-black/40 backdrop-blur-md transition-colors rounded-[1.5rem] p-6 border border-white/10">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/50 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
