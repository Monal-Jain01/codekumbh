import { logger, task } from "@trigger.dev/sdk/v3";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildStudioPrompt, getReplicateModel } from "@/lib/ai/studio-prompts";

/* ── Provider helpers ────────────────────────────────────────────────────── */

/** Replicate: flux-2-pro image-to-image. Returns raw bytes. */
async function callReplicate(prompt: string, imageBase64: string): Promise<Buffer> {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN not set");

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const output = await replicate.run(getReplicateModel(), {
    input: {
      prompt,
      input_images:     [imageBase64],
      aspect_ratio:     "match_input_image",
      output_format:    "jpg",
      output_quality:   90,
      safety_tolerance: 2,
    },
  });

  const rawUrl = Array.isArray(output as unknown) ? (output as unknown[])[0] : output;
  if (typeof rawUrl !== "string") throw new Error("Replicate returned no URL");

  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error(`Replicate download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** fal.ai: flux-pro/kontext/max image editing via direct REST API. Returns raw bytes. */
async function callFal(prompt: string, imageBase64: string): Promise<Buffer> {
  const apiKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY not set");

  const res = await fetch("https://fal.run/fal-ai/flux-pro/kontext/max", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: imageBase64,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`fal.ai ${res.status}: ${body}`);
  }

  const json = await res.json();
  const url = json.images?.[0]?.url;
  if (typeof url !== "string") throw new Error("fal.ai returned no image URL");

  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`fal.ai download failed: ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("throttled");
}

/* ── Task ────────────────────────────────────────────────────────────────── */

export const processStudioImage = task({
  id: "process-studio-image",
  maxDuration: 180,
  // Only retry if ALL providers fail
  retry: { maxAttempts: 2, minTimeoutInMs: 3000, maxTimeoutInMs: 10_000 },

  run: async (payload: {
    propertyImageId?: string;
    imageBase64: string;
    tool: string;
    preset?: string;
    removeText?: string;
    replaceText?: string;
  }) => {
    const { propertyImageId, imageBase64, tool, preset, removeText, replaceText } = payload;
    logger.log("Starting AI Studio processing", { propertyImageId, tool, preset });

    const { prompt } = buildStudioPrompt(tool, { preset, removeText, replaceText });

    // ── 1. Run image through AI (Replicate → fal.ai fallback) ────────────
    let processedBytes: Buffer;
    let provider = "replicate";

    try {
      logger.log("Trying Replicate…", { prompt: prompt.slice(0, 60) });
      processedBytes = await callReplicate(prompt, imageBase64);
      logger.log("Replicate success");
    } catch (replicateErr) {
      const msg = replicateErr instanceof Error ? replicateErr.message : String(replicateErr);
      if (isRateLimit(replicateErr)) {
        logger.warn("Replicate rate-limited — falling back to fal.ai");
      } else {
        logger.warn("Replicate failed — falling back to fal.ai", { error: msg });
      }

      try {
        logger.log("Trying fal.ai…", { model: "flux-pro/kontext/max" });
        processedBytes = await callFal(prompt, imageBase64);
        provider = "fal";
        logger.log("fal.ai success");
      } catch (falErr) {
        const falMsg = falErr instanceof Error ? falErr.message : String(falErr);
        logger.error("All providers failed", { replicateErr: msg, falErr: falMsg });
        // Throw → Trigger.dev retry kicks in
        throw new Error(`All AI providers failed. Replicate: ${msg}. Fal: ${falMsg}`);
      }
    }

    logger.log("Image generated", { provider, bytes: processedBytes.length });

    // ── 2. Preview-only mode (no DB row) ─────────────────────────────────
    if (!propertyImageId) {
      const b64 = processedBytes.toString("base64");
      return { success: true as const, outputBase64: `data:image/jpeg;base64,${b64}`, tool, preset, provider };
    }

    // ── 3. Upload to Supabase Storage ─────────────────────────────────────
    const storagePath = `studio/${propertyImageId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images")
      .upload(storagePath, processedBytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      logger.error("Storage upload failed", { error: uploadError.message });
      return { success: false as const, error: uploadError.message };
    }

    const { data: urlData } = supabaseAdmin.storage.from("property-images").getPublicUrl(storagePath);
    logger.log("Uploaded to Storage", { path: storagePath });

    // ── 4. Update property_images row ─────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from("property_images")
      .update({
        ai_processed_url:  urlData.publicUrl,
        ai_applied_effect: { tool, preset: preset ?? null, removeText: removeText ?? null, replaceText: replaceText ?? null },
      })
      .eq("id", propertyImageId);

    if (updateError) {
      logger.error("DB update failed", { error: updateError.message });
      return { success: false as const, error: updateError.message };
    }

    const b64 = processedBytes.toString("base64");
    logger.log("Studio processing complete", { propertyImageId, provider, publicUrl: urlData.publicUrl });
    return {
      success:          true as const,
      outputBase64:     `data:image/jpeg;base64,${b64}`,
      ai_processed_url: urlData.publicUrl,
      tool,
      preset,
      provider,
    };
  },
});
