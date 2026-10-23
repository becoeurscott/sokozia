"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LayoutTemplate, Users, Lightbulb } from "lucide-react";
import { Composer } from "./Composer";
import { useStudio, type Draft, EMPTY_DRAFT } from "./StudioProvider";
import { api } from "@/lib/client/api";
import { HOME_EXAMPLES, TEMPLATES } from "@/lib/templates";
import { getActor } from "@/lib/actors";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import type { Thread } from "@/lib/types";

export function Home() {
  const studio = useStudio();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const start = React.useCallback(
    async (draft: Draft) => {
      setError(null);
      setBusy(true);
      try {
        const { thread } = await api<{ thread: Thread }>("/api/threads", {
          method: "POST",
          json: { text: draft.text, imageUrl: draft.imageUrl, actorId: draft.actorId },
        });
        studio.setDraft(EMPTY_DRAFT);
        studio.refreshThreads();
        router.push(`/studio/c/${thread.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
        setBusy(false);
      }
    },
    [router, studio],
  );

  function submit(draft: Draft) {
    if (!studio.user) {
      studio.openDialog("auth", { authMode: "signup", onAuthed: () => start(draft) });
      return;
    }
    start(draft);
  }

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    studio.setDraft({ text: t.prompt, imageUrl: null, imageName: null, actorId: t.actorId ?? null });
  }

  const tray = "flex h-9 items-center gap-1.5 rounded-pill px-3 text-sm font-medium text-ink/70 transition hover:bg-card hover:text-ink";

  return (
    <div className="welcome-glow flex flex-1 flex-col items-center overflow-y-auto px-4 pb-10 pt-[12vh] md:pt-[14vh]">
      <h1 className="mb-6 text-center font-serif text-[34px] leading-tight tracking-tight text-ink md:text-[44px]">Pour quel produit on fait une pub&nbsp;?</h1>

      <div className="w-full max-w-[720px]">
        <Composer draft={studio.draft} setDraft={studio.setDraft} onSubmit={submit} busy={busy} autoFocus onPickActor={() => studio.openDialog("actors")} />
        {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}

        <div className="mx-auto mt-2 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-pill bg-hover/70 p-1">
          <button className={tray} onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}>
            <ImagePlus className="h-4 w-4" /> Ajouter une photo
          </button>
          <button className={tray} onClick={() => studio.setTemplatesOpen(!studio.templatesOpen)}>
            <LayoutTemplate className="h-4 w-4" /> Modèles
          </button>
          <button className={tray} onClick={() => studio.openDialog("actors")}>
            <Users className="h-4 w-4" /> Créateurs
          </button>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted">
            <Lightbulb className="h-4 w-4 text-brand" /> Vois ce que Sokozia sait faire
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {HOME_EXAMPLES.map((ex) => {
              const actor = getActor(ex.actorId)!;
              return (
                <div key={ex.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3 shadow-[0_8px_30px_-20px_rgba(29,26,22,.3)]">
                  <div className="relative h-[136px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-hover">
                    <ActorAvatar actor={actor} size={86} rounded="rounded-none" className="!h-[136px] w-[86px]" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent px-2 pb-1.5 pt-6 text-[10px] font-semibold uppercase tracking-wide text-white">{actor.niche}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="text-sm font-bold">{ex.kicker}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted">{ex.title}</div>
                    <button onClick={() => applyTemplate(ex.id)} className="mt-auto h-8 w-fit rounded-pill border border-line bg-card px-3 text-xs font-semibold hover:bg-hover">
                      Essayer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
