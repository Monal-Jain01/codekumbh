"use server";

import { createClient } from "@/lib/supabase/server";
import { runAgentWithTools } from "@/lib/ai/config";
import {
  agentTools,
  offerRiskTools,
  portfolioTools,
  fraudDetectionTools,
} from "@/lib/ai/tools";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ToolSet } from "ai";

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  "property-valuation": `You are an expert Indian real estate valuation analyst AI with access to database tools.
You can search for comparable properties, get area market statistics, and calculate investment metrics.
ALWAYS use your tools to back up your analysis with real data from the database.
Provide detailed, data-driven property valuations. Format your responses with clear sections.
Use ₹ for Indian Rupee amounts. Be specific with numbers.
If tools return no data, mention that and provide your best estimate based on general knowledge.`,

  "investment-advisory": `You are an expert Indian real estate investment advisor AI with access to database tools.
You can search properties, analyze market stats, and calculate investment metrics like EMI, rental yield, and ROI.
ALWAYS use your tools to fetch real market data before giving recommendations.
Provide actionable investment advice with specific numbers. Consider risk tolerance, market conditions, and location dynamics.
Use ₹ for Indian Rupee amounts. Format with clear suggestions and reasoning.`,

  "market-intelligence": `You are an Indian real estate market intelligence AI with access to database tools.
You can search properties across cities, get market statistics, and analyze trends.
ALWAYS use your tools to pull real listing data and market metrics.
Provide data-driven market insights: price trends, supply/demand dynamics, micro-market analysis.
Use ₹ for Indian Rupee amounts. Be specific with statistics and comparisons.`,

  "offer-risk": `You are an AI-powered offer risk assessment specialist for Indian real estate.
You have access to tools that let you analyze property offers, compare against market data, and detect anomalies.
ALWAYS use your tools to fetch actual offer data and market stats before making risk assessments.
For each offer you analyze:
1. Compare the offer amount to asking price and market averages
2. Assess if the property listing has any anomalies (price outliers, suspicious data)
3. Evaluate the risk level (low/medium/high) with specific reasons
Use ₹ for Indian Rupee amounts. Be data-driven and specific.`,

  "portfolio-optimization": `You are an AI portfolio optimization agent for Indian real estate investors.
You have tools to analyze a user's portfolio, search comparable properties, and calculate investment metrics.
ALWAYS use your tools to fetch the user's actual portfolio data before advising.
Provide specific portfolio recommendations:
- Diversification analysis (city, property type)
- Underperforming or overweight positions
- Rebalancing suggestions with specific property types or locations
- ROI optimization and exit timing guidance
Use ₹ for Indian Rupee amounts. Be specific and actionable.`,

  "fraud-anomaly": `You are an AI fraud and anomaly detection specialist for Indian real estate listings.
You have tools to detect listing anomalies, compare prices against market data, and analyze offer patterns.
ALWAYS use your tools to run anomaly detection on properties before making assessments.
Flag potential red flags:
- Listings priced significantly above or below market (z-score analysis)
- Suspiciously small/large areas
- Unusual offer patterns
Rate risk as low/medium/high and explain your reasoning with data.`,
};

const AGENT_TOOL_MAP: Record<string, ToolSet> = {
  "property-valuation": agentTools,
  "investment-advisory": agentTools,
  "market-intelligence": agentTools,
  "offer-risk": offerRiskTools,
  "portfolio-optimization": portfolioTools,
  "fraud-anomaly": fraudDetectionTools,
};

export async function sendAgentMessage(
  agentId: string,
  message: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<{ response: string; toolsUsed: string[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (!message.trim()) return { error: "Message cannot be empty." };
  if (message.length > 2000) return { error: "Message too long (max 2000 chars)." };

  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
  const tools = AGENT_TOOL_MAP[agentId];
  if (!systemPrompt || !tools) return { error: "Unknown agent." };

  // Build context from conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  const contextBlock = recentHistory.length > 0
    ? `\n\nPrevious conversation:\n${recentHistory.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")}\n\n`
    : "";

  // For portfolio/offer agents, inject user_id so tools can fetch user-specific data
  const userContext =
    ["portfolio-optimization", "offer-risk"].includes(agentId)
      ? `\n[System context: Current user ID is "${user.id}". Use this to fetch user-specific data from tools.]\n`
      : "";

  const fullPrompt = `${contextBlock}${userContext}User: ${message}`;

  const startTime = Date.now();

  try {
    const result = await runAgentWithTools(
      fullPrompt,
      systemPrompt,
      tools,
      { maxSteps: 5 }
    );

    const latencyMs = Date.now() - startTime;
    const toolsUsed = result.toolCalls.map((tc) => tc.toolName);

    // Log to ai_agent_logs
    await supabaseAdmin.from("ai_agent_logs").insert({
      user_id: user.id,
      action_type: `agent_chat_${agentId}`,
      model_provider: "google",
      model_name: "gemini-2.5-flash",
      input_payload: { agentId, message, historyLength: recentHistory.length },
      output_payload: { response: result.text.slice(0, 500), toolsUsed },
      latency_ms: latencyMs,
      token_usage: Math.ceil(result.text.length / 4),
    });

    return { response: result.text, toolsUsed };
  } catch {
    return { error: "AI generation failed. Please try again." };
  }
}
