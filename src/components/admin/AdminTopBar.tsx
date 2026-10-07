import type { ReactNode } from "react";

/** Page header for admin pages: title, optional context pill, page actions. */
export function AdminTopBar({ title, subtitle, pill, actions, back }: { title: string; subtitle?: string; pill?: string; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
          {pill && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/70">{pill}</span>}
        </div>
        {subtitle && <p className="mt-1 text-[13px] text-white/45">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
