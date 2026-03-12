import { logger, task } from "@trigger.dev/sdk/v3";
import { runAgentWithTools } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { valuationTools } from "@/lib/ai/tools";

export const generatePropertyValuation = task({
  id: "generate-property-valuation",
  maxDuration: 180,
  run: async (payload: {
    propertyId: string;
    userId: string;
    propertyData: {
      title: string;
      property_type: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      area_sqft: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      year_built: number | null;
      lot_size: number | null;
      asking_price: number | null;
      description: string | null;
    };
  }) => {
    const { propertyId, userId, propertyData } = payload;
    const startTime = Date.now();
    logger.log("Starting AI property valuation with tool-calling", { propertyId, userId });

    const systemPrompt = `You are an expert Indian real estate valuation analyst AI with access to REAL DATABASE TOOLS.

IMPORTANT: You MUST use your tools before producing the final valuation. Follow these steps:
1. Call "search_comparable_properties" to find similar properties in ${propertyData.city ?? "the area"}
2. Call "get_area_market_stats" to understand the local market
3. Call "calculate_investment_metrics" to compute financial metrics
4. Call "get_property_context" if additional neighborhood data is available
5. Call "get_previous_valuations" to check for historical valuation trends

After using the tools and analyzing the results, produce your FINAL response as ONLY valid JSON (no markdown, no code fences) with this EXACT structure:
{
  "predicted_price": <number in INR - your best estimate of fair market value>,
  "price_range_low": <number in INR - conservative estimate>,
  "price_range_high": <number in INR - optimistic estimate>,
  "confidence_score": <number 0.0 to 1.0>,
  "reasoning": "<detailed 3-5 sentence reasoning incorporating data from tools>",
  "structured_factors": {
    "price_per_sqft": <number>,
    "market_comparison": "<2-3 sentences comparing to similar properties found via tools>",
    "location_analysis": "<2-3 sentences about location advantages/disadvantages>",
    "investment_score": <1-10>,
    "investment_reasoning": "<2-3 sentences about investment potential>",
    "risk_factors": ["<risk 1>", "<risk 2>", "<risk 3>"],
    "positive_factors": ["<positive 1>", "<positive 2>", "<positive 3>"],
    "recommendation": "<BUY | HOLD | OVERPRICED>",
    "recommendation_detail": "<2-3 sentences explaining recommendation>",
    "price_trend": "<APPRECIATING | STABLE | DEPRECIATING>",
    "roi_estimate_3yr": "<percentage string e.g. 15-25%>",
    "comparable_properties": "<describe comparable properties found via tools with prices>",
    "emi_estimate": "<monthly EMI string if calculable>",
    "rental_yield": "<annual yield percentage>"
  }
}`;

    const prompt = `Analyze this Indian property for valuation using your database tools:

Property ID: ${propertyId}
Property: ${propertyData.title}
Type: ${propertyData.property_type ?? "Unknown"}
Location: ${propertyData.address ?? ""}, ${propertyData.city ?? ""}, ${propertyData.state ?? ""}, ${propertyData.country ?? "India"}
Area: ${propertyData.area_sqft ?? "Unknown"} sq ft
Bedrooms: ${propertyData.bedrooms ?? "N/A"}
Bathrooms: ${propertyData.bathrooms ?? "N/A"}
Year Built: ${propertyData.year_built ?? "N/A"}
Lot Size: ${propertyData.lot_size ?? "N/A"} sq ft
Asking Price: ₹${propertyData.asking_price ? Number(propertyData.asking_price).toLocaleString("en-IN") : "Not specified"}
Description: ${propertyData.description ?? "None"}

FIRST use your tools to gather real data, THEN provide your final JSON valuation.`;

    // Use tool-calling generation — AI will invoke our Supabase-backed tools
    const agentResult = await runAgentWithTools(
      prompt,
      systemPrompt,
      valuationTools,
      { maxSteps: 8 }
    );

    const rawText = agentResult.text;
    const latencyMs = Date.now() - startTime;
    logger.log("AI agent completed", {
      length: rawText.length,
      latencyMs,
      steps: agentResult.steps,
      toolCallCount: agentResult.toolCalls.length,
      toolsUsed: agentResult.toolCalls.map((tc) => tc.toolName),
    });

    // Parse JSON from AI response (handle possible markdown fences)
    let parsed: Record<string, unknown>;
    try {
      const cleaned = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error("Failed to parse AI valuation JSON", { rawText: rawText.slice(0, 500) });
      parsed = {
        predicted_price: propertyData.asking_price ?? 0,
        price_range_low: 0,
        price_range_high: 0,
        confidence_score: 0.1,
        reasoning: "AI analysis could not be parsed. Please try again.",
        structured_factors: {
          risk_factors: ["AI analysis failed to parse"],
          positive_factors: [],
          recommendation: "HOLD",
          recommendation_detail: "Could not complete analysis.",
          price_trend: "STABLE",
          roi_estimate_3yr: "N/A",
        },
      };
    }

    // Save to ai_property_valuations table
    const { error: valError } = await supabaseAdmin
      .from("ai_property_valuations")
      .insert({
        property_id: propertyId,
        requested_by: userId,
        model_provider: "google",
        model_name: "gemini-2.5-flash",
        predicted_price: parsed.predicted_price ?? null,
        price_range_low: parsed.price_range_low ?? null,
        price_range_high: parsed.price_range_high ?? null,
        confidence_score: parsed.confidence_score ?? null,
        reasoning: parsed.reasoning ?? null,
        structured_factors: parsed.structured_factors ?? null,
        raw_prompt: { system: systemPrompt, user: prompt },
        raw_response: { text: rawText },
      });

    if (valError) {
      logger.error("Failed to save valuation to DB", { error: valError });
    } else {
      logger.log("Valuation saved to ai_property_valuations", { propertyId });
    }

    // Log to ai_agent_logs (including tool usage metadata)
    const toolsUsed = agentResult.toolCalls.map((tc) => tc.toolName);
    const { error: logError } = await supabaseAdmin
      .from("ai_agent_logs")
      .insert({
        user_id: userId,
        action_type: "property_valuation",
        model_provider: "google",
        model_name: "gemini-2.5-flash",
        input_payload: { propertyId, propertyData },
        output_payload: {
          ...parsed,
          toolsUsed,
          toolCallsCount: toolsUsed.length,
          agentSteps: agentResult.steps,
        },
        latency_ms: latencyMs,
        token_usage: Math.ceil(rawText.length / 4),
      });

    if (logError) {
      logger.error("Failed to log to ai_agent_logs", { error: logError });
    }

    return { valuation: parsed };
  },
});
