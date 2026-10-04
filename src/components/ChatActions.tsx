"use client";

import { useState } from "react";
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

// Renommer / supprimer un projet (chat). Utilisé dans le tableau de bord et la barre latérale du studio.
export function useChatActions(onRenamed: (id: string, title: string) => void, onDeleted: (id: string) => void) {
  const [error, setError] = useState<string>();
  async function rename(id: string, title: string) {
    setError(undefined);
    const r = await fetch(`/api/project/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    if (r.error) return setError(r.error);
    onRenamed(id, r.title);
  }
  async function remove(id: string) {
    setError(undefined);
    const r = await fetch(`/api/project/${id}`, { method: "DELETE" }).then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    if (r.error) return setError(r.error);
    onDeleted(id);
  }
  return { rename, remove, error };
}

export function ChatRow({ id, title, active, onOpen, rename, remove }: {
  id: string; title: string; active?: boolean; onOpen: () => void;
  rename: (id: string, title: string) => Promise<void>; remove: (id: string) => Promise<void>;
}) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [value, setValue] = useState(title);
  const [busy, setBusy] = useState(false);

  if (editing) {
    return (
      <form className="flex items-center gap-1 rounded-xl bg-bg px-2 py-1"
        onSubmit={async (e) => { e.preventDefault(); setBusy(true); await rename(id, value); setBusy(false); setEditing(false); }}>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} disabled={busy}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-ink" />
        <button disabled={busy || !value.trim()} className="rounded-lg p-1 text-accent disabled:opacity-40" aria-label="Valider"><Check size={16} /></button>
        <button type="button" onClick={() => { setEditing(false); setValue(title); }} className="rounded-lg p-1 text-muted" aria-label="Annuler"><X size={16} /></button>
      </form>
    );
  }
  if (confirm) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
        Supprimer « {title} » ? Les vidéos déjà créées restent dans Mes vidéos.
        <div className="mt-2 flex gap-2">
          <button disabled={busy} onClick={async () => { setBusy(true); await remove(id); setBusy(false); setConfirm(false); }}
            className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white disabled:opacity-50">Supprimer</button>
          <button onClick={() => setConfirm(false)} className="rounded-full border border-red-200 bg-white px-3 py-1 font-semibold">Annuler</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`group relative flex items-center rounded-xl hover:bg-bg ${active ? "bg-bg" : ""}`}>
      <button onClick={onOpen} className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${active ? "font-semibold" : "text-ink/80"}`}>{title}</button>
      <button onClick={() => setMenu(!menu)} aria-label="Options du projet"
        className={`mr-1 rounded-lg p-1 text-muted hover:text-ink ${menu ? "" : "sm:opacity-0 sm:group-hover:opacity-100"}`}><MoreHorizontal size={16} /></button>
      {menu && (
        <div className="absolute right-1 top-9 z-20 w-40 overflow-hidden rounded-xl border border-line bg-card text-sm shadow-lg">
          <button onClick={() => { setMenu(false); setValue(title); setEditing(true); }} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-bg"><Pencil size={14} /> Renommer</button>
          <button onClick={() => { setMenu(false); setConfirm(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-red-700 hover:bg-red-50"><Trash2 size={14} /> Supprimer</button>
        </div>
      )}
    </div>
  );
}
