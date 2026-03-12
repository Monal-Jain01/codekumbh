import { z } from "zod";

export const promptSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(2000, "Prompt is too long (max 2000 chars)"),
});

export type PromptInput = z.infer<typeof promptSchema>;

// ── Database row type — mirrors the `generations` table ──
export type Generation = {
  id: string;
  user_id: string;
  prompt: string;
  result: string | null;
  status: "pending" | "completed" | "failed";
  created_at: string;
};
