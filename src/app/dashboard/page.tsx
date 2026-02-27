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
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardRealtimeListener } from "@/components/dashboard/realtime-listener";
import {
  PropertyTypeChart,
  OfferStatusChart,
  PortfolioValueChart,
  OfferActivityChart,
} from "@/components/dashboard/charts";
import type { Property } from "@/lib/schema/property.schema";
import type { Offer } from "@/lib/schema/property.schema";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

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

  // Stats
  const totalPortfolioValue = properties.reduce(
    (sum, p) => sum + (Number(p.asking_price) || 0),
    0
  );
  const activeListings = properties.filter((p) => p.status === "active").length;
  const pendingReceivedOffers = receivedOffers.filter((o) => o.status === "pending").length;
  const pendingSentOffers = sentOffers.filter((o) => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <DashboardRealtimeListener myPropertyIds={propertyIds} userId={user.id} />
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your properties, offers, and valuations
            </p>
          </div>
          <Button asChild>
            <Link href="/properties/new">
              <Plus size={16} className="mr-2" /> List Property
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Building2 size={18} className="text-chart-1" />}
            label="My Listings"
            value={properties.length.toString()}
            sub={`${activeListings} active`}
          />
          <StatCard
            icon={<IndianRupee size={18} className="text-chart-2" />}
            label="Portfolio Value"
            value={`₹${formatCompact(totalPortfolioValue)}`}
            sub="Total asking"
          />
          <StatCard
            icon={<TrendingUp size={18} className="text-chart-4" />}
            label="Offers Received"
            value={receivedOffers.length.toString()}
            sub={`${pendingReceivedOffers} pending`}
          />
          <StatCard
            icon={<BarChart3 size={18} className="text-chart-5" />}
            label="My Offers"
            value={sentOffers.length.toString()}
            sub={`${pendingSentOffers} pending`}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
            <h3 className="text-sm font-semibold text-foreground mb-4">Property Type Distribution</h3>
            <PropertyTypeChart properties={properties} />
          </div>
          <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
            <h3 className="text-sm font-semibold text-foreground mb-4">Offer Status Breakdown</h3>
            <OfferStatusChart offers={[...receivedOffers, ...sentOffers]} />
          </div>
          <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
            <h3 className="text-sm font-semibold text-foreground mb-4">Portfolio Value by Property</h3>
            <PortfolioValueChart properties={properties} />
          </div>
          <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
            <h3 className="text-sm font-semibold text-foreground mb-4">Offer Activity (Last 7 Days)</h3>
            <OfferActivityChart offers={[...receivedOffers, ...sentOffers]} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Properties */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">My Properties</h2>
              <Link href="/properties" className="text-xs text-primary hover:underline flex items-center gap-1">
                Browse All <ArrowRight size={12} />
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-8 text-center shadow-sm">
                <Building2 size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  You haven&apos;t listed any properties yet
                </p>
                <Button asChild size="sm">
                  <Link href="/properties/new">
                    <Plus size={14} className="mr-1.5" /> List Your First Property
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.map((p) => {
                  const offerCount = receivedOffers.filter(
                    (o) => o.property_id === p.id
                  ).length;
                  return (
                    <Link
                      key={p.id}
                      href={`/properties/${p.id}`}
                      className="group flex items-center gap-4 bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">
                          {p.property_type === "apartment"
                            ? "🏢"
                            : p.property_type === "villa"
                              ? "🏡"
                              : p.property_type === "plot"
                                ? "🌳"
                                : p.property_type === "commercial"
                                  ? "🏪"
                                  : "🏠"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.city}, {p.state}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-sm font-bold text-foreground flex items-center justify-end gap-0.5">
                          <IndianRupee size={12} />
                          {p.asking_price
                            ? Number(p.asking_price).toLocaleString("en-IN")
                            : "—"}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${p.status === "active"
                              ? "bg-green-100 text-green-700"
                              : p.status === "sold"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {p.status}
                          </span>
                          {offerCount > 0 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
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

          {/* Sidebar: Recent offers + quick links */}
          <div className="space-y-4">
            {/* Recent Received Offers */}
            <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                Recent Offers Received
                {receivedOffers.length > 0 && (
                  <Link href="/dashboard/offers" className="text-xs text-primary hover:underline">
                    View All
                  </Link>
                )}
              </h3>
              {receivedOffers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No offers received yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {receivedOffers.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {o.property_title}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <IndianRupee size={10} />
                          {Number(o.offer_price).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <OfferStatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Sent Offers */}
            <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                My Offers Sent
                {sentOffers.length > 0 && (
                  <Link href="/dashboard/my-offers" className="text-xs text-primary hover:underline">
                    View All
                  </Link>
                )}
              </h3>
              {sentOffers.length === 0 ? (
                <p className="text-xs text-muted-foreground">You haven&apos;t made any offers yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {sentOffers.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <IndianRupee size={10} />
                          {Number(o.offer_price).toLocaleString("en-IN")}
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

            {/* Quick Links */}
            <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-4 space-y-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
              <h3 className="text-sm font-semibold text-foreground mb-2">Quick Links</h3>
              <QuickLink href="/dashboard/portfolio" icon={<TrendingUp size={14} />} label="My AI Portfolio" />
              <QuickLink href="/agents" icon={<Bot size={14} />} label="AI Agents" />
              <QuickLink href="/properties" icon={<Eye size={14} />} label="Browse Properties" />
              <QuickLink href="/search" icon={<BarChart3 size={14} />} label="Search Properties" />
              <QuickLink href="/properties/new" icon={<Plus size={14} />} label="List New Property" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-[#E3EDF6] dark:bg-slate-900 rounded-xl border border-border/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-white/10 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function OfferStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; cls: string }> = {
    pending: { icon: <Clock size={10} />, cls: "bg-amber-100 text-amber-700" },
    accepted: { icon: <CheckCircle2 size={10} />, cls: "bg-green-100 text-green-700" },
    rejected: { icon: <XCircle size={10} />, cls: "bg-red-100 text-red-700" },
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
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
    >
      {icon}
      {label}
      <ArrowRight size={12} className="ml-auto" />
    </Link>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
