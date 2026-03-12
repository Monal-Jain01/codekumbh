import { logger, task } from "@trigger.dev/sdk/v3";
import { runBackgroundAgent } from "@/lib/ai/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const generateAiResponse = task({
  id: "generate-ai-response",
  maxDuration: 300,
  run: async (payload: { prompt: string; userId: string; generationId: string }) => {
    logger.log("Generating AI response", { prompt: payload.prompt, userId: payload.userId });

    const text = await runBackgroundAgent(payload.prompt);

    // Persist the result to the DB
    const { error } = await supabaseAdmin
      .from("generations")
      .update({ result: text, status: "completed" })
      .eq("id", payload.generationId);

    if (error) logger.error("Failed to save generation to DB", { error });

    logger.log("AI response saved", { generationId: payload.generationId });

    return { text };
  },
});
