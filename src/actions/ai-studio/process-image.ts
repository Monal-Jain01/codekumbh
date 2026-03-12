"use server";

import type { StudioTool } from "@/components/ai-studio/types";
import { buildStudioPrompt } from "@/lib/ai/studio-prompts";

/* ── Server Action — instant AI preview via Replicate ──────────────────── */

export async function processImageWithAI(input: {
  /** Base64-encoded image: "data:image/jpeg;base64,..." */
  imageBase64: string;
  tool: StudioTool;
  preset?: string;
  removeText?: string;
  replaceText?: string;
}): Promise<
  | { success: true; outputBase64: string }
  | { success: false; error: string }
> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return {
      success: false,
      error: "REPLICATE_API_TOKEN not set — add it to .env.local",
    };
  }

  const { prompt, guidanceScale } = buildStudioPrompt(input.tool, {
    preset:      input.preset,
    removeText:  input.removeText,
    replaceText: input.replaceText,
  });

  try {
    // Replicate sync mode (Prefer: wait) — returns result in one call
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        input: {
          image: input.imageBase64,
          prompt,
          guidance_scale: guidanceScale,
          prompt_strength: input.tool === "enhance" ? 0.3 : 0.55,
          num_inference_steps: 30,
          width: 1024,
          height: 1024,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        error: `Replicate ${res.status}: ${text.slice(0, 300)}`,
      };
    }

    const data = await res.json();

    // Replicate returns output as an array of URLs or a single URL
    const outputUrl =
      Array.isArray(data.output) ? data.output[0] : data.output;

    if (!outputUrl) {
      return {
        success: false,
        error: data.error ?? "No output returned from Replicate",
      };
    }

    // Fetch the output image and convert to base64 for the client
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      return {
        success: false,
        error: `Failed to download result image: ${imgRes.status}`,
      };
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const b64 = imgBuffer.toString("base64");

    return {
      success: true,
      outputBase64: `data:image/png;base64,${b64}`,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
