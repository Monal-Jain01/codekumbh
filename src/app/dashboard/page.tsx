import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  IndianRupee,
  TrendingUp,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  ArrowRight,
  MapPin,
  Search,
  AlertCircle,
  MapPinOff,
  FileText,
  Percent,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardRealtimeListener } from "@/components/dashboard/realtime-listener";
import type { Property } from "@/lib/schema/property.schema";
import type { Offer } from "@/lib/schema/property.schema";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Onboarding check — redirect if not completed
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profileCheck?.onboarding_completed) redirect("/onboarding");

  // Fetch my properties
  const { data: myProperties } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const properties = (myProperties ?? []) as Property[];

  // Fetch all offers on my properties
  const propertyIds = properties.map((p) => p.id);
  let receivedOffers: (Offer & { property_title?: string })[] = [];
  if (propertyIds.length > 0) {
    const { data: offers } = await supabase
      .from("offers")
      .select("*")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false });
    receivedOffers = ((offers ?? []) as Offer[]).map((o) => ({
      ...o,
      property_title: properties.find((p) => p.id === o.property_id)?.title ?? "Unknown",
    }));
  }

  // Fetch offers I've made as a buyer
  const { data: myOffers } = await supabase
    .from("offers")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  const sentOffers = (myOffers ?? []) as Offer[];

  // Fetch latest AI investment insight for this user
  type AiInsight = {
    projected_roi: number | null;
    risk_analysis: string | null;
    risk_tolerance: string | null;
    confidence_score: number | null;
    allocation_strategy: { property_investment_pct?: number; liquid_reserve_pct?: number; renovation_budget_pct?: number; reasoning?: string } | null;
  };
  const { data: insightData } = await supabase
    .from("ai_investment_insights")
    .select("projected_roi, risk_analysis, risk_tolerance, confidence_score, allocation_strategy")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const aiInsight = (insightData as AiInsight | null) ?? null;

  // Stats
  const totalPortfolioValue = properties.reduce(
    (sum, p) => sum + (Number(p.asking_price) || 0),
    0
  );
  const activeListings = properties.filter((p) => p.status === "active").length;
  const pendingReceivedOffers = receivedOffers.filter((o) => o.status === "pending").length;
  const pendingSentOffers = sentOffers.filter((o) => o.status === "pending").length;
  const acceptedOffers = receivedOffers.filter((o) => o.status === "accepted").length;
  const acceptanceRate = receivedOffers.length > 0
    ? Math.round((acceptedOffers / receivedOffers.length) * 100)
    : null;

  /* Listing health: flag properties missing key data */
  const incompleteListings = properties.filter(
    (p) => !p.description || !p.latitude || !p.longitude
  );

  /* User display name from email */
  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background">
      <DashboardRealtimeListener myPropertyIds={propertyIds} userId={user.id} />

      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Hello, <span className="capitalize">{displayName}</span> 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeListings} active listing{activeListings !== 1 ? "s" : ""} · {pendingReceivedOffers} pending offer{pendingReceivedOffers !== 1 ? "s" : ""} to review
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/properties/new">
              <Plus size={14} className="mr-1.5" /> List Property
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Pending actions alert strip */}
        {(pendingReceivedOffers > 0 || incompleteListings.length > 0) && (
          <div className="space-y-2">
            {pendingReceivedOffers > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                  <strong>{pendingReceivedOffers} offer{pendingReceivedOffers !== 1 ? "s" : ""}</strong>{" "}
                  {pendingReceivedOffers === 1 ? "is" : "are"} waiting for your response.
                </p>
                <Link
                  href="/dashboard/offers"
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline shrink-0 flex items-center gap-1"
                >
                  Review <ArrowRight size={11} />
                </Link>
              </div>
            )}
            {incompleteListings.length > 0 && (
              <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                  <strong>{incompleteListings.length} listing{incompleteListings.length !== 1 ? "s" : ""}</strong>{" "}
                  {incompleteListings.length === 1 ? "is" : "are"} missing description or GPS — complete them to rank higher.
                </p>
                <Link
                  href="/properties"
                  className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1"
                >
                  Fix <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Building2 size={16} />}
            iconBg="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
            label="My Listings"
            value={properties.length.toString()}
            sub={`${activeListings} active`}
          />
          <StatCard
            icon={<IndianRupee size={16} />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
            label="Listings Value"
            value={`₹${formatCompact(totalPortfolioValue)}`}
            sub="Total asking"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            iconBg="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
            label="Offers Received"
            value={receivedOffers.length.toString()}
            sub={`${pendingReceivedOffers} pending`}
          />
          <StatCard
            icon={<BarChart3 size={16} />}
            iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
            label="My Offers"
            value={sentOffers.length.toString()}
            sub={`${pendingSentOffers} pending`}
          />
        </div>

        {/* Main content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* My Properties */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">My Properties</h2>
              <Link href="/properties" className="text-xs text-primary hover:underline flex items-center gap-1">
                Browse All <ArrowRight size={11} />
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 text-2xl">
                  🏘️
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No properties listed yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  List your first property to reach thousands of buyers.
                </p>
                <Button asChild size="sm">
                  <Link href="/properties/new">
                    <Plus size={13} className="mr-1.5" /> List First Property
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {properties.map((p) => {
                  const offerCount = receivedOffers.filter((o) => o.property_id === p.id).length;
                  const emoji =
                    p.property_type === "apartment" ? "🏢"
                    : p.property_type === "villa" ? "🏡"
                    : p.property_type === "plot" ? "🌳"
                    : p.property_type === "commercial" ? "🏪"
                    : "🏠";
                  return (
                    <Link
                      key={p.id}
                      href={`/properties/${p.id}`}
                      className="group flex items-center gap-3 bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 flex items-center justify-center flex-shrink-0 text-xl">
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {p.city}, {p.state}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1.5">
                        <p className="text-sm font-bold text-foreground flex items-center justify-end gap-0.5">
                          <IndianRupee size={11} strokeWidth={2.5} />
                          {p.asking_price ? formatCompact(Number(p.asking_price)) : "—"}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                            p.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : p.status === "sold" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                          }`}>
                            {p.status}
                          </span>
                          {offerCount > 0 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              {offerCount} offer{offerCount > 1 && "s"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Recent Received Offers */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Offers Received</h3>
                {receivedOffers.length > 0 && (
                  <Link href="/dashboard/offers" className="text-xs text-primary hover:underline">
                    View All
                  </Link>
                )}
              </div>
              {receivedOffers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No offers received yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {receivedOffers.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{o.property_title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <IndianRupee size={9} /> {Number(o.offer_price).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <OfferStatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Sent Offers */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Offers Sent</h3>
                {sentOffers.length > 0 && (
                  <Link href="/dashboard/my-offers" className="text-xs text-primary hover:underline">
                    View All
                  </Link>
                )}
              </div>
              {sentOffers.length === 0 ? (
                <p className="text-xs text-muted-foreground">You haven&apos;t made any offers yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {sentOffers.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground flex items-center gap-0.5">
                          <IndianRupee size={9} /> {Number(o.offer_price).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(o.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <OfferStatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Listing Health */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Listing Health</h3>
                {acceptanceRate !== null && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center gap-0.5">
                    <Percent size={8} /> {acceptanceRate}% acceptance
                  </span>
                )}
              </div>
              {properties.length === 0 ? (
                <p className="text-xs text-muted-foreground">No listings yet.</p>
              ) : (
                <div className="space-y-2">
                  {properties.slice(0, 5).map((p) => {
                    const hasDesc = !!p.description;
                    const hasGps  = p.latitude !== null && p.longitude !== null;
                    const score   = [hasDesc, hasGps].filter(Boolean).length;
                    return (
                      <Link key={p.id} href={`/properties/${p.id}`}
                        className="flex items-center gap-2 hover:bg-muted/40 rounded-lg px-1.5 py-1 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`flex items-center gap-0.5 text-[10px] ${hasDesc ? "text-emerald-600" : "text-muted-foreground"}`}>
                              <FileText size={9} /> {hasDesc ? "Desc" : "No desc"}
                            </span>
                            <span className={`flex items-center gap-0.5 text-[10px] ${hasGps ? "text-emerald-600" : "text-muted-foreground"}`}>
                              {hasGps ? <MapPin size={9} /> : <MapPinOff size={9} />} {hasGps ? "GPS" : "No GPS"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {score === 2 ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600">{score}/2</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Market Insight */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-b border-border">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                  <Sparkles size={12} className="text-white" />
                </div>
                <p className="text-sm font-semibold text-foreground">AI Market Insight</p>
                {aiInsight && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">
                    LIVE
                  </span>
                )}
              </div>
              <div className="p-4">
                {!aiInsight ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    AI insights will appear here after your first property listing is analysed.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* ROI + Risk row */}
                    <div className="flex items-center gap-2">
                      {aiInsight.projected_roi != null && (
                        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground">Projected ROI</p>
                          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                            {aiInsight.projected_roi.toFixed(1)}%
                          </p>
                        </div>
                      )}
                      {aiInsight.risk_tolerance && (
                        <div className={`flex-1 rounded-lg p-2.5 text-center ${
                          aiInsight.risk_tolerance === "LOW"
                            ? "bg-green-50 dark:bg-green-900/20"
                            : aiInsight.risk_tolerance === "HIGH"
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "bg-amber-50 dark:bg-amber-900/20"
                        }`}>
                          <ShieldCheck size={12} className={`mx-auto mb-0.5 ${
                            aiInsight.risk_tolerance === "LOW" ? "text-green-600" : aiInsight.risk_tolerance === "HIGH" ? "text-red-600" : "text-amber-600"
                          }`} />
                          <p className="text-[10px] text-muted-foreground">Risk Level</p>
                          <p className={`text-xs font-bold capitalize ${
                            aiInsight.risk_tolerance === "LOW" ? "text-green-700 dark:text-green-400" : aiInsight.risk_tolerance === "HIGH" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                          }`}>
                            {aiInsight.risk_tolerance.charAt(0) + aiInsight.risk_tolerance.slice(1).toLowerCase()}
                          </p>
                        </div>
                      )}
                      {aiInsight.confidence_score != null && (
                        <div className="flex-1 bg-muted/50 rounded-lg p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground">Confidence</p>
                          <p className="text-base font-bold text-foreground">
                            {aiInsight.confidence_score <= 1
                              ? Math.round(aiInsight.confidence_score * 100)
                              : Math.round(aiInsight.confidence_score)}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Risk analysis */}
                    {aiInsight.risk_analysis && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                        {aiInsight.risk_analysis}
                      </p>
                    )}

                    {/* Allocation strategy */}
                    {aiInsight.allocation_strategy?.property_investment_pct != null && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Suggested Allocation
                        </p>
                        {[
                          { label: "Property", pct: aiInsight.allocation_strategy.property_investment_pct, color: "bg-indigo-500" },
                          { label: "Liquid Reserve", pct: aiInsight.allocation_strategy.liquid_reserve_pct ?? 0, color: "bg-emerald-500" },
                          { label: "Renovation", pct: aiInsight.allocation_strategy.renovation_budget_pct ?? 0, color: "bg-amber-500" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground w-20 shrink-0">{item.label}</p>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                            </div>
                            <p className="text-[10px] font-semibold text-foreground w-7 text-right">{item.pct}%</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-1">
                <QuickLink href="/properties" icon={<Eye size={13} />} label="Browse Properties" />
                <QuickLink href="/search" icon={<Search size={13} />} label="Search Properties" />
                <QuickLink href="/properties/new" icon={<Plus size={13} />} label="List New Property" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function StatCard({
  icon, iconBg, label, value, sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs font-medium text-foreground mt-1">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; cls: string }> = {
    pending: { icon: <Clock size={9} />, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
    accepted: { icon: <CheckCircle2 size={9} />, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    rejected: { icon: <XCircle size={9} />, cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${c.cls}`}>
      {c.icon} {status}
    </span>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-2 py-2 transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
      <ArrowRight size={11} className="ml-auto" />
    </Link>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
