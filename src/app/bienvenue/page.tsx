import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/insforge";
import { currencyOf, fmt, loadPricing, planPrice, planVideos, videoPrice, type Plan } from "@/lib/pricing";
import PricingPicker, { type PriceRow } from "@/components/PricingPicker";
import { later } from "./actions";

export const metadata = { title: "Bienvenue — Sokozia" };
const PLANS: Plan[] = ["single", "pack5", "monthly"];
const STEPS = ["Compte créé", "Choisis ta formule", "Paye par Mobile Money", "Crée ta première pub"];

export default async function Page() {
  const [{ profile }, pricing] = await Promise.all([getSession(), loadPricing()]);
  if (!profile) redirect("/connexion?next=/bienvenue");
  const currency = currencyOf(profile.country ?? "CM");
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
  const first = (profile.full_name ?? "").split(" ")[0];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <ol className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2 text-xs sm:text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${i === 0 ? "border-brand/30 bg-brand/10 text-brand" : i === 1 ? "border-ink bg-ink text-white" : "border-line text-muted"}`}>
            {i === 0 ? <Check size={13} /> : <span className="font-bold">{i + 1}</span>} {s}
          </li>
        ))}
      </ol>
      <h1 className="mt-8 text-center text-3xl font-extrabold tracking-tight sm:text-5xl">Bienvenue{first ? `, ${first}` : ""} !</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">Choisis le style et la durée de ta pub, puis ta formule. Tu payes par Mobile Money et tu crées ta première pub tout de suite avec Awa.</p>
      <PricingPicker rows={rows} loggedIn />
      <form action={later} className="mt-8 text-center">
        <button className="text-sm text-muted underline hover:text-ink">Plus tard, voir mon tableau de bord</button>
      </form>
    </div>
  );
}
