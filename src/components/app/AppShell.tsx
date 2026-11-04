"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clapperboard, Home, LogOut, Menu, Plus, Tag, UserRound, Wallet, X } from "lucide-react";
import { TopupSheet } from "@/components/render/Topup";

const nf = (n: number) => n.toLocaleString("fr-FR");

/** Cadre commun des pages connectées (studio, vidéos, portefeuille, compte) : menu latéral, solde, recharge. */
export default function AppShell({ name, balance: initial, currency, isAdmin, signOut, children }: {
  name: string; balance: number; currency: string; isAdmin: boolean; signOut: () => Promise<void>; children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState(initial);
  const [menu, setMenu] = useState(false);
  const [topup, setTopup] = useState<{ need?: number } | null>(null);
  useEffect(() => setBalance(initial), [initial]);
  useEffect(() => setMenu(false), [path]);
  // Le studio annonce les débits/remboursements et peut demander une recharge.
  useEffect(() => {
    const onBalance = (e: Event) => setBalance((e as CustomEvent<number>).detail);
    const onTopup = (e: Event) => setTopup({ need: (e as CustomEvent<number | undefined>).detail });
    window.addEventListener("sz:balance", onBalance);
    window.addEventListener("sz:topup", onTopup);
    return () => { window.removeEventListener("sz:balance", onBalance); window.removeEventListener("sz:topup", onTopup); };
  }, []);

  const label = isAdmin ? "Admin · gratuit" : `${nf(balance)} ${currency}`;
  const item = (href: string, icon: React.ReactNode, text: string) => {
    const on = href === "/studio" || href === "/" ? path === href : path.startsWith(href);
    return (
      <Link href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${on ? "bg-[#f6ebdc] text-ink" : "text-ink/80 hover:bg-[#f6ebdc]"}`}>{icon} {text}</Link>
    );
  };
  const newVideo = () => {
    if (path === "/studio") window.dispatchEvent(new Event("sz:new-video"));
    else router.push("/studio");
    setMenu(false);
  };

  const side = (
    <div className="flex h-full flex-col">
      <Link href="/" className="px-2 pb-6 pt-1 text-xl font-extrabold tracking-tight">Soko<span className="text-brand">zia</span></Link>
      <nav className="space-y-1 text-[15px] font-medium">
        <button onClick={newVideo} className="flex w-full items-center gap-3 rounded-xl bg-brand px-3 py-2.5 font-semibold text-white"><Plus size={18} /> Nouvelle vidéo</button>
        {item("/mes-videos", <Clapperboard size={18} />, "Mes vidéos")}
        {item("/portefeuille", <Wallet size={18} />, "Portefeuille")}
        {item("/compte", <UserRound size={18} />, "Mon compte")}
        {item("/tarifs", <Tag size={18} />, "Tarifs")}
        {item("/", <Home size={18} />, "Site Sokozia")}
      </nav>
      <div className="mt-auto space-y-2 pt-4">
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mon solde</p>
          <p className="mt-0.5 text-xl font-extrabold">{label}</p>
          <button onClick={() => setTopup({})} className="mt-2 w-full rounded-full bg-brand py-2 text-sm font-semibold text-white">Recharger</button>
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand">{(name || "?").charAt(0).toUpperCase()}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name || "Mon compte"}</span>
          <form action={signOut}><button title="Se déconnecter" aria-label="Se déconnecter" className="rounded-lg p-1.5 text-muted hover:bg-[#f6ebdc] hover:text-ink"><LogOut size={16} /></button></form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-bg">
      <aside className="hidden w-[260px] shrink-0 border-r border-line bg-[#fcf4e9] p-3 md:block">{side}</aside>
      {menu && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[#fcf4e9] p-3 shadow-2xl">
            <button onClick={() => setMenu(false)} className="absolute right-3 top-3 rounded-lg p-1.5" aria-label="Fermer"><X size={20} /></button>
            {side}
          </aside>
        </div>
      )}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-3 py-2 backdrop-blur md:hidden">
          <button onClick={() => setMenu(true)} className="rounded-lg p-2" aria-label="Menu"><Menu size={20} /></button>
          <Link href="/studio" className="font-extrabold">Soko<span className="text-brand">zia</span></Link>
          <button onClick={() => setTopup({})} className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold"><Wallet size={14} /> {isAdmin ? "Admin" : `${nf(balance)} ${currency}`}</button>
        </header>
        {children}
      </main>
      <TopupSheet open={!!topup} need={topup?.need} currencyLabel={currency} onClose={() => setTopup(null)} />
    </div>
  );
}
