/**
 * Single source of truth for the four Sokozia styles: price, labels and the
 * Higgsfield model each one maps to.
 */
export type Style = "eclair" | "naturel" | "studio" | "signature";
export type Duration = 8 | 15 | 30;

export const DURATIONS: Duration[] = [8, 15, 30];

export interface StyleSpec {
  id: Style;
  name: string;
  tagline: string;
  description: string;
  /** Price in FCFA for a 15 s video. */
  basePrice: number;
  /** Éclair is flat: 15 s and 30 s cost the same. */
  flat?: boolean;
  badge?: string;
  /** Higgsfield model path (POST https://api.higgsfield.ai/<path>). */
  higgsfield: {
    path: string;
    resolution?: "480p" | "720p" | "1080p";
    bitrate_mode?: "standard" | "high";
    /** Kling-style endpoints take a single image_url and a sound flag. */
    kind: "seedance" | "kling";
  };
  /** Rough wall-clock the user should expect. */
  eta: string;
}

export const STYLES: Record<Style, StyleSpec> = {
  eclair: {
    id: "eclair",
    name: "Éclair",
    tagline: "Le plus économique",
    description:
      "Le plus économique, jusqu'à 30 secondes. Idéal pour publier souvent.",
    basePrice: 1750,
    flat: true,
    higgsfield: {
      path: "bytedance/seedance-2.5/reference-to-video",
      resolution: "480p",
      bitrate_mode: "standard",
      kind: "seedance",
    },
    eta: "1 à 2 min",
  },
  naturel: {
    id: "naturel",
    name: "Naturel",
    tagline: "Le plus choisi",
    description:
      "Une vraie personne qui parle de ton produit, très naturelle, comme une cliente.",
    basePrice: 3500,
    badge: "Le plus choisi",
    higgsfield: {
      path: "bytedance/seedance-2.5/reference-to-video",
      resolution: "720p",
      bitrate_mode: "high",
      kind: "seedance",
    },
    eta: "2 à 3 min",
  },
  studio: {
    id: "studio",
    name: "Studio",
    tagline: "Rendu pub soigné",
    description:
      "Rendu pub soigné et fluide, créateur et produit fidèles aux références.",
    basePrice: 4000,
    higgsfield: {
      path: "kling-video/v3.0/std/image-to-video",
      kind: "kling",
    },
    eta: "3 à 5 min",
  },
  signature: {
    id: "signature",
    name: "Signature",
    tagline: "Le plus réaliste",
    description:
      "Le plus réaliste : visages, gestes et voix au plus près du réel.",
    basePrice: 6000,
    higgsfield: {
      path: "bytedance/seedance-2.5/reference-to-video",
      resolution: "1080p",
      bitrate_mode: "high",
      kind: "seedance",
    },
    eta: "4 à 6 min",
  },
};

export const STYLE_ORDER: Style[] = ["eclair", "naturel", "studio", "signature"];

/** Rank used when a higher-tier credit pays for a lower-tier video. */
export const STYLE_RANK: Record<Style, number> = {
  eclair: 0,
  naturel: 1,
  studio: 2,
  signature: 3,
};

export function isStyle(v: unknown): v is Style {
  return typeof v === "string" && v in STYLES;
}

export function isDuration(v: unknown): v is Duration {
  return v === 8 || v === 15 || v === 30;
}

/** Price of one video for a style and duration, in FCFA. */
export function videoPrice(style: Style, duration: Duration): number {
  const spec = STYLES[style];
  if (spec.flat) return spec.basePrice;
  const factor = duration === 8 ? 0.6 : duration === 30 ? 1.6 : 1;
  return Math.round((spec.basePrice * factor) / 50) * 50;
}

export function formatFcfa(n: number): string {
  // Non-breaking spaces so "3 500 FCFA" never wraps mid-number.
  return `${n.toLocaleString("fr-FR").replace(/[   ]/g, " ")} FCFA`;
}
