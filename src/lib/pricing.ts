import { adminClient } from "./insforge";

export type Plan = "single" | "pack5" | "monthly";

export const COUNTRIES: Record<string, { name: string; currency: string; iso3: string; dial: string }> = {
  CM: { name: "Cameroun", currency: "XAF", iso3: "CMR", dial: "237" },
  CI: { name: "Côte d'Ivoire", currency: "XOF", iso3: "CIV", dial: "225" },
  SN: { name: "Sénégal", currency: "XOF", iso3: "SEN", dial: "221" },
  BJ: { name: "Bénin", currency: "XOF", iso3: "BEN", dial: "229" },
  CG: { name: "Congo-Brazzaville", currency: "XAF", iso3: "COG", dial: "242" },
  GA: { name: "Gabon", currency: "XAF", iso3: "GAB", dial: "241" },
  CD: { name: "RD Congo", currency: "CDF", iso3: "COD", dial: "243" },
  RW: { name: "Rwanda", currency: "RWF", iso3: "RWA", dial: "250" },
};

export const PLAN_LABELS: Record<Plan, string> = {
  single: "1 pub",
  pack5: "Pack 5 pubs",
  monthly: "Abonnement mensuel",
};

export type PricedStyle = { id: string; name_fr: string; description_fr: string; durations: number[]; cost_usd_per_s: number };

// Lecture serveur uniquement (le coût réel n'est jamais envoyé tel quel au navigateur).
export async function loadPricing() {
  const db = adminClient().database;
  const [{ data: settings }, { data: styles }] = await Promise.all([
    db.from("settings").select("key, value"),
    db.from("styles").select("id, name_fr, description_fr, durations, cost_usd_per_s, sort").eq("active", true).order("sort"),
  ]);
  const s = Object.fromEntries((settings ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const parsed: PricedStyle[] = (styles ?? []).map((st: PricedStyle) => ({
    ...st, cost_usd_per_s: Number(st.cost_usd_per_s), durations: (st.durations ?? []).map(Number),
  }));
  return {
    multipliers: s.multipliers as Record<Plan, number>,
    monthlyVideos: Number(s.monthly_videos),
    fx: s.fx as Record<string, number>,
    styles: parsed,
    durations: [...new Set(parsed.flatMap((st) => st.durations))].sort((a, b) => a - b),
  };
}

export type Pricing = Awaited<ReturnType<typeof loadPricing>>;

export function planVideos(p: Pricing, plan: Plan) {
  return plan === "single" ? 1 : plan === "pack5" ? 5 : p.monthlyVideos;
}

// Prix d'UNE pub = coût réel ($/s) × durée × multiplicateur (×5 unité, ×4 pack, ×3 mensuel),
// converti en devise locale puis arrondi vers le haut à un prix « rond ». La marge ne baisse jamais.
export function videoPrice(p: Pricing, plan: Plan, style: PricedStyle, duration: number, currency: string) {
  const local = style.cost_usd_per_s * duration * p.multipliers[plan] * (p.fx[currency] ?? p.fx.XAF);
  if (currency === "USD") return Math.ceil(local * 2) / 2;
  const step = local < 2000 ? 250 : local < 10000 ? 500 : 1000;
  return Math.ceil(local / step) * step;
}

export function planPrice(p: Pricing, plan: Plan, style: PricedStyle, duration: number, currency: string) {
  return videoPrice(p, plan, style, duration, currency) * planVideos(p, plan);
}

export function currencyOf(country: string) {
  return COUNTRIES[country]?.currency ?? "XAF";
}

export function fmt(amount: number, currency: string) {
  const label = currency === "XAF" || currency === "XOF" ? "FCFA" : currency;
  return `${amount.toLocaleString("fr-FR")} ${label}`;
}
