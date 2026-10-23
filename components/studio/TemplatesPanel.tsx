"use client";

import { X, LayoutTemplate } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { getActor } from "@/lib/actors";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import { useStudio } from "./StudioProvider";
import { useRouter } from "next/navigation";

export function TemplatesToggle() {
  const { templatesOpen, setTemplatesOpen } = useStudio();
  return (
    <button
      onClick={() => setTemplatesOpen(!templatesOpen)}
      className={`flex h-9 items-center gap-2 rounded-pill border px-3 text-sm font-medium transition ${templatesOpen ? "border-brand bg-brand-soft text-brand" : "border-line bg-card hover:bg-hover"}`}
    >
      <LayoutTemplate className="h-4 w-4" /> Modèles de pub
    </button>
  );
}

export function TemplatesPanel() {
  const studio = useStudio();
  const router = useRouter();
  if (!studio.templatesOpen) return null;

  const grouped = TEMPLATES.reduce<Record<string, typeof TEMPLATES>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[340px] flex-col border-l border-line bg-card shadow-2xl md:static md:z-0 md:shadow-none">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="font-bold">Modèles de pub</div>
        <button onClick={() => studio.setTemplatesOpen(false)} className="rounded-full p-1.5 text-muted hover:bg-hover" aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-4">
            <div className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{cat}</div>
            <div className="space-y-2">
              {list.map((t) => {
                const actor = getActor(t.actorId);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      studio.setDraft({ text: t.prompt, imageUrl: null, imageName: null, actorId: t.actorId ?? null });
                      studio.setTemplatesOpen(false);
                      router.push("/studio");
                    }}
                    className="flex w-full items-start gap-3 rounded-xl border border-line bg-bg p-3 text-left transition hover:bg-hover"
                  >
                    {actor && <ActorAvatar actor={actor} size={36} />}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{t.title}</span>
                      <span className="line-clamp-2 text-xs text-muted">{t.prompt}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
