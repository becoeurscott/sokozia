"use client";

import * as React from "react";
import { Sparkles, Pencil, Clock } from "lucide-react";
import { ACTORS, getActor } from "@/lib/actors";
import { DURATIONS, MODEL, closestDuration, formatFcfa, isDuration, videoPrice, type Duration } from "@/lib/models";
import { COUNTRY_CURRENCY, DEFAULT_COUNTRY, PAY_COUNTRIES, isPayCountry, localAmount } from "@/lib/pricing";
import type { BriefContent } from "@/lib/types";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import { ActorsGrid } from "./ActorsPicker";
import { Spinner } from "@/components/ui/Spinner";

export interface LaunchInput {
  /** ISO3 country of the Mobile Money account that pays. */
  country: string;
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
  // Briefs written before the 15/30 s formats may hold another duration.
  const [duration, setDuration] = React.useState<Duration>(isDuration(brief.duration) ? brief.duration : closestDuration(brief.duration));
  const [actorId, setActorId] = React.useState(brief.actorId);
  const [script, setScript] = React.useState(brief.script);
  const [editing, setEditing] = React.useState(false);
  const [pickActor, setPickActor] = React.useState(false);
  const actor = getActor(actorId) ?? ACTORS[0];
  const price = videoPrice(duration);
  const [country, setCountry] = React.useState(DEFAULT_COUNTRY);
  React.useEffect(() => setCountry(savedCountry()), []);
  const local = localAmount(country, price);
  const fcfa = local.currency === "XAF" || local.currency === "XOF";

  function chooseCountry(c: string) {
    setCountry(c);
    try {
      localStorage.setItem(COUNTRY_KEY, c);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
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
          <div className="grid grid-cols-2 gap-2">
            {DURATIONS.map((d) => {
              const active = d === duration;
              return (
                <button
                  key={d}
                  disabled={locked}
                  onClick={() => setDuration(d)}
                  className={`rounded-xl border p-2.5 text-left transition disabled:cursor-default ${active ? "border-brand bg-brand-soft/60" : "border-line hover:bg-hover"}`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <Clock className="h-3.5 w-3.5" /> {d} secondes
                  </div>
                  <div className="text-xs text-muted">{d === 15 ? "Pub courte, une scène" : "Pub longue, deux scènes"}</div>
                  <div className="mt-1 text-xs font-semibold text-brand">{formatFcfa(videoPrice(d))}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted">Script par Claude · tourné avec {MODEL.name}</p>
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
              <label className="flex items-center gap-2">
                Mobile Money
                <select
                  value={country}
                  onChange={(e) => chooseCountry(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-card px-2 text-sm text-ink outline-none focus:border-brand"
                  aria-label="Pays du compte Mobile Money"
                >
                  {PAY_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_CURRENCY[c].flag} {COUNTRY_CURRENCY[c].label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="mt-1 block text-xs">
                {fcfa ? formatFcfa(price) : `${local.amount.toLocaleString("fr-FR")} ${local.currency} (≈ ${formatFcfa(price)})`} · une vidéo qui échoue est relancée sans frais.
              </span>
            </div>
            <button
              disabled={busy || script.trim().length < 10}
              onClick={() => onLaunch({ country, duration, actorId, script: script.trim() })}
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

const COUNTRY_KEY = "sokozia:pay-country";

/** The Mobile Money country the user last picked (Cameroun by default). */
export function savedCountry(): string {
  try {
    const c = localStorage.getItem(COUNTRY_KEY);
    return isPayCountry(c) ? c : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}
