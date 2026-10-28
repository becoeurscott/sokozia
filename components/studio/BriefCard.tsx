"use client";

import * as React from "react";
import { Sparkles, Pencil, Clock } from "lucide-react";
import { ACTORS, getActor } from "@/lib/actors";
import { DURATIONS, STYLES, STYLE_ORDER, clampDuration, formatFcfa, fromPrice, supports, videoPrice, type Duration, type Style } from "@/lib/models";
import type { BriefContent } from "@/lib/types";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import { ActorsGrid } from "./ActorsPicker";
import { Spinner } from "@/components/ui/Spinner";

export interface LaunchInput {
  style: Style;
  duration: Duration;
  actorId: string;
  script: string;
}

export function BriefCard({
  brief,
  onLaunch,
  busy,
  locked,
}: {
  brief: BriefContent;
  onLaunch: (input: LaunchInput) => void;
  busy?: boolean;
  /** True once a video was launched from this brief. */
  locked?: boolean;
}) {
  const [style, setStyle] = React.useState<Style>(brief.style);
  const [duration, setDuration] = React.useState<Duration>(clampDuration(brief.style, brief.duration));
  const [actorId, setActorId] = React.useState(brief.actorId);
  const [script, setScript] = React.useState(brief.script);
  const [editing, setEditing] = React.useState(false);
  const [pickActor, setPickActor] = React.useState(false);
  const actor = getActor(actorId) ?? ACTORS[0];
  const price = videoPrice(style, duration);

  function chooseStyle(s: Style) {
    setStyle(s);
    setDuration((d) => clampDuration(s, d));
  }

  return (
    <div className="fade-up w-full max-w-[640px] overflow-hidden rounded-2xl border border-line bg-card shadow-[0_10px_40px_-24px_rgba(29,26,22,.35)]">
      <div className="flex items-start gap-3 border-b border-line bg-bg/60 px-4 py-3">
        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Brief · {brief.product}</div>
          <p className="text-[15px] leading-relaxed">{brief.text}</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Creator */}
        <section>
          <Label>Créateur</Label>
          <div className="flex items-center gap-3">
            <ActorAvatar actor={actor} size={48} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {actor.name} <span className="font-normal text-muted">· {actor.flag} {actor.country}</span>
              </div>
              <div className="text-xs text-muted">{actor.niche} · voix {actor.voice}</div>
            </div>
            {!locked && (
              <button onClick={() => setPickActor((v) => !v)} className="h-8 rounded-pill border border-line px-3 text-xs font-semibold hover:bg-hover">
                Changer
              </button>
            )}
          </div>
          {pickActor && !locked && (
            <div className="mt-3 rounded-xl border border-line bg-bg p-3">
              <ActorsGrid
                compact
                selected={actorId}
                onSelect={(a) => {
                  setActorId(a.id);
                  setPickActor(false);
                }}
              />
            </div>
          )}
        </section>

        {/* Duration */}
        <section>
          <Label>Durée</Label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => {
              const ok = supports(style, d);
              return (
                <Chip key={d} active={d === duration} disabled={locked || !ok} onClick={() => setDuration(d)} title={ok ? undefined : "Disponible en Éclair"}>
                  <Clock className="h-3.5 w-3.5" /> {d} s
                </Chip>
              );
            })}
          </div>
          {style !== "eclair" && !locked && <p className="mt-1 text-xs text-muted">Au-delà de 15 s, choisis le style Éclair.</p>}
        </section>

        {/* Style */}
        <section>
          <Label>Style</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLE_ORDER.map((s) => {
              const spec = STYLES[s];
              const active = s === style;
              const p = supports(s, duration) ? videoPrice(s, duration) : null;
              return (
                <button
                  key={s}
                  disabled={locked}
                  onClick={() => chooseStyle(s)}
                  className={`rounded-xl border p-2.5 text-left transition disabled:cursor-default ${active ? "border-brand bg-brand-soft/60" : "border-line hover:bg-hover"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold">{spec.name}</span>
                    {spec.badge && <span className="rounded-pill bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">★</span>}
                  </div>
                  <div className="text-xs text-muted">{spec.tagline}</div>
                  <div className="mt-1 text-xs font-semibold text-brand">{p !== null ? formatFcfa(p) : `dès ${formatFcfa(fromPrice(s))}`}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Script */}
        <section>
          <div className="flex items-center justify-between">
            <Label>Script ({duration} s)</Label>
            {!locked && (
              <button onClick={() => setEditing((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <Pencil className="h-3 w-3" /> {editing ? "Terminer" : "Modifier"}
              </button>
            )}
          </div>
          {editing && !locked ? (
            <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={4} className="w-full rounded-xl border border-line bg-bg p-3 text-[15px] leading-relaxed outline-none focus:border-brand" />
          ) : (
            <p className="rounded-xl bg-bg p-3 text-[15px] italic leading-relaxed text-ink/90">« {script} »</p>
          )}
          <p className="mt-1 text-xs text-muted">Lieu : {brief.scene}</p>
        </section>

        {!locked && (
          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted">
              Paiement Mobile Money · <span className="font-semibold text-ink">{formatFcfa(price)}</span>
              <span className="block text-xs">Une vidéo qui échoue est relancée sans frais.</span>
            </div>
            <button
              disabled={busy || script.trim().length < 10}
              onClick={() => onLaunch({ style, duration, actorId, script: script.trim() })}
              className="flex h-11 items-center justify-center gap-2 rounded-pill bg-brand px-5 text-sm font-semibold text-white transition hover:bg-[#d24f0a] disabled:opacity-50"
            >
              {busy && <Spinner />}
              {`Créer la vidéo · ${formatFcfa(price)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{children}</div>;
}

function Chip({ active, disabled, onClick, title, children }: { active: boolean; disabled?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 items-center gap-1 rounded-pill border px-3 text-sm font-medium transition disabled:cursor-default ${active ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent"}`}
    >
      {children}
    </button>
  );
}
