export const STAGE_PRESETS = [
  { id: "modern",       label: "Modern",       desc: "Clean lines & neutral tones",  from: "from-slate-400",  to: "to-slate-600",   filter: "brightness-105 contrast-105 saturate-90"          },
  { id: "coastal",      label: "Coastal",      desc: "Airy blues & sandy whites",    from: "from-sky-300",    to: "to-blue-400",    filter: "brightness-110 saturate-110 hue-rotate-[180deg]"  },
  { id: "scandinavian", label: "Scandinavian", desc: "Warm wood & white walls",      from: "from-amber-200",  to: "to-stone-300",   filter: "brightness-115 saturate-75 sepia-[0.15]"          },
  { id: "industrial",   label: "Industrial",   desc: "Raw concrete & metal accents", from: "from-zinc-400",   to: "to-zinc-600",    filter: "brightness-90 contrast-110 saturate-50"           },
  { id: "luxury",       label: "Luxury",       desc: "Rich velvet & gold accents",   from: "from-yellow-400", to: "to-amber-600",   filter: "brightness-105 contrast-108 saturate-120"         },
  { id: "minimal",      label: "Minimal",      desc: "Pure white & open spaces",     from: "from-gray-100",   to: "to-gray-300",    filter: "brightness-120 saturate-60 contrast-95"           },
] as const;

export const FURNITURE_CATS = [
  { id: "sofa",     emoji: "🛋️", label: "Sofa",        items: ["L-Shape Corner","3-Seater Classic","Loveseat","Sectional Modular"] },
  { id: "bed",      emoji: "🛏️", label: "Bed & Frame", items: ["King Platform","Queen Panel","Storage Bed","Canopy Frame"] },
  { id: "table",    emoji: "🪵",  label: "Tables",      items: ["Dining 6-Seater","Coffee Table","Console Table","Study Desk"] },
  { id: "lighting", emoji: "💡", label: "Lighting",    items: ["Pendant Globe","Arc Floor Lamp","LED Cove Strip","Chandelier"] },
  { id: "storage",  emoji: "🗄️", label: "Storage",     items: ["Sliding Wardrobe","Open Bookshelf","Sideboard","Entertainment Unit"] },
  { id: "decor",    emoji: "🖼️", label: "Decor",       items: ["Abstract Canvas","Indoor Plant","Wool Rug","Decorative Mirror"] },
] as const;

/** Items a user can pick as the object they want to replace */
export const REPLACE_SOURCES = [
  { id: "sofa",        emoji: "🛋️", label: "Sofa"          },
  { id: "bed",         emoji: "🛏️", label: "Bed"           },
  { id: "dining-set",  emoji: "🍽️", label: "Dining Set"    },
  { id: "wardrobe",    emoji: "🗄️", label: "Wardrobe"      },
  { id: "tv-unit",     emoji: "📺", label: "TV Unit"        },
  { id: "lamp",        emoji: "💡", label: "Lamp"           },
  { id: "rug",         emoji: "🟫", label: "Rug"            },
  { id: "curtains",    emoji: "🪟", label: "Curtains"       },
  { id: "bookshelf",   emoji: "📚", label: "Bookshelf"      },
  { id: "coffee-table",emoji: "☕", label: "Coffee Table"   },
  { id: "chair",       emoji: "🪑", label: "Chair"          },
  { id: "decor-item",  emoji: "🖼️", label: "Decor Item"    },
] as const;

/** Layout presets for the Object Organiser tool */
export const LAYOUT_PRESETS = [
  { id: "open-flow",     emoji: "🌬️", label: "Open Flow",     desc: "Maximise space, keep pathways clear"   },
  { id: "cozy-corner",   emoji: "🛋️", label: "Cozy Corner",   desc: "Intimate seating zone by the walls"    },
  { id: "dining-focus",  emoji: "🍽️", label: "Dining Focus",  desc: "Emphasise dining & entertaining area"  },
  { id: "work-home",     emoji: "💻", label: "Work from Home", desc: "Carve a dedicated home-office nook"    },
  { id: "entertainment", emoji: "📺", label: "Entertainment",  desc: "Media-centric lounge arrangement"      },
  { id: "zen",           emoji: "🧘", label: "Zen Space",      desc: "Minimal, calm, clutter-free layout"    },
] as const;

/** Enhancement presets for the Enhancer tool */
export const ENHANCE_PRESETS = [
  { id: "crisp",     label: "Crisp & Clear", desc: "Sharpen details, reduce noise",       filter: "contrast-110 brightness-105"                    },
  { id: "warm",      label: "Warm Tones",    desc: "Golden-hour feel, inviting warmth",   filter: "brightness-108 saturate-110 sepia-[0.12]"       },
  { id: "cool",      label: "Cool & Fresh",  desc: "Clean, airy, modern colour cast",     filter: "brightness-110 saturate-95 hue-rotate-[10deg]"  },
  { id: "vibrant",   label: "Vibrant",       desc: "Boost colours for maximum impact",    filter: "saturate-140 contrast-108"                      },
  { id: "hdr",       label: "HDR Look",      desc: "High dynamic range, dramatic depth",  filter: "contrast-115 brightness-102 saturate-110"       },
  { id: "cinematic", label: "Cinematic",     desc: "Film-grade colour grade, rich blacks", filter: "contrast-112 brightness-97 saturate-80"        },
] as const;
