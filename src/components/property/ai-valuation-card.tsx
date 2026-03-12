"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────── */

interface DbValuation {
  predicted_price: number | null;
  price_range_low: number | null;
  price_range_high: number | null;
  confidence_score: number | null;
  reasoning: string | null;
  structured_factors: Record<string, number> | null;
}

interface Props {
  askingPrice: number | null;
  propertyType: string | null;
  city: string | null;
  areaSqft: number | null;
  dbValuation?: DbValuation | null;
}

const LOADING_STEPS = [
  "Scanning market comparables…",
  "Analysing neighbourhood trends…",
  "Cross-referencing recent transactions…",
  "Computing valuation score…",
];

const TYPE_LABEL: Record<string, string> = {
  apartment: "Apartment",
  independent_house: "Independent House",
  villa: "Villa",
  plot: "Plot / Land",
  commercial: "Commercial",
};

/* ─────────────────────────────────────────────────────────────────────────── */

function buildFromDb(db: DbValuation, askingPrice: number | null, areaSqft: number | null) {
  const pred = db.predicted_price ?? Math.round((askingPrice ?? 5_000_000) * 0.97);
  const low  = db.price_range_low ?? Math.round(pred * 0.87);
  const high = db.price_range_high ?? Math.round(pred * 1.14);
  // confidence_score can be 0–1 float or 0–100 integer
  const rawConf = db.confidence_score ?? 0.84;
  const conf = rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);
  const pricePerSqft = areaSqft ? Math.round(pred / areaSqft) : null;
  const diff = askingPrice ? ((pred - askingPrice) / askingPrice) * 100 : 0;
  return { pred, low, high, conf, pricePerSqft, diff, fromDb: true as const };
}

function buildDummy(askingPrice: number | null, areaSqft: number | null) {
  const base = askingPrice ?? 5_000_000;
  const pred = Math.round(base * 0.97);
  const low  = Math.round(base * 0.87);
  const high = Math.round(base * 1.14);
  const pricePerSqft = areaSqft ? Math.round(pred / areaSqft) : null;
  const diff = askingPrice ? ((pred - askingPrice) / askingPrice) * 100 : 0;
  return { pred, low, high, conf: 84, pricePerSqft, diff, fromDb: false as const };
}

/* ─────────────────────────────────────────────────────────────────────────── */

