import { STYLES, STYLE_ORDER, durationsFor, formatFcfa, fromPrice } from "@/lib/models";
import { PriceTable } from "@/components/marketing/PriceTable";

export const metadata = { title: "Modèles · Sokozia" };

export default function ModelesPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 scrollbar-thin md:px-10">
      <div className="mx-auto max-w-[960px]">
        <h1 className="font-serif text-3xl md:text-4xl">Modèles et prix</h1>
        <p className="mt-2 max-w-xl text-muted">Quatre styles. Tu payes chaque vidéo au moment de la créer, par Mobile Money. Une vidéo payée qui échoue est relancée sans frais.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {STYLE_ORDER.map((s) => {
            const spec = STYLES[s];
            const ds = durationsFor(s);
            return (
              <div key={s} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold">{spec.name}</h2>
                      {spec.badge && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">{spec.badge}</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted">{spec.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted">dès</div>
                    <div className="text-lg font-extrabold text-brand">{formatFcfa(fromPrice(s))}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted">
                  {spec.spec} · {ds[0]} à {ds[ds.length - 1]} s · temps estimé {spec.eta}
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mb-3 mt-10 text-lg font-bold">Prix par vidéo</h2>
        <PriceTable compact />
      </div>
    </div>
  );
}
