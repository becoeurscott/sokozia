"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquarePen, Library, Boxes, BookOpen, UserRoundPlus, LogIn, PanelLeftClose, PanelRightOpen, X, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useStudio } from "./StudioProvider";
import { useWallet } from "@/lib/client/useWallet";
import { formatFcfa } from "@/lib/models";

export function Sidebar() {
  const studio = useStudio();
  const pathname = usePathname();
  const { collapsed, setCollapsed, sidebarOpen, setSidebarOpen, user, threads } = studio;
  const { balance } = useWallet(Boolean(user));

  const item = (active: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${active ? "bg-hover text-ink" : "text-ink/80 hover:bg-hover hover:text-ink"} ${collapsed ? "justify-center px-0" : ""}`;

  const nav = (
    <>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-2 pb-4 pt-1`}>
        {!collapsed && <Logo href="/studio" />}
        <button
          className="hidden rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink md:block"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          title={collapsed ? "Ouvrir" : "Réduire"}
        >
          {collapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <button className="rounded-lg p-1.5 text-muted hover:bg-hover md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="space-y-1">
        <Link href="/studio" className={item(pathname === "/studio")} onClick={() => setSidebarOpen(false)} title="Nouvel agent">
          <SquarePen className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Nouvel agent"}
        </Link>
        <button className={item(false)} onClick={() => (user ? studio.openDialog("library") : studio.openDialog("auth", { authMode: "login" }))} title="Bibliothèque">
          <Library className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Bibliothèque"}
        </button>
        <Link href="/studio/modeles" className={item(pathname.startsWith("/studio/modeles"))} onClick={() => setSidebarOpen(false)} title="Modèles">
          <Boxes className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Modèles"}
        </Link>
        <button className={item(false)} onClick={() => studio.openDialog("docs")} title="Docs">
          <BookOpen className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Docs"}
        </button>
      </nav>

      {!collapsed && user && threads.length > 0 && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Conversations récentes</div>
          <ul className="space-y-0.5">
            {threads.map((t) => {
              const active = pathname === `/studio/c/${t.id}`;
              return (
                <li key={t.id}>
                  <Link href={`/studio/c/${t.id}`} onClick={() => setSidebarOpen(false)} className={`block truncate rounded-lg px-3 py-2 text-sm ${active ? "bg-hover font-semibold" : "text-ink/75 hover:bg-hover"}`} title={t.title}>
                    {t.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-auto space-y-2 pt-4">
        {user ? (
          <>
            {!collapsed && (
              <Link href="/compte" className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 hover:bg-hover" onClick={() => setSidebarOpen(false)}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{user.name || user.email}</span>
                  <span className="block text-xs text-muted">{balance === null ? "Mon compte · paiements" : `Solde : ${formatFcfa(balance)}`}</span>
                </span>
              </Link>
            )}
            <button className={item(false)} onClick={studio.signOut} title="Déconnexion">
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && "Déconnexion"}
            </button>
          </>
        ) : (
          <>
            <button
              className={`flex w-full items-center justify-center gap-2 rounded-pill bg-ink font-semibold text-white transition hover:bg-black ${collapsed ? "h-10 w-10 mx-auto" : "h-11"}`}
              onClick={() => studio.openDialog("auth", { authMode: "signup" })}
              title="S'inscrire"
            >
              <UserRoundPlus className={`h-[18px] w-[18px] ${collapsed ? "" : "hidden"}`} />
              {!collapsed && "S'inscrire"}
            </button>
            <button className={item(false)} onClick={() => studio.openDialog("auth", { authMode: "login" })} title="Se connecter">
              <LogIn className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && "Se connecter"}
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden h-dvh shrink-0 flex-col border-r border-line bg-side p-3 transition-[width] duration-200 md:flex ${collapsed ? "w-[68px]" : "w-[260px]"}`}>{nav}</aside>
      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setSidebarOpen(false)} />
          <aside className="fade-up absolute inset-y-0 left-0 flex w-[280px] flex-col bg-side p-3 shadow-2xl">{nav}</aside>
        </div>
      )}
    </>
  );
}
