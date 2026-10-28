"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { useStudio } from "./StudioProvider";
import { api } from "@/lib/client/api";
import type { Generation } from "@/lib/types";
import { getActor } from "@/lib/actors";
import { Spinner } from "@/components/ui/Spinner";

type Pub = Omit<Generation, "prompt" | "provider_status_url">;

export function LibraryDialog() {
  const studio = useStudio();
  const open = studio.dialog === "library";
  const [items, setItems] = React.useState<Pub[] | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setItems(null);
    api<{ generations: Pub[] }>("/api/generations").then((d) => setItems(d.generations)).catch(() => setItems([]));
  }, [open]);

  return (
    <Dialog open={open} onClose={studio.closeDialog} width="max-w-4xl" title="Bibliothèque">
      {!items ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Aucune vidéo pour l&apos;instant. Décris ton produit pour créer la première.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((g) => (
            <Link key={g.id} href={`/studio/c/${g.thread_id}`} onClick={studio.closeDialog} className="group overflow-hidden rounded-xl border border-line bg-bg">
              <div className="relative aspect-[9/16] bg-hover">
                {g.status === "completed" && g.video_url ? (
                  <video src={g.video_url} poster={g.poster_url ?? undefined} muted playsInline className="h-full w-full object-cover" onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                ) : g.status === "failed" || g.status === "nsfw" ? (
                  <div className="flex h-full items-center justify-center text-xs text-red-700">Échec</div>
                ) : (
                  <div className="shimmer h-full w-full" />
                )}
                <span className="absolute left-2 top-2 rounded-pill bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">{g.duration} s</span>
              </div>
              <div className="p-2">
                <div className="truncate text-xs font-semibold">{g.product}</div>
                <div className="text-[11px] text-muted">
                  {getActor(g.actor_id)?.name} · {g.duration} s
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Dialog>
  );
}
