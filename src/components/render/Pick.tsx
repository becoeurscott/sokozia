"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type PickOption = { value: string; label: string; short?: string; hint?: string };

/** Bouton compact de la barre du composer : un clic ouvre la liste, un clic sur une option la sélectionne. */
export function Pick({ icon, value, options, onChange, title }: { icon: ReactNode; value: string; options: PickOption[]; onChange: (v: string) => void; title: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const m = window.matchMedia("(max-width: 639px)"); const f = () => setPhone(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (window.innerWidth >= 640 && !ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} title={title}
        className={`flex h-9 w-full min-w-0 items-center justify-center gap-1 rounded-full bg-[#f6ebdc]/70 px-1.5 text-[13px] sm:w-auto sm:text-sm sm:shrink-0 sm:justify-start sm:gap-1.5 sm:bg-transparent sm:px-2.5 sm:px-3 font-medium transition ${open ? "bg-[#f6ebdc] text-ink" : "text-ink/75 hover:bg-[#f6ebdc] hover:text-ink"}`}>
        {icon}<span className="truncate whitespace-nowrap">{current?.short ? <><span className="sm:hidden">{current.short}</span><span className="hidden sm:inline">{current.label}</span></> : current?.label ?? title}</span><ChevronDown size={14} className={`hidden shrink-0 opacity-60 sm:block transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (phone
        ? createPortal(<>
            <div className="fixed inset-0 z-[90] bg-ink/30" onClick={() => setOpen(false)} />
            <ul role="listbox" className="fixed z-[91] left-0 top-full mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-[0_18px_50px_-20px_rgba(29,26,22,.45)] max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:max-h-[70svh] max-sm:overflow-y-auto max-sm:pb-[max(env(safe-area-inset-bottom),6px)]">
          <li className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</li>
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm sm:py-2 hover:bg-[#f6ebdc] ${o.value === value ? "font-semibold" : ""}`}>
                <span className="min-w-0 flex-1"><span className="block">{o.label}</span>{o.hint && <span className="block text-xs font-normal text-muted">{o.hint}</span>}</span>
                {o.value === value && <Check size={15} className="shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
          </>, document.body)
        : <ul role="listbox" className="absolute left-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-[0_18px_50px_-20px_rgba(29,26,22,.45)] max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:max-h-[70svh] max-sm:overflow-y-auto max-sm:pb-[max(env(safe-area-inset-bottom),6px)]">
          <li className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</li>
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm sm:py-2 hover:bg-[#f6ebdc] ${o.value === value ? "font-semibold" : ""}`}>
                <span className="min-w-0 flex-1"><span className="block">{o.label}</span>{o.hint && <span className="block text-xs font-normal text-muted">{o.hint}</span>}</span>
                {o.value === value && <Check size={15} className="shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>)}
    </div>
  );
}
