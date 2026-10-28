/**
 * pawaPay charges in the payer's local currency. XAF and XOF are both
 * "FCFA" at parity; other currencies use a fixed conversion table that
 * you can tune in one place.
 *
 * Per-video prices live in lib/models.ts (STYLES[*].prices).
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
    // Mobile money providers mostly want whole units.
    const amount = Math.max(1, Math.round(fcfa * perFcfa));
    return { country, currency, amount: String(amount) };
  });
}
