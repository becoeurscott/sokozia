"use client";

import { ArrowLeft, BadgeDollarSign, Clapperboard, LayoutGrid, ScrollText, Settings2, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Vue d’ensemble", short: "Accueil", icon: LayoutGrid },
  { href: "/admin/utilisateurs", label: "Utilisateurs", short: "Comptes", icon: Users },
  { href: "/admin/pubs", label: "Pubs créées", short: "Pubs", icon: Clapperboard },
  { href: "/admin/paiements", label: "Paiements", short: "Paiements", icon: Smartphone },
  { href: "/admin/tarifs", label: "Styles et tarifs", short: "Tarifs", icon: BadgeDollarSign },
  { href: "/admin/higgsfield", label: "Higgsfield", short: "Budget", icon: Settings2 },
  { href: "/admin/journal", label: "Journal", short: "Journal", icon: ScrollText },
];

export function AdminNav({ admin }: { admin: { name: string; email: string } }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <>
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b0b] p-3 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 py-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#f08a3c] font-black text-black">S</span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Sokozia</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f08a3c]">Admin</span>
          </span>
        </Link>
        <nav className="mt-6 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors", active(href) ? "bg-white/[0.08] text-white" : "text-white/70 hover:bg-white/[0.04] hover:text-white")}>
              <Icon className={cn("size-4", active(href) && "text-[#f08a3c]")} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/studio" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-white/45 hover:text-white"><ArrowLeft className="size-3.5" /> Retour à l&apos;app</Link>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f08a3c] to-amber-300 text-[12px] font-bold text-black">{(admin.name || admin.email).slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12px] font-medium">{admin.name || admin.email.split("@")[0]}</span>
              <span className="block truncate text-[11px] text-white/45">{admin.email}</span>
            </span>
          </div>
        </div>
      </aside>
      {/* Téléphones : barre d'onglets en bas */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/[0.08] bg-black/90 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur-xl lg:hidden">
        {NAV.map(({ href, short, icon: Icon }) => (
          <Link key={href} href={href} className={cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px]", active(href) ? "text-[#f08a3c]" : "text-white/45")}>
            <Icon className="size-5" /><span className="max-w-full truncate">{short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
