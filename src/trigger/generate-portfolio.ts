import { logger, task } from "@trigger.dev/sdk/v3";
import { runAgentWithTools } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { portfolioTools } from "@/lib/ai/tools";

/**
 * Generates or regenerates a user's AI portfolio.
 * Triggered after onboarding completion and after a property is listed.
 * Writes to `portfolios` and `portfolio_assets` tables.
 */
export const generatePortfolio = task({
  id: "generate-portfolio",
  maxDuration: 180,
  run: async (payload: {
    userId: string;
    trigger: "onboarding" | "property_listed" | "manual";
  }) => {
    const { userId, trigger } = payload;
    const startTime = Date.now();
    logger.log("Starting portfolio generation", { userId, trigger });

    // ── 1. Fetch user profile ─────────────────────────────────────
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, investment_budget, risk_tolerance, user_type")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      logger.error("Profile not found", { userId, profileErr });
      return { success: false, error: "Profile not found" };
    }

    // ── 2. Fetch user's owned properties ──────────────────────────
    const { data: properties } = await supabaseAdmin
      .from("properties")
      .select("id, title, property_type, city, state, area_sqft, asking_price, status, created_at, bedrooms, bathrooms")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const ownedProperties = properties ?? [];

    // ── 3. Fetch latest AI valuations for each property ───────────
    const valuationMap: Record<string, { predicted_price: number; confidence_score: number; reasoning: string }> = {};
    if (ownedProperties.length > 0) {
      const propIds = ownedProperties.map((p) => p.id);
      for (const propId of propIds) {
        const { data: val } = await supabaseAdmin
          .from("ai_property_valuations")
          .select("predicted_price, confidence_score, reasoning")
          .eq("property_id", propId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (val) valuationMap[propId] = val as { predicted_price: number; confidence_score: number; reasoning: string };
      }
    }

    // ── 4. Calculate totals ───────────────────────────────────────
    const totalInvested = ownedProperties.reduce(
      (sum, p) => sum + (Number(p.asking_price) || 0),
      0
    );
    const totalAiValue = ownedProperties.reduce(
      (sum, p) => sum + (valuationMap[p.id]?.predicted_price || Number(p.asking_price) || 0),
      0
    );

    // ── 5. Upsert portfolio row with "generating" status ─────────
    let portfolioId: string;
    const { data: existingPortfolio } = await supabaseAdmin
      .from("portfolios")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingPortfolio) {
      portfolioId = existingPortfolio.id;
      await supabaseAdmin
        .from("portfolios")
        .update({
          status: "generating",
          total_invested: totalInvested,
          projected_value: totalAiValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", portfolioId);
    } else {
      const { data: newPortfolio, error: insertErr } = await supabaseAdmin
        .from("portfolios")
        .insert({
          user_id: userId,
          name: `${profile.full_name ?? "My"} Portfolio`,
          total_invested: totalInvested,
          projected_value: totalAiValue,
          status: "generating",
        })
        .select("id")
        .single();

      if (insertErr || !newPortfolio) {
        logger.error("Failed to create portfolio row", { insertErr });
        return { success: false, error: "Failed to create portfolio" };
      }
      portfolioId = newPortfolio.id;
    }

    // ── 6. Build AI prompt ────────────────────────────────────────
    const propertiesSummary = ownedProperties.map((p) => {
      const val = valuationMap[p.id];
      return `- ${p.title} (${p.property_type ?? "unknown"}) in ${p.city ?? "Unknown"}, ${p.state ?? ""} | ${p.area_sqft ?? "?"} sqft | Asking: ₹${Number(p.asking_price).toLocaleString("en-IN")}${val ? ` | AI Value: ₹${Number(val.predicted_price).toLocaleString("en-IN")} (${Math.round(val.confidence_score * 100)}% confidence)` : ""}`;
    }).join("\n");

    const systemPrompt = `You are an expert Indian real estate portfolio analyst AI with access to real market data tools.
You MUST use your tools to gather real market data before generating the portfolio analysis.
Use get_portfolio_summary, get_area_market_stats, and calculate_investment_metrics to back up your analysis with real data.
Always respond in ONLY valid JSON (no markdown, no code fences).`;

    const prompt = `Analyze this Indian real estate investor's portfolio and generate a comprehensive portfolio report.

USER PROFILE:
- Name: ${profile.full_name ?? "User"}
- Investment Budget: ₹${Number(profile.investment_budget || 0).toLocaleString("en-IN")}
- Risk Tolerance: ${profile.risk_tolerance ?? "MEDIUM"}
- User Type: ${profile.user_type ?? "buyer"}

OWNED PROPERTIES (${ownedProperties.length}):
${ownedProperties.length > 0 ? propertiesSummary : "No properties listed yet."}

PORTFOLIO METRICS:
- Total Invested: ₹${totalInvested.toLocaleString("en-IN")}
- AI Estimated Value: ₹${totalAiValue.toLocaleString("en-IN")}
- Paper Gain/Loss: ₹${(totalAiValue - totalInvested).toLocaleString("en-IN")}

Use your tools (get_area_market_stats, calculate_investment_metrics, etc.) to enrich this with real market data, then produce this EXACT JSON structure:
{
  "portfolio_name": "<creative name for the portfolio based on their focus>",
  "ai_summary": "<150-200 word executive summary of the portfolio — health, diversification, outlook>",
  "total_invested": <number>,
  "projected_value": <number — realistic 3-year projected value>,
  "projected_roi": <number — ROI percentage over 3 years>,
  "diversification_score": <1-10>,
  "risk_level": "<CONSERVATIVE | BALANCED | AGGRESSIVE>",
  "overall_health": "<EXCELLENT | GOOD | FAIR | NEEDS_ATTENTION>",
  "city_distribution": {"<city>": <count>, ...},
  "type_distribution": {"<property_type>": <count>, ...},
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": [
    {
      "title": "<short action title>",
      "description": "<2-3 sentence actionable recommendation>",
      "priority": "<HIGH | MEDIUM | LOW>",
      "type": "<BUY | SELL | HOLD | DIVERSIFY | RENOVATE>"
    }
  ],
  "market_outlook": "<3-4 sentence outlook for the markets where the user has properties>",
  "assets": [
    {
      "property_id": "<id from the list above>",
      "roi_estimate": <number — estimated ROI% for this specific property over 3 years>,
      "risk_level": "<LOW | MEDIUM | HIGH>",
      "ai_notes": "<2-3 sentence insight about this specific asset>",
      "projected_current_value": <number — current fair market value estimate>
    }
  ]
}`;

    try {
      // ── 7. Run AI agent with portfolio tools ──────────────────
      const result = await runAgentWithTools(prompt, systemPrompt, portfolioTools, { maxSteps: 5 });

      const cleaned = result.text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      // ── 8. Update portfolio with AI results ───────────────────
      await supabaseAdmin
        .from("portfolios")
        .update({
          name: parsed.portfolio_name ?? `${profile.full_name ?? "My"} Portfolio`,
          total_invested: parsed.total_invested ?? totalInvested,
          projected_value: parsed.projected_value ?? totalAiValue,
          projected_roi: parsed.projected_roi ?? null,
          ai_summary: parsed.ai_summary ?? null,
          ai_analysis: {
            diversification_score: parsed.diversification_score,
            risk_level: parsed.risk_level,
            overall_health: parsed.overall_health,
            city_distribution: parsed.city_distribution,
            type_distribution: parsed.type_distribution,
            strengths: parsed.strengths,
            weaknesses: parsed.weaknesses,
            recommendations: parsed.recommendations,
            market_outlook: parsed.market_outlook,
            tool_calls_used: result.toolCalls.map((tc) => tc.toolName),
          },
          status: "ready",
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", portfolioId);

      // ── 9. Upsert per-asset rows ──────────────────────────────
      const assets: Array<{ portfolio_id: string; property_id: string; purchase_price: number | null; purchase_date: string | null; projected_current_value: number | null; roi_estimate: number | null; risk_level: string | null; ai_notes: string | null; current_value_updated_at: string }> = [];

      for (const prop of ownedProperties) {
        const assetAnalysis = (parsed.assets ?? []).find(
          (a: { property_id: string }) => a.property_id === prop.id
        );
        assets.push({
          portfolio_id: portfolioId,
          property_id: prop.id,
          purchase_price: Number(prop.asking_price) || null,
          purchase_date: prop.created_at ? prop.created_at.slice(0, 10) : null,
          projected_current_value: assetAnalysis?.projected_current_value ?? valuationMap[prop.id]?.predicted_price ?? Number(prop.asking_price) ?? null,
          roi_estimate: assetAnalysis?.roi_estimate ?? null,
          risk_level: assetAnalysis?.risk_level ?? null,
          ai_notes: assetAnalysis?.ai_notes ?? null,
          current_value_updated_at: new Date().toISOString(),
        });
      }

      if (assets.length > 0) {
        // Delete old assets for this portfolio then re-insert
        await supabaseAdmin
          .from("portfolio_assets")
          .delete()
          .eq("portfolio_id", portfolioId);

        await supabaseAdmin
          .from("portfolio_assets")
          .insert(assets);
      }

      logger.log("Portfolio generated", {
        userId,
        portfolioId,
        properties: ownedProperties.length,
        latencyMs: Date.now() - startTime,
      });

      return { success: true, portfolioId, trigger };
    } catch (error) {
      logger.error("Portfolio generation failed", { userId, error });

      // Mark as failed so UI can show retry
      await supabaseAdmin
        .from("portfolios")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", portfolioId);

      return { success: false, error: String(error) };
    }
  },
});
