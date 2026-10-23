import { STYLES, type Style, type Duration, videoPrice } from "./models";

export type PackKind = "single" | "pack5" | "monthly";

export interface PackSpec {
  kind: PackKind;
  name: string;
  subtitle: string;
  videos: number;
  /** Discount on the 15 s unit price. */
  discount: number;
  /** Credits expire after this many days (monthly only). */
  validityDays?: number;
  badge?: string;
}

export const PACKS: Record<PackKind, PackSpec> = {
  single: {
    kind: "single",
    name: "À l'unité",
    subtitle: "Pour tester une idée",
    videos: 1,
    discount: 0,
  },
  pack5: {
    kind: "pack5",
    name: "Pack 5 vidéos",
    subtitle: "Pour une campagne complète",
    videos: 5,
    discount: 0.18,
    badge: "Le plus choisi",
  },
  monthly: {
    kind: "monthly",
    name: "Abonnement mensuel",
    subtitle: "Pour publier chaque semaine",
    videos: 10,
    discount: 0.36,
    validityDays: 30,
    badge: "Meilleur prix",
  },
};

export const PACK_ORDER: PackKind[] = ["single", "pack5", "monthly"];

/** Total price of a pack for a style, in FCFA (15 s credits). */
export function packPrice(style: Style, kind: PackKind): number {
  const unit = STYLES[style].basePrice;
  const pack = PACKS[kind];
  const total = unit * pack.videos * (1 - pack.discount);
  return Math.round(total / 500) * 500;
}

export function packUnitPrice(style: Style, kind: PackKind): number {
  return Math.round(packPrice(style, kind) / PACKS[kind].videos);
}

/**
 * Amount to charge for a one-off video.
 */
export function singleVideoPrice(style: Style, duration: Duration): number {
  return videoPrice(style, duration);
}

/**
 * pawaPay charges in the payer's local currency. XAF and XOF are both
 * "FCFA" at parity; other currencies use a fixed conversion table that
 * you can tune in one place.
 */
export const COUNTRY_CURRENCY: Record<string, { currency: string; perFcfa: number; label: string }> = {
  CMR: { currency: "XAF", perFcfa: 1, label: "Cameroun" },
  CIV: { currency: "XOF", perFcfa: 1, label: "Côte d'Ivoire" },
  SEN: { currency: "XOF", perFcfa: 1, label: "Sénégal" },
  BEN: { currency: "XOF", perFcfa: 1, label: "Bénin" },
  BFA: { currency: "XOF", perFcfa: 1, label: "Burkina Faso" },
  GAB: { currency: "XAF", perFcfa: 1, label: "Gabon" },
  COG: { currency: "XAF", perFcfa: 1, label: "Congo" },
  COD: { currency: "CDF", perFcfa: 4.6, label: "RD Congo" },
  KEN: { currency: "KES", perFcfa: 0.215, label: "Kenya" },
  NGA: { currency: "NGN", perFcfa: 2.5, label: "Nigeria" },
  GHA: { currency: "GHS", perFcfa: 0.02, label: "Ghana" },
};

export const CHECKOUT_COUNTRIES = Object.keys(COUNTRY_CURRENCY);

export function amountsForCountries(fcfa: number) {
  return CHECKOUT_COUNTRIES.map((country) => {
    const { currency, perFcfa } = COUNTRY_CURRENCY[country];
    const raw = fcfa * perFcfa;
    // Mobile money providers mostly want whole units.
    const amount = Math.max(1, Math.round(raw));
    return { country, currency, amount: String(amount) };
  });
}
