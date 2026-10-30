import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { NavProgress } from "@/components/ui/NavProgress";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Sokozia — Vidéos pub UGC par IA",
  description:
    "Décris ton produit, choisis un créateur africain, et Sokozia crée ta vidéo pub pour TikTok, WhatsApp et Facebook en quelques minutes. Paiement Mobile Money.",
  openGraph: {
    title: "Sokozia — Tes vidéos pub avec des visages africains",
    description:
      "Pas d'acteur, pas de caméra, pas de montage. Ta première pub en quelques minutes.",
    siteName: "Sokozia",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${jakarta.variable} ${serif.variable}`}>
      <body className="min-h-full">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
