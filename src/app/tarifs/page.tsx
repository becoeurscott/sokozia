import { getSession } from "@/lib/insforge";
import { currencyOf, fmt, loadPricing, planPrice, planVideos, videoPrice, type Plan } from "@/lib/pricing";
import { Layers, RotateCcw, Smartphone } from "lucide-react";
import PricingPicker, { type PriceRow } from "@/components/PricingPicker";

const PLANS: Plan[] = ["single", "pack5", "monthly"];

export default async function Page() {
  const [{ profile }, pricing] = await Promise.all([getSession(), loadPricing()]);
  const currency = currencyOf(profile?.country ?? "CM");
  const rows: PriceRow[] = pricing.styles.map((s) => ({
    id: s.id, name: s.name_fr, description: s.description_fr,
    byDuration: s.durations.map((duration) => {
      const base = videoPrice(pricing, "single", s, duration, currency);
      return {
        duration,
        plans: PLANS.map((plan) => {
          const unit = videoPrice(pricing, plan, s, duration, currency);
          return {
            plan, videos: planVideos(pricing, plan),
            total: fmt(planPrice(pricing, plan, s, duration, currency), currency),
            perVideo: fmt(unit, currency),
            saving: base > unit ? Math.round((1 - unit / base) * 100) : 0,
          };
        }),
      };
    }),
  }));
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-brand">Tarifs</p>
      <h1 className="mt-2 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">Un prix clair, sans surprise</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">1. Choisis le style et la durée &nbsp;·&nbsp; 2. Choisis ta formule &nbsp;·&nbsp; 3. Paye par Mobile Money</p>
      <PricingPicker rows={rows} loggedIn={!!profile} />
      <div className="mt-12 grid gap-4 text-center text-sm sm:grid-cols-3">
        <div className="card"><RotateCcw className="mx-auto mb-2 text-brand" size={22} strokeWidth={1.8} /><b>Échec = non décompté</b><br /><span className="text-muted">Ta pub est rendue automatiquement</span></div>
        <div className="card"><Smartphone className="mx-auto mb-2 text-brand" size={22} strokeWidth={1.8} /><b>Mobile Money</b><br /><span className="text-muted">Orange, MTN, Wave, Moov, Airtel</span></div>
        <div className="card"><Layers className="mx-auto mb-2 text-brand" size={22} strokeWidth={1.8} /><b>Prix clair</b><br /><span className="text-muted">Selon le style et la durée, rien d&apos;autre</span></div>
      </div>
    </div>
  );
}
