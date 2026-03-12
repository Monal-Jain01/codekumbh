import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Phone,
  Sparkles,
} from "lucide-react";
import { OfferActions } from "@/components/property/offer-actions";
import type { Offer, Property } from "@/lib/schema/property.schema";

export default async function ReceivedOffersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get my properties
  const { data: myProperties } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id);
  const properties = (myProperties ?? []) as Property[];
  const propertyIds = properties.map((p) => p.id);

  // Get all offers on my properties (with buyer profile)
  let offers: (Offer & { property_title: string; property_type: string | null; buyer_name?: string; buyer_phone?: string })[] = [];
  if (propertyIds.length > 0) {
    const { data } = await supabase
      .from("offers")
      .select("*, profiles:buyer_id(full_name, phone)")
      .in("property_id", propertyIds)
      .order("created_at", { ascending: false });

    offers = ((data ?? []) as Array<Offer & { profiles: { full_name: string | null; phone: string | null } | null }>).map((o) => {
      const prop = properties.find((p) => p.id === o.property_id);
      return {
        ...o,
        property_title: prop?.title ?? "Unknown",
        property_type: prop?.property_type ?? null,
        buyer_name: o.profiles?.full_name ?? undefined,
        buyer_phone: o.profiles?.phone ?? undefined,
      };
    });
  }

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
          <h1 className="text-2xl font-bold text-foreground">Offers Received</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {offers.length} total offer{offers.length !== 1 && "s"} across {properties.length} propert{properties.length !== 1 ? "ies" : "y"}
          </p>
        </div>

        {offers.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Building2 size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No offers received yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending first */}
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
                  Past Offers ({others.length})
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

function OfferList({ offers }: { offers: (Offer & { property_title: string; property_type: string | null; buyer_name?: string; buyer_phone?: string })[] }) {
  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <div
          key={o.id}
          className="bg-card rounded-xl border border-border p-4 space-y-3"
        >
          {/* Top row: property info + price */}
          <div className="flex items-center gap-4">
            <Link
              href={`/properties/${o.property_id}`}
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center flex-shrink-0 hover:ring-2 ring-primary/20 transition-all"
            >
              <span className="text-lg">
                {o.property_type === "apartment" ? "🏢" : o.property_type === "villa" ? "🏡" : o.property_type === "plot" ? "🌳" : o.property_type === "commercial" ? "🏪" : "🏠"}
              </span>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/properties/${o.property_id}`} className="text-sm font-semibold text-foreground truncate block hover:text-primary transition-colors">
                {o.property_title}
              </Link>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={11} /> {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {o.buyer_name && (
                  <span className="ml-1 flex items-center gap-1">
                    · <User size={10} /> {o.buyer_name}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-foreground flex items-center justify-end gap-0.5">
                <IndianRupee size={12} />
                {Number(o.offer_price).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Bottom row: accept/reject buttons + AI analysis link */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              {o.buyer_phone && (
                <a
                  href={`tel:${o.buyer_phone}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <Phone size={11} /> {o.buyer_phone}
                </a>
              )}
              <Link
                href={`/offers/${o.id}`}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Sparkles size={11} /> AI Analysis
              </Link>
            </div>
            <OfferActions
              offerId={o.id}
              status={o.status}
              buyerName={o.buyer_name}
              buyerPhone={o.buyer_phone}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
