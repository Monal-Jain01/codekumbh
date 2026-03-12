import type { StudioTool } from "@/components/ai-studio/types";

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

/**
 * Builds a text prompt + guidance_scale for the AI Studio tool.
 * Shared between the server action (instant preview) and the Trigger.dev task (persist).
 */
export function buildStudioPrompt(
  tool: StudioTool | string,
  opts: { preset?: string; removeText?: string; replaceText?: string },
): { prompt: string; guidanceScale: number } {
  const base = "professional interior design photography, photorealistic, high quality, 8K";

  switch (tool) {
    case "stage":
      return {
        prompt: `${STAGE_STYLES[opts.preset ?? "modern"] ?? STAGE_STYLES.modern}, ${base}`,
        guidanceScale: 12,
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
        guidanceScale: 10,
      };

    case "organise":
      return {
        prompt: `${ORGANISE_LAYOUTS[opts.preset ?? "open-flow"] ?? ORGANISE_LAYOUTS["open-flow"]}, ${base}`,
        guidanceScale: 11,
      };

    case "enhance":
      return {
        prompt: `${ENHANCE_STYLES[opts.preset ?? "crisp"] ?? ENHANCE_STYLES.crisp}, ${base}`,
        guidanceScale: 7,
      };

    default:
      return { prompt: base, guidanceScale: 10 };
  }
}

/**
 * Picks the best Replicate model for a given tool.
 * img2img for stage/organise/enhance, inpainting-style for objects.
 */
export function getReplicateModel(tool: StudioTool | string): {
  model: string;
  version: string;
} {
  // stability-ai/sdxl works great for all tools via img2img
  return {
    model: "stability-ai/sdxl",
    version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
  };
}
