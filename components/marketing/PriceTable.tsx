import { DURATIONS, STYLES, STYLE_ORDER, formatFcfa } from "@/lib/models";

/** Per-video price grid: one row per style, one column per duration. */
export function PriceTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="px-4 py-3 font-semibold">Style</th>
            {DURATIONS.map((d) => (
              <th key={d} className="px-3 py-3 text-right font-semibold">
                {d} s
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {STYLE_ORDER.map((s) => {
            const spec = STYLES[s];
            return (
              <tr key={s}>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-2">
                    <b>{spec.name}</b>
                    {spec.badge && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">{spec.badge}</span>}
                  </span>
                  {!compact && <span className="block text-xs text-muted">{spec.spec}</span>}
                </td>
                {DURATIONS.map((d) => {
                  const p = spec.prices[d];
                  return (
                    <td key={d} className={`px-3 py-4 text-right tabular-nums ${p ? "font-semibold" : "text-muted/50"}`}>
                      {p ? formatFcfa(p).replace(" FCFA", "") : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-3 text-xs text-muted">Prix en FCFA pour une vidéo verticale (9:16). Le prix exact s&apos;affiche dans le studio avant de payer.</p>
    </div>
  );
}
