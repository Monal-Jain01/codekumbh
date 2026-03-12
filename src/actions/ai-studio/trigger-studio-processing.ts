"use server";

import { tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@/lib/supabase/server";
import type { processStudioImage } from "@/trigger/process-studio-image";

/**
 * Fires the background `process-studio-image` Trigger.dev task.
 * Called from the AI Studio "Save to Gallery" flow.
 * Returns the Trigger.dev run ID so the client can poll for progress.
 */
export async function triggerStudioProcessing(input: {
  propertyImageId: string;
  imageBase64: string;
  tool: string;
  preset?: string;
  removeText?: string;
  replaceText?: string;
}): Promise<{ runId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the image belongs to the authenticated user
  const { data: img } = await supabase
    .from("property_images")
    .select("id, property_id, properties:property_id(owner_id)")
    .eq("id", input.propertyImageId)
    .single();

  if (!img) return { error: "Image not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (img as any).properties?.owner_id ?? null;
  if (ownerId !== user.id) return { error: "Not authorised" };

  try {
    const handle = await tasks.trigger<typeof processStudioImage>(
      "process-studio-image",
      {
        propertyImageId: input.propertyImageId,
        imageBase64:     input.imageBase64,
        tool:            input.tool,
        preset:          input.preset,
        removeText:      input.removeText,
        replaceText:     input.replaceText,
      },
    );
    return { runId: handle.id };
  } catch (err) {
    return { error: String(err) };
  }
}
