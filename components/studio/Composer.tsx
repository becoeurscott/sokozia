"use client";

import * as React from "react";
import { ArrowUp, Plus, X, ImagePlus } from "lucide-react";
import { uploadFile } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import { ActorAvatar } from "@/components/ui/ActorAvatar";
import { getActor } from "@/lib/actors";
import type { Draft } from "./StudioProvider";

export const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/x-m4a,audio/aac";

export function Composer({
  draft,
  setDraft,
  onSubmit,
  busy,
  placeholder = "Décris ton produit, colle un lien ou ajoute une photo",
  label = "Créer la vidéo",
  autoFocus,
  onPickActor,
  compact,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  onSubmit: (d: Draft) => void | Promise<void>;
  busy?: boolean;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  onPickActor?: () => void;
  compact?: boolean;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const canSend = (draft.text.trim().length > 0 || !!draft.imageUrl) && !busy && !uploading;
  const actor = getActor(draft.actorId);

  React.useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(220, Math.max(compact ? 24 : 48, ta.scrollHeight)) + "px";
  }, [draft.text, compact]);

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setError(null);
    setUploading(true);
    try {
      const up = await uploadFile(f);
      setDraft((d) => ({ ...d, imageUrl: up.url, imageName: up.name }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit() {
    if (!canSend) return;
    onSubmit(draft);
  }

  return (
    <div className="w-full">
      <div
        className={`rounded-[22px] border border-line bg-card shadow-[0_10px_40px_-18px_rgba(29,26,22,.25)] transition focus-within:border-brand/50 focus-within:shadow-[0_10px_40px_-14px_rgba(232,89,12,.35)] ${compact ? "px-3 pb-2 pt-2" : "px-4 pb-3 pt-4"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files);
        }}
      >
        {(draft.imageUrl || actor) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {draft.imageUrl && (
              <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-bg py-1 pl-1 pr-2 text-xs font-medium">
                {/\.(mp4|mov|webm)$/i.test(draft.imageUrl) ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-hover">🎬</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                )}
                <span className="max-w-[140px] truncate">{draft.imageName ?? "Fichier"}</span>
                <button onClick={() => setDraft((d) => ({ ...d, imageUrl: null, imageName: null }))} className="text-muted hover:text-ink" aria-label="Retirer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {actor && (
              <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-bg py-1 pl-1 pr-2 text-xs font-medium">
                <ActorAvatar actor={actor} size={24} />
                {actor.name}
                <button onClick={() => setDraft((d) => ({ ...d, actorId: null }))} className="text-muted hover:text-ink" aria-label="Retirer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        )}
        <textarea
          ref={taRef}
          autoFocus={autoFocus}
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="block w-full resize-none bg-transparent text-[16px] leading-6 text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-full text-ink/70 hover:bg-hover hover:text-ink" aria-label="Ajouter un fichier" title="Ajouter une photo ou une vidéo">
              {uploading ? <Spinner /> : <Plus className="h-5 w-5" />}
            </button>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
            {onPickActor && !compact && (
              <button type="button" onClick={onPickActor} className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink/70 hover:bg-hover hover:text-ink sm:flex">
                <ImagePlus className="h-4 w-4" /> Créateur
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className={`flex h-10 items-center gap-2 rounded-pill pl-4 pr-3 text-sm font-semibold text-white transition ${canSend ? "bg-brand hover:bg-[#d24f0a]" : "bg-brand/40"}`}
          >
            {busy ? <Spinner /> : null}
            {label}
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && <p className="mt-2 px-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
