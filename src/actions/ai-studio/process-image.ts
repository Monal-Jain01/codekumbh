"use server";

import type { StudioTool } from "@/components/ai-studio/types";

/* ── Prompt builder ─────────────────────────────────────────────────────── */

const STAGE_STYLES: Record<string, string> = {
  modern:       "modern contemporary interior, clean lines, neutral palette, sleek furniture, minimalist",
  coastal:      "coastal beach house interior, light blues, sandy whites, rattan and natural textures",
  scandinavian: "scandinavian interior, light birch wood, white walls, cozy hygge textiles",
  industrial:   "industrial loft interior, exposed concrete, metal-frame furniture, Edison lighting",
  luxury:       "luxury interior, marble surfaces, velvet upholstery, gold fixtures, opulent decor",
  minimal:      "minimalist zen interior, all-white, very sparse furniture, open empty floor",
};

const ORGANISE_LAYOUTS: Record<string, string> = {
  "open-flow":    "open plan layout, furniture along walls, clear central walkways, maximised floor space",
  "cozy-corner":  "cozy reading nook, armchair by window, floor lamp, intimate corner seating",
  "dining-focus": "dining room centred layout, table as focal point, chairs arranged neatly",
  "work-home":    "home office setup, desk by window, bookshelves, ergonomic workspace",
  entertainment:  "entertainment living room, large sofa facing TV unit, side tables, ambient lighting",
  zen:            "zen minimal space, floor cushions, indoor plants, low-profile furniture, calm",
};

const ENHANCE_STYLES: Record<string, string> = {
  crisp:     "sharp crisp interior photography, high edge definition, noise reduction, crystal detail",
  warm:      "warm golden-hour interior, sun streaming through windows, amber glow",
  cool:      "cool bright daylight interior, blue-white light, fresh airy atmosphere",
  vibrant:   "vibrant interior, rich bold saturated colours, high contrast, striking",
  hdr:       "HDR interior photography, balanced highlights and shadows, wide tonal range",
  cinematic: "cinematic interior, film grain, muted highlights, deep contrast, warm shadows",
};

function buildPrompt(
  tool: StudioTool,
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
          "seamless believable result",
          base,
        ]
          .filter(Boolean)
          .join(", "),
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
        fidelity: 0.75, // high — just improve quality, not change style
      };

    default:
      return { prompt: base, fidelity: 0.5 };
  }
}

/* ── Server Action ─────────────────────────────────────────────────────── */

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
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "STABILITY_API_KEY not set — add it to .env.local",
    };
  }

  const { prompt, fidelity } = buildPrompt(input.tool, {
    preset:      input.preset,
    removeText:  input.removeText,
    replaceText: input.replaceText,
  });

  try {
    /* Convert base64 string → binary Buffer */
    const rawBase64  = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Buffer.from(rawBase64, "base64");

    const form = new FormData();
    form.append("image",   new Blob([imageBytes], { type: "image/jpeg" }), "input.jpg");
    form.append("prompt",  prompt);
    form.append("fidelity",       String(fidelity));
    form.append("output_format",  "jpeg");

    const res = await fetch(
      "https://api.stability.ai/v2beta/stable-image/control/style",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept:        "application/json",
        },
        body: form,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        success: false,
        error: `Stability AI ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    if (!data.image) {
      return {
        success: false,
        error: data.message ?? data.errors?.[0] ?? "No image returned",
      };
    }

    return {
      success: true,
      outputBase64: `data:image/jpeg;base64,${data.image}`,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
