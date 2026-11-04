"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, PackageOpen, Sparkles, UserRound } from "lucide-react";

export type AvatarCard = { id: string; name: string; specialty: string; country: string; portrait: string };

/** Choix du créateur (avatar) : Claude choisit, un des créateurs, ou le produit seul. */
export function AvatarPick({ value, avatars, onChange }: { value: string; avatars: AvatarCard[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const cur = avatars.find((a) => a.id === value);
  const choose = (v: string) => { onChange(v); setOpen(false); };
  const special = (v: string, icon: React.ReactNode, label: string, hint: string) => (
    <button type="button" onClick={() => choose(v)} className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left ${value === v ? "border-brand bg-brand/5" : "border-line hover:border-ink/30"}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f6ebdc] text-ink/70">{icon}</span>
      <span className="min-w-0"><b className="block text-sm">{label}</b><span className="block text-xs text-muted">{hint}</span></span>
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} title="Créateur"
        className={`flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition ${open ? "bg-[#f6ebdc] text-ink" : "text-ink/75 hover:bg-[#f6ebdc] hover:text-ink"}`}>
        {cur ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={cur.portrait} alt="" className="size-6 rounded-full object-cover" />)
          : value === "none" ? <PackageOpen size={16} /> : <UserRound size={16} />}
        <span className="whitespace-nowrap">{cur ? cur.name : value === "none" ? "Produit seul" : "Créateur auto"}</span>
        <ChevronDown size={14} className={`opacity-60 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="dialog" aria-label="Choisir le créateur" className="absolute left-0 top-full z-30 mt-2 w-[440px] max-sm:fixed max-sm:inset-x-3 max-sm:top-20 max-sm:mt-0 max-sm:w-auto rounded-2xl border border-line bg-card p-3 shadow-[0_18px_50px_-20px_rgba(29,26,22,.45)]">
          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Créateur</p>
          <div className="grid grid-cols-2 gap-2">
            {special("auto", <Sparkles size={18} />, "Claude choisit", "Le visage le plus crédible")}
            {special("none", <PackageOpen size={18} />, "Produit seul", "Sans visage")}
          </div>
          <div className="mt-3 grid max-h-[42vh] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
            {avatars.map((a) => (
              <button key={a.id} type="button" onClick={() => choose(a.id)} title={`${a.name} · ${a.specialty} · ${a.country}`} className="group text-center">
                <span className={`relative block overflow-hidden rounded-2xl ring-2 ${value === a.id ? "ring-brand" : "ring-transparent group-hover:ring-line"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.portrait} alt={a.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  {value === a.id && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-brand text-white"><Check size={12} /></span>}
                </span>
                <span className="mt-1 block truncate text-xs font-semibold">{a.name}</span>
                <span className="block truncate text-[10px] text-muted">{a.specialty}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
