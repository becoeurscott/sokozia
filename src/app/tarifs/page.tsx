import Link from "next/link";
import { getSession } from "@/lib/insforge";
import { currencyOf, loadPricing } from "@/lib/pricing";
import { quote } from "@/lib/quote";
import { RotateCcw, Smartphone, Wallet } from "lucide-react";

export const metadata = { title: "Tarifs — Sokozia" };

export default async function Page() {
  const [{ profile }, pricing] = await Promise.all([getSession(), loadPricing()]);
  const c = currencyOf(profile?.country ?? "CI");
  const cur = c === "XOF" || c === "XAF" ? "FCFA" : c;
  const allDur = [...new Set(pricing.styles.flatMap((s) => s.durations))].sort((a, b) => a - b);
  const rows = await Promise.all(pricing.styles.map(async (s) => ({
    s,
    prices: Object.fromEntries(await Promise.all(s.durations.map(async (d) => [d, (await quote(s.id, d, "9:16", c, pricing))?.price ?? null] as const))),
  })));
  const nf = (n: number) => n.toLocaleString("fr-FR");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-brand">Tarifs</p>
      <h1 className="mt-2 text-center text-4xl font-extrabold tracking-tight sm:text-5xl">Tu payes seulement ce que tu crées</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">Recharge ton solde par Mobile Money ou carte, puis chaque vidéo est débitée selon le modèle et le nombre de secondes. Pas d&apos;abonnement.</p>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-3 font-semibold">Modèle</th>
              {allDur.map((d) => <th key={d} className="px-3 py-3 text-right font-semibold">{d} s</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, prices }) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-4"><b className="block">{s.name_fr}</b><span className="text-xs text-muted">{s.quality_fr}</span></td>
                {allDur.map((d) => <td key={d} className="px-3 py-4 text-right font-semibold">{prices[d] ? `${nf(prices[d] as number)}` : <span className="text-muted">—</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-center text-xs text-muted">Prix en {cur} pour une vidéo verticale (9:16). Le prix exact s&apos;affiche dans le studio avant de lancer.</p>

      <div className="mt-8 text-center">
        <Link href={profile ? "/studio" : "/inscription"} className="btn">{profile ? "Créer une vidéo" : "Créer mon compte"}</Link>
      </div>

      <div className="mt-12 grid gap-4 text-center text-sm sm:grid-cols-3">
        <div className="card"><Wallet className="mx-auto mb-2 text-brand" size={22} strokeWidth={1.8} /><b>Solde rechargeable</b><br /><span className="text-muted">À partir de 1 000 {cur}, il n&apos;expire pas</span></div>
        <div className="card"><Smartphone className="mx-auto mb-2 text-brand" size={22} strokeWidth={1.8} /><b>Mobile Money ou carte</b><br /><span className="text-muted">Orange, MTN, Moov, Wave, Visa, Mastercard</span></div>
        <div className="card"><RotateCcw className="mx-auto mb-2 text-brand" size={22} strokeWidth={1.8} /><b>Échec = remboursé</b><br /><span className="text-muted">Si une vidéo ne se crée pas, ton solde est recrédité</span></div>
      </div>
    </div>
  );
}
