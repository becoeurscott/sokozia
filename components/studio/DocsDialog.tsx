"use client";

import { Dialog } from "@/components/ui/Dialog";
import { useStudio } from "./StudioProvider";
import { STYLE_ORDER, STYLES, formatFcfa, fromPrice } from "@/lib/models";

const FAQ: Array<[string, string]> = [
  ["Je dois savoir faire des vidéos ?", "Non. Tu décris ton produit comme sur WhatsApp. Awa écrit le script, tu choisis le créateur, la durée et le style, et la vidéo se crée toute seule."],
  ["Comment je paye ?", "Par Mobile Money : Orange Money, MTN MoMo, Moov, Wave, Airtel, M-Pesa. Tu payes chaque vidéo au moment de la créer, selon le style et la durée. Pas d'abonnement."],
  ["Combien de temps ça prend ?", "Le brief est instantané. La vidéo prend de 1 à 6 minutes selon le style. Tu peux fermer la page : elle t'attend dans la Bibliothèque."],
  ["Et si la vidéo ne marche pas ?", "Si une vidéo payée échoue, tu la relances gratuitement en un clic."],
  ["Je peux l'utiliser pour mes pubs ?", "Oui. Les vidéos sont à toi : TikTok, Reels, WhatsApp, Facebook, statut, boutique en ligne."],
  ["Mes photos produit servent à quoi ?", "Ajoute une photo nette de ton produit : le créateur le tiendra en main et le montrera à la caméra."],
];

export function DocsDialog() {
  const studio = useStudio();
  return (
    <Dialog open={studio.dialog === "docs"} onClose={studio.closeDialog} width="max-w-2xl" title="Comment ça marche">
      <ol className="mb-6 space-y-3">
        {[
          ["Parle de ton produit", "Décris-le, colle un lien ou ajoute une photo. Awa, notre directrice de création, prépare un brief en quelques secondes."],
          ["Choisis ton créateur et le style", "16 créateurs africains. Choisis la durée (5 à 15 s, jusqu'à 30 s en Éclair) et le style selon ton budget : le prix s'affiche avant de payer."],
          ["Valide et crée", "Paye la vidéo par Mobile Money. Elle se tourne et apparaît directement dans la conversation."],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
            <div>
              <div className="font-semibold">{t}</div>
              <div className="text-sm text-muted">{d}</div>
            </div>
          </li>
        ))}
      </ol>

      <h3 className="mb-2 font-bold">Les 4 styles</h3>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {STYLE_ORDER.map((s) => (
          <div key={s} className="rounded-xl border border-line bg-bg p-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{STYLES[s].name}</span>
              <span className="text-sm font-semibold text-brand">dès {formatFcfa(fromPrice(s))}</span>
            </div>
            <div className="text-xs text-muted">{STYLES[s].description}</div>
          </div>
        ))}
      </div>

      <h3 className="mb-2 font-bold">Questions fréquentes</h3>
      <div className="divide-y divide-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-2">
            <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">{q}</summary>
            <p className="mt-1 text-sm text-muted">{a}</p>
          </details>
        ))}
      </div>
    </Dialog>
  );
}
