import { logger, task } from "@trigger.dev/sdk/v3";
import { runAgentWithTools } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  agentTools,
  offerRiskTools,
  portfolioTools,
  fraudDetectionTools,
} from "@/lib/ai/tools";
import type { ToolSet } from "ai";

// ── Agent system prompts ─────────────────────────────────────────────
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

// ── Trigger.dev task ─────────────────────────────────────────────────
export const processAgentChat = task({
  id: "process-agent-chat",
  maxDuration: 120,
  run: async (payload: {
    taskId: string;
    agentId: string;
    message: string;
    userId: string;
    conversationHistory: { role: "user" | "assistant"; content: string }[];
  }) => {
    const { taskId, agentId, message, userId, conversationHistory } = payload;
    const startTime = Date.now();

    logger.log("Agent chat task started", { taskId, agentId, userId });

    // 1. Mark as processing in DB
    await supabaseAdmin
      .from("agent_tasks")
      .update({ status: "processing" })
      .eq("id", taskId);

    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
    const tools = AGENT_TOOL_MAP[agentId];

    if (!systemPrompt || !tools) {
      await supabaseAdmin
        .from("agent_tasks")
        .update({
          status: "failed",
          response: "Unknown agent type.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      return { success: false, error: "Unknown agent" };
    }

    // 2. Build prompt with conversation context
    const recentHistory = conversationHistory.slice(-10);
    const contextBlock =
      recentHistory.length > 0
        ? `\n\nPrevious conversation:\n${recentHistory
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n")}\n\n`
        : "";

    const userContext = ["portfolio-optimization", "offer-risk"].includes(agentId)
      ? `\n[System context: Current user ID is "${userId}". Use this to fetch user-specific data from tools.]\n`
      : "";

    const fullPrompt = `${contextBlock}${userContext}User: ${message}`;

    try {
      // 3. Run AI agent with tools (the actual heavy lifting)
      const result = await runAgentWithTools(fullPrompt, systemPrompt, tools, {
        maxSteps: 6,
      });

      const latencyMs = Date.now() - startTime;
      const toolsUsed = result.toolCalls.map((tc) => tc.toolName);

      logger.log("Agent completed", {
        taskId,
        toolsUsed,
        steps: result.steps,
        latencyMs,
      });

      // 4. Save completed response to DB (triggers Supabase Realtime)
      await supabaseAdmin
        .from("agent_tasks")
        .update({
          status: "completed",
          response: result.text,
          tools_used: toolsUsed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      // 5. Log to ai_agent_logs
      await supabaseAdmin.from("ai_agent_logs").insert({
        user_id: userId,
        action_type: `agent_chat_${agentId}`,
        model_provider: "google",
        model_name: "gemini-2.5-flash",
        input_payload: { agentId, message, historyLength: recentHistory.length },
        output_payload: {
          response: result.text.slice(0, 500),
          toolsUsed,
          toolCallsCount: toolsUsed.length,
          agentSteps: result.steps,
        },
        latency_ms: latencyMs,
        token_usage: Math.ceil(result.text.length / 4),
      });

      return { success: true, taskId, toolsUsed };
    } catch (error) {
      logger.error("Agent chat failed", { taskId, error });

      // Mark failed in DB (also triggers Realtime)
      await supabaseAdmin
        .from("agent_tasks")
        .update({
          status: "failed",
          response: "AI agent encountered an error. Please try again.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      return { success: false, taskId, error: String(error) };
    }
  },
});
