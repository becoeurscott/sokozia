"use client";

import { useState } from "react";
import { Check, Clapperboard, Pencil } from "lucide-react";
import type { Shot } from "@/lib/director";

// Découpage plan par plan proposé par Awa : le client le relit, le modifie, puis le valide.
export default function Storyboard({ shots, header, busy, onSave, onApprove }: {
  shots: Shot[]; header: string; busy: boolean;
  onSave: (shots: Shot[]) => void; onApprove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shots);
  const set = (i: number, k: keyof Shot, v: string) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const field = "w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-base outline-none focus:border-ink sm:text-sm";

  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent"><Clapperboard size={14} /> {header}</p>
        {!editing && (
          <button onClick={() => { setDraft(shots); setEditing(true); }} disabled={busy}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-ink"><Pencil size={12} /> Modifier</button>
        )}
      </div>

      <ol className="mt-3 space-y-2">
        {(editing ? draft : shots).map((s, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-bg p-3">
            <div className="flex w-12 shrink-0 flex-col items-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
              <span className="mt-1 text-[11px] font-semibold text-muted">{s.time}</span>
            </div>
            {editing ? (
              <div className="min-w-0 flex-1 space-y-1.5">
                <input value={s.camera} onChange={(e) => set(i, "camera", e.target.value)} placeholder="Cadrage (gros plan…)" className={field} />
                <textarea value={s.action} onChange={(e) => set(i, "action", e.target.value)} rows={2} placeholder="Ce qu'on voit" className={field} />
                <textarea value={s.line} onChange={(e) => set(i, "line", e.target.value)} rows={2} placeholder="Ce que dit le créateur (facultatif)" className={field} />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{s.camera}</p>
                <p className="mt-0.5 text-sm leading-relaxed">{s.action}</p>
                {s.line && <p className="mt-1.5 rounded-xl bg-card px-3 py-2 text-sm italic leading-relaxed">« {s.line} »</p>}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button disabled={busy} onClick={() => { onSave(draft); setEditing(false); }}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Enregistrer mes changements</button>
            <button onClick={() => setEditing(false)} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold">Annuler</button>
          </>
        ) : (
          <>
            <button disabled={busy} onClick={onApprove}
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Check size={15} /> Valider le découpage
            </button>
            <span className="text-xs text-muted">ou demande un changement à Awa dans le chat</span>
          </>
        )}
      </div>
    </div>
  );
}
