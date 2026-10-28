import { Check } from "lucide-react";
import { DURATIONS, MODEL, formatFcfa, type Duration } from "@/lib/models";

const PER_DURATION: Record<Duration, { title: string; points: string[]; badge?: string }> = {
  15: {
    title: "Pub courte",
    points: ["Accroche, bénéfice, appel à l'action", "Idéale pour les Reels, TikTok et les statuts WhatsApp"],
    badge: "Le plus choisi",
  },
  30: {
    title: "Pub longue",
    points: ["Deux scènes enchaînées, même créateur", "Le temps de montrer le produit et de convaincre"],
  },
};

const INCLUDED = [
  "Script écrit par Claude, ta directrice de création",
  "Créateur africain qui parle français, voix et son inclus",
  "Seedance 2.0 · vertical 9:16 · 720p",
  "Vidéo téléchargeable, sans filigrane",
];

/** Per-video prices: one card per duration. */
export function PriceTable({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {DURATIONS.map((d) => {
          const info = PER_DURATION[d];
          return (
            <div key={d} className={`rounded-2xl border p-6 ${info.badge ? "border-brand bg-brand-soft/40" : "border-line bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-muted">
                  {info.title} · {d} secondes
                </div>
                {info.badge && <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-bold text-white">{info.badge}</span>}
              </div>
              <div className="mt-2 text-4xl font-extrabold tabular-nums">{formatFcfa(MODEL.prices[d])}</div>
              <div className="text-sm text-muted">la vidéo · prête en {MODEL.eta[d]}</div>
              {!compact && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {info.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <div className="text-sm font-bold">Inclus dans chaque vidéo</div>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted sm:grid-cols-2">
            {INCLUDED.map((p) => (
              <li key={p} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Prix en FCFA, payés par Mobile Money au moment de créer la vidéo. Converti automatiquement dans ta monnaie hors zone FCFA.</p>
    </div>
  );
}
