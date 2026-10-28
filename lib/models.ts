/**
 * Single source of truth for the four Sokozia styles: per-video price by
 * duration, labels, and the Higgsfield model each one maps to.
 *
 * Pricing is pay-per-video: the user pays one video at a time by Mobile
 * Money. Prices mirror the live table on sokozia.com/tarifs.
 */
export type Style = "eclair" | "naturel" | "studio" | "signature";
export type Duration = 5 | 10 | 15 | 20 | 30;

/** Every duration offered by at least one style. */
export const DURATIONS: Duration[] = [5, 10, 15, 20, 30];

export interface StyleSpec {
  id: Style;
  name: string;
  tagline: string;
  /** One-line spec shown under the name in price tables. */
  spec: string;
  description: string;
  /** Price in FCFA for each duration the style supports. */
  prices: Partial<Record<Duration, number>>;
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
    spec: "Qualité standard · 720p · jusqu'à 30 s",
    description: "Le plus économique, jusqu'à 30 secondes. Idéal pour publier souvent.",
    prices: { 5: 250, 10: 500, 15: 750, 20: 950, 30: 1450 },
    higgsfield: {
      path: "bytedance/seedance-2.5/reference-to-video",
      resolution: "720p",
      bitrate_mode: "standard",
      kind: "seedance",
    },
    eta: "1 à 2 min",
  },
  naturel: {
    id: "naturel",
    name: "Naturel",
    tagline: "Le plus choisi",
    spec: "Très naturel · 720p · son inclus",
    description: "Une vraie personne qui parle de ton produit, très naturelle, comme une cliente.",
    prices: { 5: 550, 10: 1100, 15: 1600 },
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
    spec: "Rendu pub soigné · 1080p · son inclus",
    description: "Rendu pub soigné et fluide, créateur et produit fidèles aux références.",
    prices: { 5: 750, 10: 1450, 15: 2150 },
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
    spec: "Le plus réaliste · visages et gestes · son inclus",
    description: "Le plus réaliste : visages, gestes et voix au plus près du réel.",
    prices: { 5: 900, 10: 1750, 15: 2600 },
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

export function isStyle(v: unknown): v is Style {
  return typeof v === "string" && v in STYLES;
}

export function isDuration(v: unknown): v is Duration {
  return DURATIONS.includes(v as Duration);
}

/** Durations a style can be ordered in, shortest first. */
export function durationsFor(style: Style): Duration[] {
  return DURATIONS.filter((d) => STYLES[style].prices[d] !== undefined);
}

export function supports(style: Style, duration: Duration): boolean {
  return STYLES[style].prices[duration] !== undefined;
}

/** Closest duration the style supports (used when switching style). */
export function clampDuration(style: Style, duration: Duration): Duration {
  const allowed = durationsFor(style);
  if (allowed.includes(duration)) return duration;
  return allowed.reduce((a, b) => (Math.abs(b - duration) < Math.abs(a - duration) ? b : a));
}

/** Price of one video in FCFA. Throws for an unsupported combination. */
export function videoPrice(style: Style, duration: Duration): number {
  const p = STYLES[style].prices[duration];
  if (p === undefined) throw new Error(`${STYLES[style].name} n'existe pas en ${duration} s.`);
  return p;
}

/** Cheapest price of a style, for "dès …" labels. */
export function fromPrice(style: Style): number {
  return Math.min(...(Object.values(STYLES[style].prices) as number[]));
}

/** Cheapest video across all styles. */
export function lowestPrice(): number {
  return Math.min(...STYLE_ORDER.map(fromPrice));
}

export function formatFcfa(n: number): string {
  // Non-breaking spaces so "1 450 FCFA" never wraps mid-number.
  return `${n.toLocaleString("fr-FR").replace(/[   ]/g, " ")} FCFA`;
}
