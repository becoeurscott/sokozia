import { PricingTable } from "@/components/marketing/PricingTable";

export const metadata = { title: "Tarifs · Sokozia" };

export default function TarifsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand">Tarifs</div>
      <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">Un prix clair, sans surprise</h1>
      <p className="mt-3 text-muted">1. Choisis le style et la durée · 2. Choisis ta formule · 3. Paye par Mobile Money</p>
      <PricingTable />
      <div className="mt-10 grid gap-4 text-sm md:grid-cols-3">
        {[
          ["Échec = non décompté", "Ta pub est rendue automatiquement, ou ton crédit est remis."],
          ["Mobile Money", "Orange, MTN, Moov, Wave, Airtel, M-Pesa."],
          ["Prix clair", "Selon le style et la durée, rien d'autre."],
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
