// Exemples affichés sur la page d'accueil. Dépose les fichiers dans public/showcase/
// (vidéos .mp4 verticales 9:16, ou images .jpg). Les vidéos jouent en boucle, sans son.
export type ShowcaseItem = { type: "video" | "image"; src: string; poster?: string; handle: string; caption: string; category: string };

// Exemples de pubs UGC (fichiers dans public/showcase/ugc/ : une vidéo .mp4 + sa couverture .jpg).
export const showcase: ShowcaseItem[] = [
  { type: "video", src: "/showcase/ugc/vendeuse-marche-wax.mp4", poster: "/showcase/ugc/vendeuse-marche-wax.jpg", handle: "mama_wax", caption: "Ce pagne wax est trop doux, livraison partout à Douala", category: "Mode" },
  { type: "video", src: "/showcase/ugc/temoignage-karite.mp4", poster: "/showcase/ugc/temoignage-karite.jpg", handle: "karite.dor", caption: "Mon karité pur, ma peau n'a jamais été aussi douce", category: "Beauté" },
  { type: "video", src: "/showcase/ugc/unboxing-telephone.mp4", poster: "/showcase/ugc/unboxing-telephone.jpg", handle: "tech.abj", caption: "Déballage du nouveau téléphone, prix choc cette semaine", category: "Électronique" },
  { type: "video", src: "/showcase/ugc/promo-tabaski.mp4", poster: "/showcase/ugc/promo-tabaski.jpg", handle: "boutique.dakar", caption: "Spécial Tabaski : ton boubou prêt pour la fête", category: "Mode" },
  { type: "video", src: "/showcase/ugc/grwm-perruque.mp4", poster: "/showcase/ugc/grwm-perruque.jpg", handle: "glow.kmer", caption: "Prépare-toi avec moi : ma perruque en 2 minutes", category: "Coiffure" },
  { type: "video", src: "/showcase/ugc/degustation-maquis.mp4", poster: "/showcase/ugc/degustation-maquis.jpg", handle: "chez_tantie", caption: "On goûte le poulet braisé du maquis, je vous jure", category: "Restaurant" },
  { type: "video", src: "/showcase/ugc/micro-trottoir-garba.mp4", poster: "/showcase/ugc/micro-trottoir-garba.jpg", handle: "garba.ci", caption: "Micro-trottoir : c'est quoi le meilleur garba d'Abidjan ?", category: "Restaurant" },
  { type: "video", src: "/showcase/ugc/livraison-whatsapp.mp4", poster: "/showcase/ugc/livraison-whatsapp.jpg", handle: "livre.vite", caption: "Commande sur WhatsApp, livré chez toi en 2 heures", category: "Livraison" },
  { type: "video", src: "/showcase/ugc/atelier-couture.mp4", poster: "/showcase/ugc/atelier-couture.jpg", handle: "atelier.lome", caption: "Dans mon atelier : ta tenue sur mesure en 3 jours", category: "Couture" },
  { type: "video", src: "/showcase/ugc/avant-apres-savon-noir.mp4", poster: "/showcase/ugc/avant-apres-savon-noir.jpg", handle: "savon.noir", caption: "Avant / après : 14 jours avec le savon noir", category: "Beauté" },
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
