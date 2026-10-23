import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/" className="hover:text-brand">
              Accueil
            </Link>
            <Link href="/tarifs" className="hover:text-brand">
              Tarifs
            </Link>
            <Link href="/login" className="hover:text-brand">
              Connexion
            </Link>
          </nav>
          <Button href="/studio">Commencer</Button>
        </div>
      </header>
      {children}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted md:flex-row">
          <Logo size="sm" />
          <div className="flex gap-5">
            <Link href="/tarifs" className="hover:text-ink">
              Tarifs
            </Link>
            <Link href="/studio/modeles" className="hover:text-ink">
              Modèles
            </Link>
            <Link href="/studio" className="hover:text-ink">
              Studio
            </Link>
          </div>
          <div>© {new Date().getFullYear()} Sokozia · Paiement Mobile Money</div>
        </div>
      </footer>
    </div>
  );
}
