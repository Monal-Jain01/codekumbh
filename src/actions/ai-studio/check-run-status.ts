"use server";

import { runs } from "@trigger.dev/sdk/v3";
import type { processStudioImage } from "@/trigger/process-studio-image";

type RunOutput = {
  status: "PENDING" | "EXECUTING" | "COMPLETED" | "FAILED" | "CANCELED" | string;
  output?: { success: boolean; outputBase64?: string; error?: string };
  error?: string;
};

/** Polls a single run status — call this repeatedly from the client. */
export async function checkRunStatus(runId: string): Promise<RunOutput> {
  try {
    const run = await runs.retrieve<typeof processStudioImage>(runId);
    return {
      status: run.status,
      output: run.output as RunOutput["output"],
    };
  } catch (err) {
    return { status: "FAILED", error: String(err) };
  }
}
