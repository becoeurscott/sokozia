// Formats de pub UGC (les 10 exemples de la page d'accueil). Awa propose ses idées à partir de ces formats,
// et la description anglaise guide la mise en scène de la vidéo.
export type AdFormat = { id: string; label: string; clip: string; when: string; direction: string };

export const FORMATS: AdFormat[] = [
  { id: "temoignage", label: "Témoignage", clip: "temoignage-karite", when: "beauté, santé, tout produit qu'on utilise au quotidien",
    direction: "Selfie testimonial: creator talks straight to camera like to a friend, shows the product close to the lens, one honest personal result, warm smile, natural home light." },
  { id: "deballage", label: "Déballage", clip: "unboxing-telephone", when: "téléphones, électronique, colis, cadeaux",
    direction: "Unboxing: hands open the package on a table, close-ups of the product reveal, creator's genuine surprise, quick demo of the key feature, ends holding the product to camera." },
  { id: "avant-apres", label: "Avant / après", clip: "avant-apres-savon-noir", when: "cosmétiques, ménage, réparation, transformation visible",
    direction: "Before/after: start with the problem shown honestly, a clean cut to the result after using the product, creator points at the difference, product shown in hand at the end." },
  { id: "grwm", label: "Prépare-toi avec moi", clip: "grwm-perruque", when: "coiffure, mode, maquillage, accessoires",
    direction: "Get-ready-with-me: creator in front of a mirror or phone, step-by-step routine using the product, chatty tone, final look reveal with a little turn." },
  { id: "vendeuse", label: "Vendeuse au marché", clip: "vendeuse-marche-wax", when: "pagnes, tissus, produits vendus en boutique ou au marché",
    direction: "Market seller pitch: creator at her stall surrounded by products, enthusiastic sales talk, holds up the product, lively market background sounds." },
  { id: "degustation", label: "Dégustation", clip: "degustation-maquis", when: "restaurants, plats, boissons, épicerie",
    direction: "Tasting: creator at the table, first bite or sip on camera, real reaction, close-up of the food, tells where to find it." },
  { id: "micro-trottoir", label: "Micro-trottoir", clip: "micro-trottoir-garba", when: "notoriété, produits populaires, événements",
    direction: "Street interview: creator holds a small microphone and asks a passer-by about the product, quick answers, product shown in the street, energetic." },
  { id: "promo-fete", label: "Promo fête", clip: "promo-tabaski", when: "Tabaski, Noël, fêtes, soldes, offres limitées",
    direction: "Festive promo: creator in festive outfit announces a limited-time offer, shows the product, urgency in the voice, clear call to action." },
  { id: "livraison", label: "Livraison", clip: "livraison-whatsapp", when: "vente en ligne, WhatsApp, livraison à domicile",
    direction: "Delivery: courier hands over the package at the door, creator opens it happily, mentions ordering on WhatsApp and fast delivery." },
  { id: "atelier", label: "Atelier", clip: "atelier-couture", when: "artisans, couture, fabrication, savoir-faire",
    direction: "Workshop: creator in their workshop shows how the product is made, hands at work, pride in the craft, finished product shown at the end." },
];

export const findFormat = (id: string | null | undefined) => FORMATS.find((f) => f.id === id);