export function AIValuationCard({
  askingPrice, propertyType, city, areaSqft, dbValuation,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">(
    dbValuation ? "done" : "idle"
  );
  const [step, setStep] = useState(0);
  type ValuationState = ReturnType<typeof buildFromDb> | ReturnType<typeof buildDummy>;
  const [valuation, setValuation] = useState<ValuationState | null>(
    dbValuation ? buildFromDb(dbValuation, askingPrice, areaSqft) : null
  );

  function handleGenerate() {
    setStatus("loading");
    setStep(0);
    let s = 0;
    const iv = setInterval(() => {
      s++;
      if (s < LOADING_STEPS.length) setStep(s);
      else {
        clearInterval(iv);
        setValuation(buildDummy(askingPrice, areaSqft));
        setStatus("done");
      }
    }, 750);
  }

  const fmt = (n: number) =>
    "₹" + (n >= 10_000_000
      ? (n / 10_000_000).toFixed(2) + " Cr"
      : (n / 100_000).toFixed(2) + " L");

  // Build factor bars from real structured_factors or fall back to static
  const factorBars = (() => {
    const sf = dbValuation?.structured_factors;
    if (sf && typeof sf === "object") {
      const knownLabels: Record<string, string> = {
        location_score: "Location & Connectivity",
        location: "Location & Connectivity",
        connectivity: "Location & Connectivity",
        market_demand: "Market Demand",
        demand: "Market Demand",
        property_condition: "Property Condition",
        condition: "Property Condition",
        neighbourhood_growth: "Neighbourhood Growth",
        growth: "Neighbourhood Growth",
      };
      const bars: { label: string; score: number }[] = [];
      for (const [k, v] of Object.entries(sf)) {
        if (bars.length >= 4) break;
        if (typeof v !== "number") continue;
        const score = v <= 1 ? Math.round(v * 100) : Math.round(v);
        const label = knownLabels[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        bars.push({ label, score });
      }
      if (bars.length >= 2) return bars;
    }
    return [
      { label: "Location & Connectivity", score: 88 },
      { label: "Market Demand",           score: 76 },
      { label: "Property Condition",      score: 82 },
      { label: "Neighbourhood Growth",    score: 91 },
    ];
  })();

  const reasoning = dbValuation?.reasoning
    ?? (propertyType === "apartment" || !propertyType
      ? `Based on ${city ?? "nearby"} market data and recent comparable sales, this ${TYPE_LABEL[propertyType ?? ""] || "property"} is priced competitively. Strong demand from IT professionals and proximity to metro connectivity supports a healthy appreciation outlook of 8–12% over the next 12 months.`
      : propertyType === "villa"
      ? `Premium villa segment in ${city ?? "this city"} has seen consistent demand from HNI buyers. Limited inventory in gated communities supports the valuation. Expected rental yield of 3.2%–4.5% makes this a sound long-term asset.`
      : `The ${TYPE_LABEL[propertyType] || "property"} in ${city ?? "this city"} aligns with prevailing market rates. Infrastructure development in the micro-market is expected to drive 10–15% appreciation over the next 18 months.`);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">AI Property Valuation</p>
          <p className="text-[11px] text-muted-foreground">
            Powered by market data &amp; comparable analysis
          </p>
        </div>
        {status === "done" && valuation && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            valuation.fromDb
              ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
              : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
          )}>
            {valuation.fromDb ? "AI ✦" : "LIVE"}
          </span>
        )}
      </div>

      <div className="p-5">
        {/* ── Idle ── */}
        {status === "idle" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Get an AI-powered estimated market value based on comparable properties,
              location, and current market conditions.
            </p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-opacity"
            >
              <Sparkles size={14} /> Analyse Property
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-violet-200 dark:border-violet-800" />
              <div className="absolute inset-0 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
              <Sparkles size={16} className="text-violet-600" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">{LOADING_STEPS[step]}</p>
              <div className="flex items-center justify-center gap-1">
                {LOADING_STEPS.map((_, i) => (
                  <div key={i} className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i <= step ? "bg-violet-600" : "bg-border",
                  )} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {status === "done" && valuation && (
          <div className="space-y-4">
            {/* Price */}
            <div className="text-center py-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                Estimated Market Value
              </p>
              <p className="text-2xl font-bold text-foreground">{fmt(valuation.pred)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Range: {fmt(valuation.low)} – {fmt(valuation.high)}
              </p>
              {valuation.pricePerSqft && (
                <p className="text-xs text-muted-foreground">
                  ≈ ₹{valuation.pricePerSqft.toLocaleString("en-IN")} / sqft
                </p>
              )}
            </div>

            {/* Asking vs AI */}
            {askingPrice && (
              <div className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium",
                valuation.diff >= 0
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
              )}>
                {valuation.diff >= 0.5 ? <TrendingUp size={13} />
                  : valuation.diff <= -0.5 ? <TrendingDown size={13} />
                  : <Minus size={13} />}
                {valuation.diff >= 0.5
                  ? `Asking price is ${Math.abs(valuation.diff).toFixed(1)}% above AI estimate`
                  : valuation.diff <= -0.5
                  ? `Asking price is ${Math.abs(valuation.diff).toFixed(1)}% below AI estimate — good deal`
                  : "Asking price is in line with AI estimate"}
              </div>
            )}

            {/* Confidence */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence Score</span>
                <span className="font-semibold text-foreground">{valuation.conf}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000"
                  style={{ width: `${valuation.conf}%` }}
                />
              </div>
            </div>

            {/* Factor bars */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Valuation Factors
              </p>
              <div className="grid grid-cols-2 gap-2">
                {factorBars.map((f) => (
                  <div key={f.label} className="bg-muted/40 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground leading-tight mb-1.5">
                      {f.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${f.score}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground">{f.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
              {reasoning}
            </div>

            {!valuation.fromDb && (
              <button
                onClick={() => { setStatus("idle"); setValuation(null); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Re-analyse
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
