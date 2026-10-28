import { PriceTable } from "@/components/marketing/PriceTable";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Tarifs · Sokozia" };

export default function TarifsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand">Tarifs</div>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Tu payes seulement ce que tu crées</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Chaque vidéo se paye au moment de la créer, par Mobile Money, selon le style et le nombre de secondes. Pas d&apos;abonnement, pas de pack, pas de solde à recharger.
      </p>
      <div className="mt-8">
        <PriceTable />
      </div>
      <Button href="/studio" size="lg" className="mt-6">
        Créer ma vidéo
      </Button>
      <div className="mt-10 grid gap-4 text-sm md:grid-cols-3">
        {[
          ["Une vidéo, un paiement", "Le prix s'affiche avant de payer. Tu ne payes rien d'autre."],
          ["Mobile Money", "Orange Money, MTN MoMo, Moov, Wave, Airtel, M-Pesa."],
          ["Échec = relancé gratuitement", "Si une vidéo payée ne se crée pas, tu la relances sans frais."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-card p-5">
            <div className="font-bold">{t}</div>
            <div className="mt-1 text-muted">{d}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
