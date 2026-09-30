"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

type Item = { href: string; label: string };

// Liens du site : en ligne sur grand écran, menu déroulant sur téléphone.
export default function NavMenu({ items, cta, signOut }: { items: Item[]; cta: Item; signOut?: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => (path === href || (href !== "/" && path.startsWith(href)) ? "text-brand" : "");

  return (
    <div className="flex items-center gap-2 text-sm font-medium sm:gap-5">
      {items.map((i) => <Link key={i.href} href={i.href} className={`hidden sm:inline ${active(i.href)}`}>{i.label}</Link>)}
      <Link href={cta.href} className="btn !px-4 !py-2">{cta.label}</Link>
      {signOut && <form action={signOut} className="hidden sm:block"><button className="text-muted">Sortir</button></form>}
      <button onClick={() => setOpen(!open)} className="rounded-lg p-2 sm:hidden" aria-label="Menu" aria-expanded={open}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-14 border-b border-line bg-bg px-4 pb-4 shadow-lg sm:hidden">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`block border-b border-line py-3 text-base ${active(i.href)}`}>{i.label}</Link>
          ))}
          {signOut && <form action={signOut}><button className="py-3 text-base text-muted">Sortir</button></form>}
        </div>
      )}
    </div>
  );
}
