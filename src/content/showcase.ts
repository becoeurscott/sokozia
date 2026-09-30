// Exemples affichés sur la page d'accueil. Dépose les fichiers dans public/showcase/
// (vidéos .mp4 verticales 9:16, ou images .jpg). Les vidéos jouent en boucle, sans son.
export type ShowcaseItem = { type: "video" | "image"; src: string; poster?: string; handle: string; caption: string; category: string };

export const showcase: ShowcaseItem[] = [
  // { type: "video", src: "/showcase/perruques.mp4", handle: "mama_wax", caption: "Ce pagne est trop doux, livraison à Douala", category: "Mode" },
];

// Cartes affichées tant qu'il n'y a pas encore de médias.
export const placeholders = [
  { handle: "mama_wax", caption: "Ce pagne est trop doux, livraison à Douala", category: "Mode", tone: "from-amber-500 via-orange-600 to-rose-800" },
  { handle: "chez_tantie", caption: "Le meilleur ndolé d'Akwa, je vous jure", category: "Restaurant", tone: "from-emerald-500 via-teal-700 to-slate-900" },
  { handle: "glow.abj", caption: "7 jours avec cette crème, regardez ma peau", category: "Beauté", tone: "from-fuchsia-500 via-purple-700 to-indigo-900" },
  { handle: "tech.dkr", caption: "Déballage du nouveau téléphone, prix choc", category: "Électronique", tone: "from-sky-500 via-blue-700 to-slate-900" },
  { handle: "immo.kin", caption: "Appartement 3 pièces à Gombe, visite rapide", category: "Immobilier", tone: "from-stone-400 via-stone-600 to-stone-900" },
  { handle: "bijoux.lome", caption: "Nouvelle collection, stock limité", category: "Accessoires", tone: "from-yellow-400 via-amber-600 to-orange-900" },
];
