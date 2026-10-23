import { DURATIONS, STYLES, STYLE_ORDER, formatFcfa, videoPrice } from "@/lib/models";
import { PACKS, PACK_ORDER, packPrice, packUnitPrice } from "@/lib/pricing";
import { BuyPackButton } from "@/components/studio/BuyPackButton";

export const metadata = { title: "Modèles · Sokozia" };

export default function ModelesPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 scrollbar-thin md:px-10">
      <div className="mx-auto max-w-[960px]">
        <h1 className="font-serif text-3xl md:text-4xl">Modèles et prix</h1>
        <p className="mt-2 max-w-xl text-muted">Quatre styles, un prix clair avant de payer. Une vidéo qui échoue n&apos;est jamais décomptée.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {STYLE_ORDER.map((s) => {
            const spec = STYLES[s];
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
                  <div className="text-right">
                    <div className="text-xs text-muted">dès</div>
                    <div className="text-lg font-extrabold text-brand">{formatFcfa(spec.basePrice)}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => (
                    <div key={d} className="rounded-xl bg-bg p-2 text-center">
                      <div className="text-xs text-muted">{d} s</div>
                      <div className="text-sm font-bold">{formatFcfa(videoPrice(s, d))}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 border-t border-line pt-4">
                  {PACK_ORDER.filter((k) => k !== "single").map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-semibold">{PACKS[k].name}</span>
                        <span className="text-muted">
                          {" "}
                          · {PACKS[k].videos} pubs · {formatFcfa(packUnitPrice(s, k))}/pub
                        </span>
                      </div>
                      <BuyPackButton style={s} kind={k} label={formatFcfa(packPrice(s, k))} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-muted">Temps estimé : {spec.eta}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
