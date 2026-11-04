import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/insforge";
import Link from "next/link";
import { currencyOf } from "@/lib/pricing";
import { TopupButton } from "@/components/render/TopupButton";
import { later } from "./actions";

export const metadata = { title: "Bienvenue — Sokozia" };
const STEPS = ["Compte créé", "Recharge ton solde", "Crée ta première pub"];

export default async function Page() {
  const { profile } = await getSession();
  if (!profile) redirect("/connexion?next=/bienvenue");
  const c = currencyOf(profile.country ?? "CI");
  const cur = c === "XOF" || c === "XAF" ? "FCFA" : c;
  const first = (profile.full_name ?? "").split(" ")[0];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14 text-center">
      <ol className="mx-auto flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${i === 0 ? "border-brand/30 bg-brand/10 text-brand" : i === 1 ? "border-ink bg-ink text-white" : "border-line text-muted"}`}>
            {i === 0 ? <Check size={13} /> : <span className="font-bold">{i + 1}</span>} {s}
          </li>
        ))}
      </ol>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-5xl">Bienvenue{first ? `, ${first}` : ""} !</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">Recharge ton solde par Mobile Money ou carte. Ensuite chaque vidéo est débitée selon le modèle et sa durée : tu vois toujours le prix avant de lancer.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <TopupButton currency={cur} label="Recharger mon solde" />
        <Link href="/tarifs" className="btn-ghost">Voir les prix</Link>
      </div>
      <form action={later} className="mt-8">
        <button className="text-sm text-muted underline hover:text-ink">Plus tard, aller au studio</button>
      </form>
    </div>
  );
}
