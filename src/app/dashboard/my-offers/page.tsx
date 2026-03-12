import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { Offer } from "@/lib/schema/property.schema";

export default async function MyOffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get offers I've sent + join property title
  const { data } = await supabase
    .from("offers")
    .select("*, properties(title, property_type, city, state, asking_price)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const offers = (data ?? []) as (Offer & {
    properties: {
      title: string;
      property_type: string | null;
      city: string | null;
      state: string | null;
      asking_price: number | null;
    } | null;
  })[];

  const pending = offers.filter((o) => o.status === "pending");
  const others = offers.filter((o) => o.status !== "pending");

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">My Offers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {offers.length} offer{offers.length !== 1 && "s"} submitted
          </p>
        </div>

        {offers.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <ShoppingBag size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">You haven&apos;t made any offers yet.</p>
            <Link href="/properties" className="text-sm text-primary hover:underline">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  Pending ({pending.length})
                </h2>
                <OfferList offers={pending} />
              </div>
            )}
            {others.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Past ({others.length})
                </h2>
                <OfferList offers={others} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OfferList({
  offers,
}: {
  offers: (Offer & {
    properties: {
      title: string;
      property_type: string | null;
      city: string | null;
      state: string | null;
      asking_price: number | null;
    } | null;
  })[];
}) {
  return (
    <div className="space-y-3">
      {offers.map((o) => {
        const prop = o.properties;
        return (
        <div
            key={o.id}
            className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
            <Link href={`/properties/${o.property_id}`} className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center flex-shrink-0">
              <span className="text-lg">
                {prop?.property_type === "apartment" ? "🏢" : prop?.property_type === "villa" ? "🏡" : prop?.property_type === "plot" ? "🌳" : prop?.property_type === "commercial" ? "🏪" : "🏠"}
              </span>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/properties/${o.property_id}`} className="text-sm font-semibold text-foreground truncate block hover:text-primary transition-colors">
                {prop?.title ?? "Property"}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {prop?.city}, {prop?.state}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                {new Date(o.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right flex-shrink-0 space-y-1">
              <p className="text-sm font-bold text-foreground flex items-center justify-end gap-0.5">
                <IndianRupee size={12} />
                {Number(o.offer_price).toLocaleString("en-IN")}
              </p>
              {prop?.asking_price && (
                <p className="text-[10px] text-muted-foreground">
                  Asking: ₹{Number(prop.asking_price).toLocaleString("en-IN")}
                </p>
              )}
              <StatusBadge status={o.status} />
            </div>
          </div>
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
              <Link
                href={`/offers/${o.id}`}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Sparkles size={11} /> View AI Analysis
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; cls: string }> = {
    pending: { icon: <Clock size={10} />, cls: "bg-amber-100 text-amber-700" },
    accepted: { icon: <CheckCircle2 size={10} />, cls: "bg-green-100 text-green-700" },
    rejected: { icon: <XCircle size={10} />, cls: "bg-red-100 text-red-700" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${c.cls}`}>
      {c.icon} {status}
    </span>
  );
}
