import { Clapperboard, PenLine } from "lucide-react";
import { MODEL } from "@/lib/models";
import { PriceTable } from "@/components/marketing/PriceTable";

export const metadata = { title: "Modèles · Sokozia" };

export default function ModelesPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 scrollbar-thin md:px-10">
      <div className="mx-auto max-w-[960px]">
        <h1 className="font-serif text-3xl md:text-4xl">Modèles et prix</h1>
        <p className="mt-2 max-w-xl text-muted">Chaque pub est dirigée par Claude et tournée par Seedance 2.0. Tu payes la vidéo au moment de la créer, par Mobile Money. Une vidéo payée qui échoue est relancée sans frais.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-brand" />
              <h2 className="text-xl font-extrabold">Claude</h2>
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Directrice de création</span>
            </div>
            <p className="mt-2 text-sm text-muted">Awa, c&apos;est Claude : elle écrit l&apos;accroche, le script en français parlé et la mise en scène de chaque plan, puis l&apos;ajuste quand tu lui demandes.</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-brand" />
              <h2 className="text-xl font-extrabold">{MODEL.name}</h2>
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Vidéo</span>
            </div>
            <p className="mt-2 text-sm text-muted">{MODEL.description}</p>
            <p className="mt-2 text-xs text-muted">{MODEL.spec} · 30 s = deux scènes de 15 s enchaînées</p>
          </div>
        </div>

        <h2 className="mb-3 mt-10 text-lg font-bold">Prix par vidéo</h2>
        <PriceTable compact />
      </div>
    </div>
  );
}
