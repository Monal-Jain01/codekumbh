import { logger, task } from "@trigger.dev/sdk/v3";
import { runAgentWithTools } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { offerRiskTools } from "@/lib/ai/tools";

/**
 * Analyzes an offer for risk and fills ai_risk_score + ai_recommendation
 * on the offers row. Triggered immediately when a buyer creates an offer.
 */
export const analyzeOfferRisk = task({
  id: "analyze-offer-risk",
  maxDuration: 120,
  run: async (payload: {
    offerId: string;
    propertyId: string;
    buyerId: string;
    offerPrice: number;
  }) => {
    const { offerId, propertyId, buyerId, offerPrice } = payload;
    logger.log("Starting offer risk analysis", { offerId, propertyId });

    // ── 1. Fetch property ────────────────────────────────────────
    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("title, property_type, city, state, area_sqft, asking_price, bedrooms, bathrooms, status")
      .eq("id", propertyId)
      .single();

    if (!property) {
      logger.error("Property not found", { propertyId });
      return { success: false, error: "Property not found" };
    }

    // ── 2. Fetch buyer profile ───────────────────────────────────
    const { data: buyer } = await supabaseAdmin
      .from("profiles")
      .select("full_name, user_type, investment_budget, risk_tolerance, created_at")
      .eq("id", buyerId)
      .single();

    // ── 3. Fetch other offers on this property for context ───────
    const { data: otherOffers } = await supabaseAdmin
      .from("offers")
      .select("offer_price, status, created_at")
      .eq("property_id", propertyId)
      .neq("id", offerId)
      .order("created_at", { ascending: false })
      .limit(5);

    const offerVsAsking = property.asking_price
      ? Math.round(((offerPrice - Number(property.asking_price)) / Number(property.asking_price)) * 100)
      : 0;

    const systemPrompt = `You are an expert Indian real estate offer risk analyst AI with access to real market data tools.
You MUST use your tools (analyze_property_offers, get_area_market_stats, detect_listing_anomalies) to gather data before scoring.
Always respond in ONLY valid JSON — no markdown, no code fences.`;

    const prompt = `Perform a comprehensive risk analysis on this real estate offer.

PROPERTY:
- Title: ${property.title}
- Type: ${property.property_type ?? "Unknown"}
- Location: ${property.city ?? "Unknown"}, ${property.state ?? "Unknown"}
- Area: ${property.area_sqft ?? "Unknown"} sqft
- Bedrooms: ${property.bedrooms ?? "N/A"}
- Asking Price: ₹${Number(property.asking_price).toLocaleString("en-IN")}

OFFER DETAILS:
- Offer Amount: ₹${offerPrice.toLocaleString("en-IN")}
- Offer vs Asking: ${offerVsAsking > 0 ? "+" : ""}${offerVsAsking}%
- Other offers on property: ${otherOffers?.length ?? 0}
${otherOffers && otherOffers.length > 0 ? `- Other offer prices: ${otherOffers.map((o) => `₹${Number(o.offer_price).toLocaleString("en-IN")} (${o.status})`).join(", ")}` : ""}

BUYER PROFILE:
- Type: ${buyer?.user_type ?? "Unknown"}
- Investment Budget: ₹${Number(buyer?.investment_budget || 0).toLocaleString("en-IN")}
- Risk Tolerance: ${buyer?.risk_tolerance ?? "Unknown"}
- Account Age: ${buyer?.created_at ? `since ${new Date(buyer.created_at).toLocaleDateString("en-IN")}` : "Unknown"}

Use tools to:
1. Call analyze_property_offers with property_id="${propertyId}" to check all offers
2. Call get_area_market_stats with city="${property.city}" to check market context
3. Call detect_listing_anomalies to verify the property listing is legitimate

Then produce EXACTLY this JSON:
{
  "risk_score": <number 1-10 where 1=very low risk, 10=very high risk>,
  "risk_label": "<VERY LOW | LOW | MODERATE | HIGH | VERY HIGH>",
  "recommendation": "<ACCEPT | COUNTER | REJECT | CONSIDER>",
  "summary": "<2-3 sentence summary of the risk assessment>",
  "for_seller": {
    "verdict": "<STRONG OFFER | FAIR OFFER | BELOW MARKET | SUSPICIOUS>",
    "should_accept": <boolean>,
    "counter_price": <number or null — suggested counter-offer amount if applicable>,
    "reasoning": "<2-3 sentences explaining the verdict for the seller>"
  },
  "for_buyer": {
    "value_assessment": "<GREAT DEAL | FAIR PRICE | OVERPRICED>",
    "market_position": "<how this offer compares to market — 1-2 sentences>",
    "reasoning": "<2-3 sentences explaining the assessment for the buyer>"
  },
  "market_context": "<2-3 sentences about current market conditions in ${property.city ?? "this area"}>",
  "red_flags": ["<flag 1 if any>"],
  "positive_signals": ["<signal 1>", "<signal 2>"],
  "confidence_score": <number 0.0 to 1.0>
}`;

    try {
      const result = await runAgentWithTools(prompt, systemPrompt, offerRiskTools, { maxSteps: 5 });

      const cleaned = result.text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      // ── 4. Write risk score + recommendation to offers row ────
      const { error: updateErr } = await supabaseAdmin
        .from("offers")
        .update({
          ai_risk_score: parsed.risk_score ?? null,
          ai_recommendation: JSON.stringify({
            risk_label: parsed.risk_label,
            recommendation: parsed.recommendation,
            summary: parsed.summary,
            for_seller: parsed.for_seller,
            for_buyer: parsed.for_buyer,
            market_context: parsed.market_context,
            red_flags: parsed.red_flags,
            positive_signals: parsed.positive_signals,
            confidence_score: parsed.confidence_score,
          }),
        })
        .eq("id", offerId);

      if (updateErr) {
        logger.error("Failed to update offer with AI analysis", { updateErr });
        return { success: false, error: updateErr.message };
      }

      logger.log("Offer risk analysis complete", {
        offerId,
        riskScore: parsed.risk_score,
        recommendation: parsed.recommendation,
      });

      return { success: true, offerId, riskScore: parsed.risk_score, recommendation: parsed.recommendation };
    } catch (error) {
      logger.error("Offer risk analysis failed", { offerId, error });
      return { success: false, error: String(error) };
    }
  },
});
