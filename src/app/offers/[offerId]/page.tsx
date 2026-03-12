import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Ban,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { respondToOffer } from "@/actions/property/property";

/* ────────────────────────── types ── */
interface AiRec {
  risk_label?: string;
  recommendation?: string;
  summary?: string;
  for_seller?: {
    verdict?: string;
    should_accept?: boolean;
    counter_price?: number | null;
    reasoning?: string;
  };
  for_buyer?: {
    value_assessment?: string;
    market_position?: string;
    reasoning?: string;
  };
  market_context?: string;
  red_flags?: string[];
  positive_signals?: string[];
  confidence_score?: number;
}

/* ────────────────────────── helpers ── */

function scoreColor(score: number | null) {
  if (score == null) return { bar: "bg-gray-300", text: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
  if (score <= 3) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (score <= 6) return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  return { bar: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50 border-rose-200" };
}

function RiskGauge({ score }: { score: number | null }) {
  const pct = score != null ? (score / 10) * 100 : 0;
  const colors = scoreColor(score);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Risk Score</span>
        <span className={`font-bold text-lg ${colors.text}`}>
          {score != null ? `${score}/10` : "Analyzing…"}
        </span>
      </div>
      <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Low risk</span>
        <span>High risk</span>
      </div>
    </div>
  );
}

function fmt(amount: number | null | undefined) {
  if (amount == null) return "—";
  return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> },
    accepted: { label: "Accepted", cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    rejected: { label: "Rejected", cls: "text-rose-700 bg-rose-50 border-rose-200", icon: <Ban className="w-3.5 h-3.5" /> },
  };
  const { label, cls, icon } = map[status] ?? { label: status, cls: "text-gray-700 bg-gray-50 border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

/* ─────────────────────────── page ── */

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch the offer with property + buyer + seller info
  const { data: offer } = await supabase
    .from("offers")
    .select(
      `
      *,
      property:properties(
        id, title, property_type, city, state, area_sqft,
        asking_price, bedrooms, bathrooms, owner_id,
        owner:profiles!properties_owner_id_fkey(full_name, phone)
      ),
      buyer:profiles!offers_buyer_id_fkey(full_name, phone, organization)
    `
    )
    .eq("id", offerId)
    .single();

  if (!offer) notFound();

  // Only the buyer or the property owner can see this
  const property = offer.property as {
    id: string;
    title: string;
    property_type: string;
    city: string;
    state: string;
    area_sqft: number;
    asking_price: number;
    bedrooms: number;
    bathrooms: number;
    owner_id: string;
    owner: { full_name: string; phone: string };
  };
  const buyer = offer.buyer as { full_name: string; phone: string; organization: string };

  const isBuyer = user.id === offer.buyer_id;
  const isSeller = user.id === property.owner_id;
  if (!isBuyer && !isSeller) redirect("/dashboard");

  // Parse AI recommendation
  let aiRec: AiRec | null = null;
  if (offer.ai_recommendation) {
    try {
      aiRec = JSON.parse(offer.ai_recommendation);
    } catch {
      aiRec = null;
    }
  }

  const riskScore = offer.ai_risk_score as number | null;
  const colors = scoreColor(riskScore);
  const offerVsAsking =
    property.asking_price
      ? Math.round(
          ((Number(offer.offer_price) - Number(property.asking_price)) /
            Number(property.asking_price)) *
            100
        )
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Offer Detail</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">{offerId.slice(0, 8)}…</p>
          </div>
          <StatusBadge status={offer.status} />
        </div>

        {/* ── Property summary ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Link
              href={`/properties/${property.id}`}
              className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              {property.title}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-sm text-gray-500">
              {property.property_type} · {property.city}, {property.state} · {property.area_sqft?.toLocaleString()} sqft
            </p>
          </CardContent>
        </Card>

        {/* ── Price comparison ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500 mb-1">Asking Price</p>
              <p className="text-xl font-bold text-gray-800">{fmt(property.asking_price)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500 mb-1">Offer Amount</p>
              <p className="text-xl font-bold text-indigo-700">{fmt(offer.offer_price)}</p>
              {offerVsAsking != null && (
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    offerVsAsking >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {offerVsAsking > 0 ? "+" : ""}
                  {offerVsAsking}% vs asking
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Parties ── */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500 mb-1">Buyer</p>
              <p className="font-semibold text-gray-800">{buyer?.full_name ?? "Unknown"}</p>
              {buyer?.phone && <p className="text-sm text-gray-500">{buyer.phone}</p>}
              {buyer?.organization && <p className="text-xs text-gray-400">{buyer.organization}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500 mb-1">Submitted</p>
              <p className="font-semibold text-gray-800">
                {new Date(offer.created_at ?? "").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(offer.created_at ?? "").toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── AI Risk Analysis ── */}
        {riskScore == null && !aiRec ? (
          <Card className="border-indigo-100 bg-indigo-50/50">
            <CardContent className="flex items-center gap-3 py-5">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
              <div>
                <p className="font-medium text-indigo-700">AI analysis in progress…</p>
                <p className="text-sm text-indigo-500 mt-0.5">
                  Risk scoring usually completes within 30–60 seconds. Refresh to see results.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={`border ${colors.bg}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${colors.text}`} />
                AI Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Gauge */}
              <RiskGauge score={riskScore} />

              {/* Labels */}
              {(aiRec?.risk_label || aiRec?.recommendation) && (
                <div className="flex flex-wrap gap-2">
                  {aiRec?.risk_label && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text}`}>
                      {aiRec.risk_label}
                    </span>
                  )}
                  {aiRec?.recommendation && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {aiRec.recommendation}
                    </span>
                  )}
                </div>
              )}

              {/* Summary */}
              {aiRec?.summary && (
                <p className="text-gray-700 text-sm leading-relaxed">{aiRec.summary}</p>
              )}

              {/* For Seller / For Buyer */}
              {isSeller && aiRec?.for_seller && (
                <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Seller Perspective
                  </p>
                  {aiRec.for_seller.verdict && (
                    <p className="font-semibold text-gray-800">{aiRec.for_seller.verdict}</p>
                  )}
                  {aiRec.for_seller.counter_price && (
                    <p className="text-sm text-amber-700">
                      Suggested counter: <span className="font-semibold">{fmt(aiRec.for_seller.counter_price)}</span>
                    </p>
                  )}
                  {aiRec.for_seller.reasoning && (
                    <p className="text-sm text-gray-600">{aiRec.for_seller.reasoning}</p>
                  )}
                </div>
              )}

              {isBuyer && aiRec?.for_buyer && (
                <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Buyer Perspective
                  </p>
                  {aiRec.for_buyer.value_assessment && (
                    <p className="font-semibold text-gray-800">{aiRec.for_buyer.value_assessment}</p>
                  )}
                  {aiRec.for_buyer.market_position && (
                    <p className="text-sm text-gray-600">{aiRec.for_buyer.market_position}</p>
                  )}
                  {aiRec.for_buyer.reasoning && (
                    <p className="text-sm text-gray-600">{aiRec.for_buyer.reasoning}</p>
                  )}
                </div>
              )}

              {/* Red flags + positive signals */}
              {(aiRec?.red_flags?.length || aiRec?.positive_signals?.length) ? (
                <div className="grid grid-cols-2 gap-3">
                  {aiRec?.red_flags && aiRec.red_flags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-rose-600 mb-1.5">Red Flags</p>
                      <ul className="space-y-1">
                        {aiRec.red_flags.map((f, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiRec?.positive_signals && aiRec.positive_signals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 mb-1.5">Positive Signals</p>
                      <ul className="space-y-1">
                        {aiRec.positive_signals.map((s, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Market context */}
              {aiRec?.market_context && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Market Context</p>
                  <p className="text-sm text-gray-600">{aiRec.market_context}</p>
                </div>
              )}

              {/* Confidence */}
              {aiRec?.confidence_score != null && (
                <p className="text-xs text-gray-400">
                  AI confidence: {Math.round(aiRec.confidence_score * 100)}%
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Accept / Reject actions (seller only, pending) ── */}
        {isSeller && offer.status === "pending" && (
          <div className="flex gap-3">
            <form
              action={async () => {
                "use server";
                await respondToOffer(offerId, "accepted");
              }}
              className="flex-1"
            >
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept Offer
              </Button>
            </form>
            <form
              action={async () => {
                "use server";
                await respondToOffer(offerId, "rejected");
              }}
              className="flex-1"
            >
              <Button type="submit" variant="outline" className="w-full border-rose-300 text-rose-700 hover:bg-rose-50">
                <Ban className="w-4 h-4 mr-2" />
                Reject Offer
              </Button>
            </form>
          </div>
        )}

        {/* Back */}
        <Link
          href={isSeller ? "/dashboard/offers" : "/dashboard/my-offers"}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          Back to Offers
        </Link>
      </div>
    </div>
  );
}
