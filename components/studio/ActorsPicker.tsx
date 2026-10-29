"use client";

import * as React from "react";
import { ACTORS, actorIntro, actorPortrait, type Actor } from "@/lib/actors";
import { Dialog } from "@/components/ui/Dialog";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import { Check, Play, Square } from "lucide-react";

/**
 * A creator as a 9:16 card: portrait, and their spoken intro video when
 * the play button is pressed. One intro plays at a time.
 */
export function CreatorCard({ actor, active, onSelect }: { actor: Actor; active?: boolean; onSelect?: (a: Actor) => void }) {
  const video = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const hasIntro = actor.intro !== false;

  React.useEffect(() => {
    const stop = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== actor.id) video.current?.pause();
    };
    window.addEventListener("sokozia:intro", stop);
    return () => window.removeEventListener("sokozia:intro", stop);
  }, [actor.id]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      window.dispatchEvent(new CustomEvent("sokozia:intro", { detail: actor.id }));
      v.currentTime = 0;
      void v.play();
    } else {
      v.pause();
    }
  }

  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      {...(onSelect ? { onClick: () => onSelect(actor), type: "button" as const } : {})}
      className={`group relative overflow-hidden rounded-2xl border text-left transition ${active ? "border-brand ring-2 ring-brand/30" : "border-line"} bg-card`}
    >
      <div className="relative aspect-[9/16] w-full bg-hover">
        {hasIntro ? (
          <video
            ref={video}
            src={actorIntro(actor)}
            poster={actorPortrait(actor)}
            preload="none"
            playsInline
            className="h-full w-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={actorPortrait(actor)} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        {hasIntro && (
          <span
            role="button"
            tabIndex={0}
            aria-label={playing ? `Arrêter la présentation de ${actor.name}` : `Écouter ${actor.name}`}
            onClick={toggle}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(e as unknown as React.MouseEvent)}
            className="absolute left-2 top-2 flex h-8 items-center gap-1 rounded-pill bg-ink/70 px-2.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-ink"
          >
            {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />} {playing ? "Stop" : "Écouter"}
          </span>
        )}
        {active && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent px-3 pb-2.5 pt-10 text-white">
          <div className="text-sm font-bold">{actor.name}</div>
          <div className="text-[11px] opacity-90">
            {actor.flag} {actor.country} · {actor.niche}
          </div>
        </div>
      </div>
    </Tag>
  );
}

export function ActorsGrid({ selected, onSelect, compact }: { selected?: string | null; onSelect: (a: Actor) => void; compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {ACTORS.map((a) => {
          const active = a.id === selected;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition hover:bg-hover ${active ? "border-brand bg-brand-soft/60" : "border-line bg-card"}`}
            >
              <ActorAvatar actor={a} size={48} />
              <span className="text-xs font-semibold leading-tight">{a.name}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {ACTORS.map((a) => (
        <CreatorCard key={a.id} actor={a} active={a.id === selected} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function ActorsDialog({ open, onClose, selected, onSelect }: { open: boolean; onClose: () => void; selected?: string | null; onSelect: (a: Actor) => void }) {
  return (
    <Dialog open={open} onClose={onClose} width="max-w-3xl" title="Choisis ton créateur">
      <p className="mb-4 text-sm text-muted">16 visages africains. Écoute leur présentation, puis choisis : son visage reste le même dans toutes tes pubs.</p>
      <ActorsGrid
        selected={selected}
        onSelect={(a) => {
          onSelect(a);
          onClose();
        }}
      />
    </Dialog>
  );
}
