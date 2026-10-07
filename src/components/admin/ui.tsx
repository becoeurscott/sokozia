import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Server-safe building blocks for the admin dashboard. */

export const fmtNum = (n: number, digits = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);
export const fmtUsd = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
export const fmtXof = (n: number, cur = "XAF") => `${fmtNum(Math.round(n))} ${cur === "XAF" || cur === "XOF" ? "FCFA" : cur}`;
export const fmtDate = (iso: string | null | undefined, time = false) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(iso)) : "—";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-white/[0.06] bg-[#121212] p-4 sm:p-5", className)}>{children}</section>;
}

export function CardHeader({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/70 [&_svg]:size-4">{icon}</span>}
        <h2 className="text-[15px] font-medium truncate">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Previous-period comparison: null when the base is too small to mean anything. */
export function trend(cur: number, prev: number): number | null {
  if (prev < 5) return null;
  return ((cur - prev) / prev) * 100;
}

export function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-[11px] text-white/45">—</span>;
  const good = invert ? value <= 0 : value >= 0;
  return <span className={cn("text-[11px] font-medium", good ? "text-emerald-400" : "text-red-400")}>{value >= 0 ? "↑" : "↓"} {fmtNum(Math.abs(value), 1)} %</span>;
}

export function KpiCard({ icon, title, value, sub, footer, graphic }: { icon: ReactNode; title: string; value: ReactNode; sub?: ReactNode; footer?: ReactNode; graphic?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#121212] p-1.5">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 text-[13px] text-white/70">
        <span className="grid size-6 place-items-center rounded-md bg-white/[0.06] [&_svg]:size-3.5">{icon}</span>
        {title}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0b0b0b] px-3.5 py-4">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight tabular-nums truncate">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-white/45 truncate">{sub}</p>}
        </div>
        {graphic}
      </div>
      {footer && <div className="flex items-center justify-between px-3 py-2.5 text-[11px] text-white/45">{footer}</div>}
    </section>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-400", red: "bg-red-500/15 text-red-400", orange: "bg-[#f08a3c]/15 text-[#f08a3c]",
  yellow: "bg-amber-400/15 text-amber-300", gray: "bg-white/[0.07] text-white/70", blue: "bg-sky-500/15 text-sky-400",
};
export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES | string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", TONES[tone] ?? TONES.gray)}>{children}</span>;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "En attente", processing: "En cours", ready: "Prête", failed: "Échec", completed: "Payé",
};
export const STATUS_TONE: Record<string, string> = {
  pending: "blue", processing: "yellow", ready: "green", failed: "red", completed: "green",
};
export const PAY_LABEL: Record<string, string> = { completed: "Payé", failed: "Échoué", pending: "En attente" };
export const PAY_TONE: Record<string, string> = { completed: "green", failed: "red", pending: "yellow" };
export const PLAN_LABEL: Record<string, string> = { single: "1 pub", pack5: "Pack 5", monthly: "Mensuel", gift: "Offert", refund: "Rendu", admin: "Admin" };

/** Link-based segmented control (keeps filters in the URL, works without JS). */
export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-[#121212] p-1">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={cn("rounded-lg px-3 py-1.5 text-[12px] transition-colors", i.key === active ? "bg-white text-black font-medium" : "text-white/70 hover:text-white hover:bg-white/[0.05]")}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-[12px] text-white/45">
      <span>Page {page + 1} / {pages} · {fmtNum(total)} résultats</span>
      <div className="flex gap-2">
        {page > 0 && <Link href={href(page - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-white/70 hover:text-white">← Précédent</Link>}
        {page < pages - 1 && <Link href={href(page + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-white/70 hover:text-white">Suivant →</Link>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-[13px] text-white/45">{children}</p>;
}

export function ErrorBox({ message, retryHref }: { message: string; retryHref: string }) {
  return (
    <Card className="border-red-500/30">
      <p className="text-sm text-red-400">Impossible de charger les données : {message}</p>
      <Link href={retryHref} className="mt-3 inline-block rounded-lg bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/15">Réessayer</Link>
    </Card>
  );
}

/** Search box as a plain GET form (server-rendered filtering). */
export function SearchForm({ action, query, placeholder, hidden = {} }: { action: string; query: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} className="flex-1 min-w-[200px] max-w-sm">
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <input
        name="q" defaultValue={query} placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#121212] px-3.5 text-[13px] outline-none placeholder:text-white/40 focus:border-white/25"
      />
    </form>
  );
}
