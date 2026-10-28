/**
 * Single source of truth for the video model, its durations and prices.
 *
 * Sokozia renders every ad with Seedance 2.0 (Higgsfield). Claude is the ad
 * director (script + scene, see lib/agent/brief.ts); Seedance films it.
 *
 * Seedance 2.0 renders at most 15 s per request, so a 30 s ad is two 15 s
 * clips rendered in parallel and joined (lib/video/concat.ts).
 *
 * Pricing is pay-per-video: the user pays one video at a time by Mobile Money.
 */
export type Style = "seedance";
export type Duration = 15 | 30;

export const DURATIONS: Duration[] = [15, 30];

/** Longest clip Seedance 2.0 renders in one request. */
export const MAX_CLIP_SECONDS = 15;

export interface ModelSpec {
  id: Style;
  name: string;
  spec: string;
  description: string;
  /** Price in FCFA per duration. */
  prices: Record<Duration, number>;
  /** Higgsfield model path (POST https://api.higgsfield.ai/<path>). */
  higgsfield: { path: string; resolution: "480p" | "720p" | "1080p" | "4k" };
  /** Rough wall-clock the user should expect, per duration. */
  eta: Record<Duration, string>;
}

export const MODEL: ModelSpec = {
  id: "seedance",
  name: "Seedance 2.0",
  spec: "Vidéo verticale 9:16 · 720p · voix et son inclus",
  description: "Un créateur africain présente ton produit face caméra, en français, avec un script écrit par Claude.",
  prices: { 15: 1600, 30: 3000 },
  higgsfield: { path: "bytedance/seedance-2.0/reference-to-video", resolution: "720p" },
  eta: { 15: "2 à 3 min", 30: "3 à 4 min" },
};

/** Kept so the `style` column and existing call sites stay valid. */
export const STYLES: Record<Style, ModelSpec> = { seedance: MODEL };

export function isStyle(v: unknown): v is Style {
  return v === "seedance";
}

export function isDuration(v: unknown): v is Duration {
  return DURATIONS.includes(v as Duration);
}

/** Closest offered duration to any number of seconds. */
export function closestDuration(seconds: number): Duration {
  return DURATIONS.reduce((a, b) => (Math.abs(b - seconds) < Math.abs(a - seconds) ? b : a));
}

/** Number of Seedance clips needed for a duration. */
export function clipCount(duration: Duration): number {
  return Math.ceil(duration / MAX_CLIP_SECONDS);
}

export function videoPrice(duration: Duration): number {
  return MODEL.prices[duration];
}

export function lowestPrice(): number {
  return Math.min(...DURATIONS.map(videoPrice));
}

export function formatFcfa(n: number): string {
  // Non-breaking spaces so "1 600 FCFA" never wraps mid-number.
  return `${n.toLocaleString("fr-FR").replace(/[   ]/g, " ")} FCFA`;
}
