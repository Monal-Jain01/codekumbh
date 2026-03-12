"use server";

import { processStudioImage } from "@/trigger/process-studio-image";
import type { StudioTool } from "@/components/ai-studio/types";

/** Triggers the AI Studio Trigger.dev task and returns the run ID. */
export async function triggerStudioTask(input: {
  imageBase64: string;
  tool: StudioTool;
  preset?: string;
  removeText?: string;
  replaceText?: string;
  propertyImageId?: string;
}): Promise<{ runId: string } | { error: string }> {
  try {
    const handle = await processStudioImage.trigger({
      propertyImageId: input.propertyImageId,
      imageBase64:     input.imageBase64,
      tool:            input.tool,
      preset:          input.preset,
      removeText:      input.removeText,
      replaceText:     input.replaceText,
    });
    return { runId: handle.id };
  } catch (err) {
    return { error: String(err) };
  }
}
