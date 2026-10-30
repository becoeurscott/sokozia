"use client";

import * as React from "react";
import { Download, RefreshCw, Share2, AlertTriangle, CreditCard, Check } from "lucide-react";
import type { Generation } from "@/lib/types";
import { MODEL, formatFcfa, isDuration } from "@/lib/models";
import { getActor } from "@/lib/actors";
import { Spinner } from "@/components/ui/Spinner";

type Pub = Omit<Generation, "prompt" | "provider_status_url">;

const STEPS: Array<{ key: Generation["status"]; label: string }> = [
  { key: "queued", label: "En file" },
  { key: "in_progress", label: "Génération" },
  { key: "completed", label: "Prête" },
];

export function VideoCard({
  generation: g,
  onRetry,
  onRemake,
  onPay,
  retrying,
}: {
  generation: Pub;
  /** Free relaunch of a paid video that failed. */
  onRetry?: () => void;
  /** New (paid) variant of a finished video. */
  onRemake?: () => void;
  onPay?: () => void;
  retrying?: boolean;
}) {
  const [elapsed, setElapsed] = React.useState(0);
  const actor = getActor(g.actor_id);
  const running = g.status === "queued" || g.status === "in_progress";

  React.useEffect(() => {
    if (!running) return;
    const start = g.started_at ? Date.parse(g.started_at) : Date.now();
    const t = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))), 500);
    return () => clearInterval(t);
  }, [running, g.started_at]);

  const stepIndex = g.status === "queued" ? 0 : g.status === "in_progress" ? 1 : g.status === "completed" ? 2 : -1;

  return (
    <div className="fade-up w-full max-w-[640px] overflow-hidden rounded-2xl border border-line bg-card shadow-[0_10px_40px_-24px_rgba(29,26,22,.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{g.product}</div>
          <div className="text-xs text-muted">
            {actor?.name} · {g.duration} s · {formatFcfa(g.price)}
          </div>
        </div>
        {running && (
          <div className="flex items-center gap-2 text-xs font-semibold text-brand">
            <Spinner /> {fmt(elapsed)}
          </div>
        )}
        {g.status === "completed" && (
          <span className="flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
            <Check className="h-3 w-3" /> Prête
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="mx-auto w-[220px] shrink-0 sm:mx-0">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-hover">
            {g.status === "completed" && g.video_url ? (
              <video src={g.video_url} poster={g.poster_url ?? undefined} controls playsInline autoPlay muted loop className="h-full w-full object-cover" />
            ) : g.status === "failed" || g.status === "nsfw" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-red-700">
                <AlertTriangle className="h-6 w-6" />
                Échec
              </div>
            ) : g.status === "awaiting_payment" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted">
                <CreditCard className="h-6 w-6" />
                En attente du paiement
              </div>
            ) : (
              <div className="shimmer h-full w-full" />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {g.status === "awaiting_payment" && (
            <>
              <p className="text-sm text-muted">Ta vidéo partira dès que le paiement Mobile Money est confirmé.</p>
              {onPay && (
                <button onClick={onPay} className="mt-3 flex h-10 w-fit items-center gap-2 rounded-pill bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
                  <CreditCard className="h-4 w-4" /> Payer {formatFcfa(g.price)}
                </button>
              )}
            </>
          )}

          {running && (
            <>
              <ol className="space-y-2">
                {STEPS.map((s, i) => (
                  <li key={s.key} className={`flex items-center gap-2 text-sm ${i < stepIndex ? "text-accent" : i === stepIndex ? "font-semibold text-ink" : "text-muted/60"}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${i < stepIndex ? "border-accent bg-accent text-white" : i === stepIndex ? "border-brand text-brand" : "border-line"}`}>
                      {i < stepIndex ? <Check className="h-3 w-3" /> : i === stepIndex ? <Spinner className="h-3 w-3" /> : i + 1}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted">Temps estimé : {isDuration(g.duration) ? MODEL.eta[g.duration] : "2 à 4 min"}. Tu peux fermer la page, la vidéo t&apos;attendra dans la Bibliothèque.</p>
            </>
          )}

          {g.status === "completed" && g.video_url && (
            <>
              <p className="text-sm text-muted">Ta pub est prête. Télécharge-la ou partage-la directement sur WhatsApp.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={g.video_url} download={`sokozia-${g.id.slice(0, 8)}.mp4`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-pill bg-ink px-4 text-sm font-semibold text-white hover:bg-black">
                  <Download className="h-4 w-4" /> Télécharger
                </a>
                <button
                  onClick={async () => {
                    const url = g.video_url!;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: "Ma pub Sokozia", url });
                        return;
                      } catch {
                        /* cancelled */
                      }
                    }
                    await navigator.clipboard.writeText(url);
                    alert("Lien copié !");
                  }}
                  className="flex h-10 items-center gap-2 rounded-pill border border-line px-4 text-sm font-semibold hover:bg-hover"
                >
                  <Share2 className="h-4 w-4" /> Partager
                </button>
                {onRemake && (
                  <button onClick={onRemake} className="flex h-10 items-center gap-2 rounded-pill px-3 text-sm font-semibold text-muted hover:bg-hover hover:text-ink">
                    <RefreshCw className="h-4 w-4" /> Refaire
                  </button>
                )}
              </div>
            </>
          )}

          {(g.status === "failed" || g.status === "nsfw") && (
            <>
              <p className="text-sm text-red-700">{g.error ?? "La génération a échoué."}</p>
              {onRetry ? (
                <>
                  <p className="mt-1 text-xs text-muted">Tu as déjà payé cette vidéo : on la relance sans frais.</p>
                  <button onClick={onRetry} disabled={retrying} className="mt-3 flex h-10 w-fit items-center gap-2 rounded-pill bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
                    {retrying ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Relancer gratuitement
                  </button>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted">Cette tentative a déjà été relancée plus bas.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
