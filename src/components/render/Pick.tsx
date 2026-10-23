"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export type PickOption = { value: string; label: string; hint?: string };

/** Bouton compact de la barre du composer : un clic ouvre la liste, un clic sur une option la sélectionne. */
export function Pick({ icon, value, options, onChange, title }: { icon: ReactNode; value: string; options: PickOption[]; onChange: (v: string) => void; title: string }) {
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
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} title={title}
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${open ? "bg-[#f6ebdc] text-ink" : "text-ink/75 hover:bg-[#f6ebdc] hover:text-ink"}`}>
        {icon}<span className="whitespace-nowrap">{current?.label ?? title}</span><ChevronDown size={14} className={`opacity-60 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-30 mt-2 min-w-[220px] max-w-[85vw] overflow-hidden rounded-2xl border border-line bg-card p-1.5 shadow-[0_18px_50px_-20px_rgba(29,26,22,.45)]">
          <li className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</li>
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f6ebdc] ${o.value === value ? "font-semibold" : ""}`}>
                <span className="min-w-0 flex-1"><span className="block">{o.label}</span>{o.hint && <span className="block text-xs font-normal text-muted">{o.hint}</span>}</span>
                {o.value === value && <Check size={15} className="shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
