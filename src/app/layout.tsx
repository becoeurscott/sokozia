import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getSession } from "@/lib/insforge";
import { signOut } from "./actions";
import NavMenu from "@/components/NavMenu";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

// interactive-widget : sur Android, le clavier réduit la page au lieu de la recouvrir.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content", themeColor: "#fffaf3" };

export const metadata: Metadata = {
  title: "Sokozia — Vidéos pub UGC par IA",
  description: "Crée des vidéos publicitaires avec des visages africains en quelques minutes. Paiement Mobile Money.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getSession();
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              Soko<span className="text-brand">zia</span>
            </Link>
            {profile ? (
              <NavMenu
                items={[
                  { href: "/tableau-de-bord", label: "Tableau de bord" },
                  { href: "/studio", label: "Studio" },
                  { href: "/mes-videos", label: "Mes vidéos" },
                  { href: "/tarifs", label: "Tarifs" },
                  { href: "/compte", label: "Mon compte" },
                ]}
                cta={{ href: "/studio", label: "Créer" }}
                signOut={signOut}
              />
            ) : (
              <NavMenu
                items={[{ href: "/", label: "Accueil" }, { href: "/tarifs", label: "Tarifs" }, { href: "/connexion", label: "Connexion" }]}
                cta={{ href: "/inscription", label: "Commencer" }}
              />
            )}
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
