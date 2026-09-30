import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getSession } from "@/lib/insforge";
import { signOut } from "./actions";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sokozia — Vidéos pub UGC par IA",
  description: "Crée des vidéos publicitaires avec des visages africains en quelques minutes. Paiement Mobile Money.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getSession();
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              Soko<span className="text-brand">zia</span>
            </Link>
            <div className="flex items-center gap-2 text-sm font-medium sm:gap-4">
              <Link href="/tarifs" className="hidden sm:inline">Tarifs</Link>
              {profile ? (
                <>
                  <Link href="/mes-videos" className="hidden sm:inline">Mes vidéos</Link>
                  {profile.is_admin && <Link href="/admin">Admin</Link>}
                  <Link href="/studio" className="btn !px-4 !py-2">Créer</Link>
                  <form action={signOut}><button className="text-muted">Sortir</button></form>
                </>
              ) : (
                <>
                  <Link href="/connexion">Connexion</Link>
                  <Link href="/inscription" className="btn !px-4 !py-2">Commencer</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line py-8 text-center text-sm text-muted">
          © {new Date().getFullYear()} Sokozia · <Link href="/cgu" className="underline">Conditions générales</Link> · <Link href="/confidentialite" className="underline">Confidentialité</Link> · <a href="mailto:support@sokozia.com" className="underline">support@sokozia.com</a>
        </footer>
      </body>
    </html>
  );
}
