import { logger, task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildStudioPrompt } from "@/lib/ai/studio-prompts";

/* ── Task ───────────────────────────────────────────────────────────────── */

export const processStudioImage = task({
  id: "process-studio-image",
  maxDuration: 180,

  run: async (payload: {
    /** ID of the property_images row to update */
    propertyImageId: string;
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
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      logger.error("REPLICATE_API_TOKEN not set");
      return { success: false, error: "REPLICATE_API_TOKEN not configured" };
    }

    // ── 2. Call Replicate API ──────────────────────────────────────────
    const { prompt, guidanceScale } = buildStudioPrompt(tool, { preset, removeText, replaceText });
    logger.log("Sending to Replicate", { prompt: prompt.slice(0, 80) });

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
          image: imageBase64,
          prompt,
          guidance_scale: guidanceScale,
          prompt_strength: tool === "enhance" ? 0.3 : 0.55,
          num_inference_steps: 30,
          width: 1024,
          height: 1024,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("Replicate error", { status: res.status, body: text.slice(0, 300) });
      return { success: false, error: `Replicate ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = await res.json();
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

    if (!outputUrl) {
      logger.error("No output from Replicate", data);
      return { success: false, error: data.error ?? "No output returned" };
    }

    logger.log("Replicate success — uploading to Supabase Storage");

    // ── 3. Download processed image and upload to Supabase Storage ─────
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      logger.error("Failed to download Replicate output", { status: imgRes.status });
      return { success: false, error: `Failed to download result: ${imgRes.status}` };
    }

    const processedBytes = Buffer.from(await imgRes.arrayBuffer());
    const storagePath    = `studio/${propertyImageId}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images")
      .upload(storagePath, processedBytes, {
        contentType:  "image/png",
        cacheControl: "3600",
        upsert:       true,
      });

    if (uploadError) {
      logger.error("Storage upload failed", { error: uploadError.message });
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("property-images")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    logger.log("Uploaded to Storage", { path: storagePath, url: publicUrl });

    // ── 4. Update property_images row ────────────────────────────────────
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
      return { success: false, error: updateError.message };
    }

    logger.log("Studio image processing complete", { propertyImageId, publicUrl });
    return { success: true, ai_processed_url: publicUrl, tool, preset };
  },
});
