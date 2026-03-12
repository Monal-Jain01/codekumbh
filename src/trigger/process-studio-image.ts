import { logger, task } from "@trigger.dev/sdk/v3";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildStudioPrompt, getReplicateModel } from "@/lib/ai/studio-prompts";

/* ── Task ───────────────────────────────────────────────────────────────── */

export const processStudioImage = task({
  id: "process-studio-image",
  maxDuration: 180,

  run: async (payload: {
    /** If set, persist result to Supabase Storage + update the DB row */
    propertyImageId?: string;
    /** Base64 encoded image: "data:image/jpeg;base64,..." */
    imageBase64: string;
    tool: string;
    preset?: string;
    removeText?: string;
    replaceText?: string;
  }) => {
    const { propertyImageId, imageBase64, tool, preset, removeText, replaceText } = payload;
    logger.log("Starting AI Studio image processing", { propertyImageId, tool, preset });

    // ── 1. Validate API token ──────────────────────────────────────────
    if (!process.env.REPLICATE_API_TOKEN) {
      logger.error("REPLICATE_API_TOKEN not set");
      return { success: false as const, error: "REPLICATE_API_TOKEN not configured" };
    }

    // ── 2. Call Replicate API via SDK ──────────────────────────────────
    const { prompt } = buildStudioPrompt(tool, { preset, removeText, replaceText });
    logger.log("Sending to Replicate", { model: getReplicateModel(), prompt: prompt.slice(0, 80) });

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const replicateOutput = await replicate.run(getReplicateModel(), {
      input: {
        prompt,
        input_images:     [imageBase64],   // array, not image_prompt
        aspect_ratio:     "match_input_image",
        output_format:    "jpg",
        output_quality:   90,
        safety_tolerance: 2,
      },
    });

    // Model output schema: { type: "string", format: "uri" } — a single URL
    const rawOutput = replicateOutput as unknown;
    const outputUrl = typeof rawOutput === "string" ? rawOutput : null;

    if (!outputUrl) {
      logger.error("No output from Replicate", { rawOutput });
      return { success: false as const, error: "No output returned from Replicate" };
    }

    logger.log("Replicate success", { outputUrl: outputUrl.slice(0, 80) });

    // ── 3. Download processed image ─────────────────────────────────────
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      logger.error("Failed to download Replicate output", { status: imgRes.status });
      return { success: false as const, error: `Failed to download result: ${imgRes.status}` };
    }

    const processedBytes = Buffer.from(await imgRes.arrayBuffer());

    // ── 4. If no DB row, return base64 directly (preview-only mode) ────
    if (!propertyImageId) {
      const b64 = processedBytes.toString("base64");
      logger.log("Preview-only mode — returning base64");
      return { success: true as const, outputBase64: `data:image/png;base64,${b64}`, tool, preset };
    }

    // ── 5. Upload to Supabase Storage ──────────────────────────────────
    logger.log("Uploading to Supabase Storage");
    const storagePath = `studio/${propertyImageId}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images")
      .upload(storagePath, processedBytes, {
        contentType:  "image/png",
        cacheControl: "3600",
        upsert:       true,
      });

    if (uploadError) {
      logger.error("Storage upload failed", { error: uploadError.message });
      return { success: false as const, error: uploadError.message };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("property-images")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    logger.log("Uploaded to Storage", { path: storagePath, url: publicUrl });

    // ── 6. Update property_images row ──────────────────────────────────
    const appliedEffect = { tool, preset: preset ?? null, removeText: removeText ?? null, replaceText: replaceText ?? null };

    const { error: updateError } = await supabaseAdmin
      .from("property_images")
      .update({
        ai_processed_url: publicUrl,
        ai_applied_effect: appliedEffect,
      })
      .eq("id", propertyImageId);

    if (updateError) {
      logger.error("DB update failed", { error: updateError.message });
      return { success: false as const, error: updateError.message };
    }

    // Return base64 for instant client preview + public URL for persistence
    const b64 = processedBytes.toString("base64");
    logger.log("Studio image processing complete", { propertyImageId, publicUrl });
    return {
      success: true as const,
      outputBase64: `data:image/png;base64,${b64}`,
      ai_processed_url: publicUrl,
      tool,
      preset,
    };
  },
});
