import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, Gift } from "lucide-react";
import { getSession } from "@/lib/insforge";
import { currencyOf } from "@/lib/pricing";
import { getWallet, walletHistory } from "@/lib/wallet";
import { TopupButton } from "@/components/render/TopupButton";

export const metadata = { title: "Portefeuille — Sokozia" };
const ICON = { topup: ArrowDownLeft, generation: ArrowUpRight, refund: RotateCcw, gift: Gift, migration: Gift, adjust: RotateCcw } as const;

export default async function Page() {
  const { profile } = await getSession();
  if (!profile) redirect("/connexion?next=/portefeuille");
  const [wallet, tx] = await Promise.all([getWallet(profile.id), walletHistory(profile.id, 50)]);
  const c = currencyOf(profile.country);
  const cur = c === "XOF" || c === "XAF" ? "FCFA" : c;
  const nf = (n: number) => n.toLocaleString("fr-FR");
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Portefeuille</h1>
      <div className="mt-6 rounded-3xl bg-ink p-6 text-white">
        <p className="text-sm text-white/60">Solde disponible</p>
        <p className="mt-1 text-4xl font-extrabold">{nf(wallet.balance)} {cur}</p>
        <p className="mt-2 text-sm text-white/60">Tu payes chaque vidéo à l&apos;usage, selon le modèle et le nombre de secondes. Pas d&apos;abonnement, ton solde n&apos;expire pas.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <TopupButton currency={cur} className="rounded-full bg-brand px-6 py-3 font-semibold text-white" />
          <Link href="/studio" className="rounded-full border border-white/20 px-6 py-3 font-semibold">Créer une vidéo</Link>
        </div>
      </div>
      <h2 className="mt-10 font-bold">Historique</h2>
      {tx.length === 0 ? <p className="card mt-3 text-center text-muted">Aucun mouvement pour l&apos;instant.</p> : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {tx.map((t) => {
            const Icon = ICON[t.kind as keyof typeof ICON] ?? RotateCcw;
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${t.amount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-brand/10 text-brand"}`}><Icon size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.label ?? t.kind}</span>
                  <span className="text-xs text-muted">{new Date(t.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
                </span>
                <span className={`text-sm font-bold ${t.amount >= 0 ? "text-emerald-700" : "text-ink"}`}>{t.amount >= 0 ? "+" : ""}{nf(t.amount)} {cur}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
