import { hfEstimate } from "./higgsfield";
import { loadPricing, type Pricing, type PricedStyle } from "./pricing";

// Prix à l'usage : coût réel Higgsfield (estimation en direct si dispo, sinon coût/s enregistré) × marge (1,4 = +40 %).
const cache = new Map<string, { usd: number; at: number }>();

export async function costUsd(style: PricedStyle, duration: number, aspect: string) {
  const fallback = style.cost_usd_per_s * duration;
  if (!style.hf_endpoint) return fallback;
  const key = `${style.hf_endpoint}|${JSON.stringify(style.hf_params)}|${duration}|${aspect}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60000) return hit.usd;
  try {
    const r = await hfEstimate(style.hf_endpoint, {
      prompt: "estimate", duration, aspect_ratio: aspect, image_url: "https://h8fj6hqu.eu-central.insforge.app/api/storage/buckets/videos/objects/showcase%2Fposter.jpg", ...(style.hf_params ?? {}),
    });
    const usd = r.ok && Number.isFinite(r.usd) && r.usd > 0 ? r.usd : fallback;
    cache.set(key, { usd, at: Date.now() });
    return usd;
  } catch { return fallback; }
}

export function priceFromCost(p: Pricing, usd: number, currency: string) {
  const local = usd * p.margin * (p.fx[currency] ?? p.fx.XAF);
  if (currency === "USD") return Math.ceil(local * 100) / 100;
  return Math.max(50, Math.ceil(local / 50) * 50);
}

export async function quote(styleId: string, duration: number, aspect: string, currency: string, pricing?: Pricing) {
  const p = pricing ?? await loadPricing();
  const style = p.styles.find((s) => s.id === styleId);
  if (!style || !style.durations.includes(duration) || !style.aspect_ratios.includes(aspect)) return null;
  const usd = await costUsd(style, duration, aspect);
  return { style, usd, price: priceFromCost(p, usd, currency) };
}
