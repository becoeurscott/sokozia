"use client";

import { ACTORS, type Actor } from "@/lib/actors";
import { Dialog } from "@/components/ui/Dialog";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import { Check } from "lucide-react";

export function ActorsGrid({ selected, onSelect, compact }: { selected?: string | null; onSelect: (a: Actor) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
      {ACTORS.map((a) => {
        const active = a.id === selected;
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition hover:bg-hover ${active ? "border-brand bg-brand-soft/60" : "border-line bg-card"}`}
          >
            <ActorAvatar actor={a} size={compact ? 48 : 72} />
            <span className="text-sm font-semibold leading-tight">{a.name}</span>
            {!compact && (
              <span className="text-xs text-muted">
                {a.flag} {a.country}
                <br />
                {a.niche}
              </span>
            )}
            {active && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ActorsDialog({ open, onClose, selected, onSelect }: { open: boolean; onClose: () => void; selected?: string | null; onSelect: (a: Actor) => void }) {
  return (
    <Dialog open={open} onClose={onClose} width="max-w-3xl" title="Choisis ton créateur">
      <p className="mb-4 text-sm text-muted">16 visages africains. Son visage reste le même dans toutes tes pubs.</p>
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
