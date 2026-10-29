/**
 * pawaPay charges in the payer's local currency. XAF and XOF are both
 * "FCFA" at parity; other currencies use a fixed conversion table that
 * you can tune in one place.
 *
 * The countries are the ones enabled on the Sokozia pawaPay account (the
 * same list the earlier app used). Per-video prices live in lib/models.ts.
 */
export const COUNTRY_CURRENCY: Record<string, { currency: string; perFcfa: number; label: string; flag: string }> = {
  CMR: { currency: "XAF", perFcfa: 1, label: "Cameroun", flag: "🇨🇲" },
  CIV: { currency: "XOF", perFcfa: 1, label: "Côte d'Ivoire", flag: "🇨🇮" },
  SEN: { currency: "XOF", perFcfa: 1, label: "Sénégal", flag: "🇸🇳" },
  BEN: { currency: "XOF", perFcfa: 1, label: "Bénin", flag: "🇧🇯" },
  COG: { currency: "XAF", perFcfa: 1, label: "Congo-Brazzaville", flag: "🇨🇬" },
  GAB: { currency: "XAF", perFcfa: 1, label: "Gabon", flag: "🇬🇦" },
  COD: { currency: "CDF", perFcfa: 4.6, label: "RD Congo", flag: "🇨🇩" },
  RWA: { currency: "RWF", perFcfa: 2.3, label: "Rwanda", flag: "🇷🇼" },
};

export const PAY_COUNTRIES = Object.keys(COUNTRY_CURRENCY);
export const DEFAULT_COUNTRY = "CMR";

export function isPayCountry(v: unknown): v is string {
  return typeof v === "string" && v in COUNTRY_CURRENCY;
}

/** What the payer is charged, in their currency. Mobile money mostly wants whole units. */
export function localAmount(country: string, fcfa: number): { amount: number; currency: string } {
  const c = COUNTRY_CURRENCY[country] ?? COUNTRY_CURRENCY[DEFAULT_COUNTRY];
  return { amount: Math.max(1, Math.round(fcfa * c.perFcfa)), currency: c.currency };
}
