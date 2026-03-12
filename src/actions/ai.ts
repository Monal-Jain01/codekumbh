"use server";

import { auth, tasks } from "@trigger.dev/sdk/v3";
import { generateAiResponse } from "@/trigger/ai";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { promptSchema } from "@/lib/schema";

export async function submitPrompt(formData: FormData) {
  // 1. Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  // 2. Zod validation
  const parsed = promptSchema.safeParse({ prompt: formData.get("prompt") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { prompt } = parsed.data;

  // 3. Create a pending row in the DB before triggering
  const { data: generation, error: dbError } = await supabaseAdmin
    .from("generations")
    .insert({ user_id: user.id, prompt, status: "pending" })
    .select("id")
    .single();

  if (dbError || !generation) return { error: "Failed to create generation record." };

  // 4. Trigger the background task
  const handle = await tasks.trigger<typeof generateAiResponse>("generate-ai-response", {
    prompt,
    userId: user.id,
    generationId: generation.id,
  });

  // 5. Create a scoped public token so the client can subscribe to this run
  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  });

  return { success: true, runId: handle.id, publicToken };
}
