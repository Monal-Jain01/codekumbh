import { logger, task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* ── Prompt builders (same as process-image action) ─────────────────────── */

const STAGE_STYLES: Record<string, string> = {
  modern:       "modern contemporary interior, clean lines, neutral palette, sleek furniture, minimalist",
  coastal:      "coastal beach house interior, light blues, sandy whites, rattan and natural textures",
  scandinavian: "scandinavian interior, light birch wood, white walls, cozy hygge textiles",
  industrial:   "industrial loft interior, exposed concrete, metal-frame furniture, Edison lighting",
  luxury:       "luxury interior, marble surfaces, velvet upholstery, gold fixtures, opulent decor",
  minimal:      "minimalist zen interior, all-white, very sparse furniture, open empty floor",
};

const ENHANCE_STYLES: Record<string, string> = {
  crisp:     "sharp crisp interior photography, high edge definition, noise reduction, crystal detail",
  warm:      "warm golden-hour interior, sun streaming through windows, amber glow",
  cool:      "cool bright daylight interior, blue-white light, fresh airy atmosphere",
  vibrant:   "vibrant interior, rich bold saturated colours, high contrast, striking",
  hdr:       "HDR interior photography, balanced highlights and shadows, wide tonal range",
  cinematic: "cinematic interior, film grain, muted highlights, deep contrast, warm shadows",
};

const ORGANISE_LAYOUTS: Record<string, string> = {
  "open-flow":    "open plan layout, furniture along walls, clear central walkways",
  "cozy-corner":  "cozy reading nook, armchair by window, floor lamp, intimate corner",
  "dining-focus": "dining room centred layout, table as focal point, chairs arranged neatly",
  "work-home":    "home office setup, desk by window, bookshelves, ergonomic workspace",
  entertainment:  "entertainment living room, large sofa facing TV unit, ambient lighting",
  zen:            "zen minimal space, floor cushions, indoor plants, low-profile furniture",
};

function buildPrompt(
  tool: string,
  opts: { preset?: string; removeText?: string; replaceText?: string },
): { prompt: string; fidelity: number } {
  const base = "professional interior design photography, photorealistic, high quality";
  switch (tool) {
    case "stage":
      return {
        prompt: `${STAGE_STYLES[opts.preset ?? "modern"] ?? STAGE_STYLES.modern}, ${base}`,
        fidelity: 0.45,
      };
    case "objects":
      return {
        prompt: [
          opts.removeText && `remove the ${opts.removeText} completely`,
          opts.replaceText && `add ${opts.replaceText} in its place naturally`,
          "seamless believable result", base,
        ].filter(Boolean).join(", "),
        fidelity: 0.60,
      };
    case "organise":
      return {
        prompt: `${ORGANISE_LAYOUTS[opts.preset ?? "open-flow"] ?? ORGANISE_LAYOUTS["open-flow"]}, ${base}`,
        fidelity: 0.50,
      };
    case "enhance":
      return {
        prompt: `${ENHANCE_STYLES[opts.preset ?? "crisp"] ?? ENHANCE_STYLES.crisp}, ${base}`,
        fidelity: 0.75,
      };
    default:
      return { prompt: base, fidelity: 0.5 };
  }
}

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

    // ── 1. Validate API key ──────────────────────────────────────────────
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      logger.error("STABILITY_API_KEY not set");
      return { success: false, error: "STABILITY_API_KEY not configured" };
    }

    // ── 2. Call Stability AI ─────────────────────────────────────────────
    const { prompt, fidelity } = buildPrompt(tool, { preset, removeText, replaceText });
    logger.log("Sending to Stability AI", { prompt: prompt.slice(0, 80) });

    const rawBase64  = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Buffer.from(rawBase64, "base64");

    const form = new FormData();
    form.append("image",        new Blob([imageBytes], { type: "image/jpeg" }), "input.jpg");
    form.append("prompt",       prompt);
    form.append("fidelity",     String(fidelity));
    form.append("output_format","jpeg");

    const res = await fetch(
      "https://api.stability.ai/v2beta/stable-image/control/style",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        body: form,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("Stability AI error", { status: res.status, body: text.slice(0, 200) });
      return { success: false, error: `Stability AI ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    if (!data.image) {
      logger.error("No image in response", data);
      return { success: false, error: data.message ?? "No image returned" };
    }

    logger.log("Stability AI success — uploading to Supabase Storage");

    // ── 3. Upload processed image to Supabase Storage ────────────────────
    const processedBytes = Buffer.from(data.image, "base64");
    const storagePath    = `studio/${propertyImageId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images")
      .upload(storagePath, processedBytes, {
        contentType:  "image/jpeg",
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

    logger.log("✅ Studio image processing complete", { propertyImageId, publicUrl });
    return { success: true, ai_processed_url: publicUrl, tool, preset };
  },
});
