"use server";

import { auth, tasks } from "@trigger.dev/sdk/v3";
import { processAgentChat } from "@/trigger/agent-chat";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_AGENTS = [
  "property-valuation",
  "investment-advisory",
  "market-intelligence",
  "offer-risk",
  "portfolio-optimization",
  "fraud-anomaly",
];

/**
 * Trigger an agent chat message as a background task.
 * Returns a taskId for the client to subscribe to via Supabase Realtime.
 */
export async function sendAgentMessage(
  agentId: string,
  message: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<
  { taskId: string; runId: string; publicToken: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  if (!message.trim()) return { error: "Message cannot be empty." };
  if (message.length > 2000) return { error: "Message too long (max 2000 chars)." };
  if (!VALID_AGENTS.includes(agentId)) return { error: "Unknown agent." };

  // 1. Create a pending task row in DB
  const { data: taskRow, error: dbError } = await supabaseAdmin
    .from("agent_tasks")
    .insert({
      user_id: user.id,
      agent_id: agentId,
      message,
      conversation_history: conversationHistory.slice(-10),
      status: "pending",
    })
    .select("id")
    .single();

  if (dbError || !taskRow) {
    console.error("DB Error creating agent task:", JSON.stringify(dbError, null, 2));
    return { error: `Failed to create agent task: ${dbError?.message ?? "Unknown DB error"}` };
  }

  // 2. Trigger background processing via Trigger.dev
  const handle = await tasks.trigger<typeof processAgentChat>(
    "process-agent-chat",
    {
      taskId: taskRow.id,
      agentId,
      message,
      userId: user.id,
      conversationHistory: conversationHistory.slice(-10),
    }
  );

  // 3. Create a public token so the client can track this specific run
  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  });

  return { taskId: taskRow.id, runId: handle.id, publicToken };
}
