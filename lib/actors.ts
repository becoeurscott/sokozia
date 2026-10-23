/**
 * The Sokozia creators. Portraits live in /public/actors/<id>.jpg once
 * generated (scripts/seed-actors.ts); until then an SVG avatar is served.
 */
export interface Actor {
  id: string;
  name: string;
  country: string;
  flag: string;
  niche: string;
  gender: "f" | "m";
  age: string;
  /** Short line used in the brief and in the Higgsfield prompt. */
  look: string;
  voice: string;
}

export const ACTORS: Actor[] = [
  { id: "aicha", name: "Aïcha", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Beauté", gender: "f", age: "24", look: "jeune femme ivoirienne, peau foncée lumineuse, tresses, sourire chaleureux", voice: "douce et enjouée" },
  { id: "kofi", name: "Kofi", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Tech & téléphones", gender: "m", age: "28", look: "jeune homme ivoirien, lunettes fines, chemise moderne, énergique", voice: "claire et rapide" },
  { id: "fatou", name: "Fatou", country: "Sénégal", flag: "🇸🇳", niche: "Mode wax", gender: "f", age: "30", look: "femme sénégalaise élégante, tenue wax colorée, foulard assorti", voice: "posée et élégante" },
  { id: "moussa", name: "Moussa", country: "Mali", flag: "🇲🇱", niche: "Marché & bons plans", gender: "m", age: "35", look: "homme malien souriant, boubou simple, au marché, très sympathique", voice: "chaleureuse et drôle" },
  { id: "nneka", name: "Nneka", country: "Nigeria", flag: "🇳🇬", niche: "Coiffure", gender: "f", age: "26", look: "jeune femme nigériane, coiffure soignée, maquillage net, salon de coiffure", voice: "pétillante" },
  { id: "chinedu", name: "Chinedu", country: "Nigeria", flag: "🇳🇬", niche: "Humour", gender: "m", age: "27", look: "jeune homme nigérian expressif, t-shirt coloré, mimiques comiques", voice: "très expressive" },
  { id: "mariam", name: "Mariam", country: "Mali", flag: "🇲🇱", niche: "Cuisine", gender: "f", age: "38", look: "femme malienne en cuisine, tablier, gestes généreux, sourire maternel", voice: "rassurante" },
  { id: "yao", name: "Yao", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Livraison & quartier", gender: "m", age: "25", look: "jeune livreur ivoirien, casque de moto à la main, gilet, dans la rue", voice: "directe et amicale" },
  { id: "grace", name: "Grâce", country: "RD Congo", flag: "🇨🇩", niche: "Bien-être", gender: "f", age: "32", look: "femme congolaise sereine, tenue claire, lumière naturelle", voice: "calme et apaisante" },
  { id: "emeka", name: "Émeka", country: "Nigeria", flag: "🇳🇬", niche: "Gaming & tech", gender: "m", age: "23", look: "jeune homme nigérian, casque gaming autour du cou, LED en fond", voice: "dynamique" },
  { id: "khady", name: "Khady", country: "Sénégal", flag: "🇸🇳", niche: "Vie étudiante", gender: "f", age: "21", look: "étudiante sénégalaise, sac à dos, campus, naturelle et spontanée", voice: "spontanée" },
  { id: "ibrahima", name: "Ibrahima", country: "Sénégal", flag: "🇸🇳", niche: "Vie de famille", gender: "m", age: "40", look: "père de famille sénégalais, polo, salon familial, bienveillant", voice: "posée et sincère" },
  { id: "adjoa", name: "Adjoa", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Art & design", gender: "f", age: "29", look: "femme ivoirienne créative, bijoux artisanaux, atelier coloré", voice: "inspirante" },
  { id: "tshiala", name: "Tshiala", country: "RD Congo", flag: "🇨🇩", niche: "Maison", gender: "f", age: "34", look: "femme congolaise accueillante, intérieur moderne, déco soignée", voice: "accueillante" },
  { id: "amina", name: "Amina", country: "Cameroun", flag: "🇨🇲", niche: "Commerce & business", gender: "f", age: "31", look: "entrepreneuse camerounaise, blazer, boutique en fond, assurée", voice: "assurée et pro" },
  { id: "wanjiru", name: "Wanjiru", country: "Kenya", flag: "🇰🇪", niche: "Luxe & élégance", gender: "f", age: "33", look: "femme kényane élégante, robe de soirée, lumière douce, luxe discret", voice: "raffinée" },
];

export function getActor(id: string | null | undefined): Actor | undefined {
  return ACTORS.find((a) => a.id === id);
}

/** Deterministic pastel per actor for the fallback avatar. */
const PALETTE = ["#f4b183", "#9fd3b6", "#f7d08a", "#c7b6e6", "#8fc9e8", "#f29ca4", "#b8d98d", "#ffc4a3"];

export function actorColor(actor: Actor): string {
  let h = 0;
  for (const c of actor.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Picks a creator from product text when the user hasn't chosen one. */
export function suggestActor(text: string): Actor {
  const t = text.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/perruque|coiff|tresse|lace|wig/, "nneka"],
    [/karit|savon|cr[eè]me|beaut|peau|maquill|cosm/, "aicha"],
    [/t[eé]l[eé]phone|iphone|samsung|tech|ordinateur|pc|laptop|écouteur|ecouteur/, "kofi"],
    [/jeu|gaming|console|playstation/, "emeka"],
    [/wax|pagne|boubou|mode|robe|v[eê]tement|couture|tenue/, "fatou"],
    [/resto|restaurant|poulet|plat|cuisine|garba|attiéké|attieke|maquis|repas/, "mariam"],
    [/livr|coursier|commande|whatsapp/, "yao"],
    [/appart|maison|louer|immobil|meuble|déco|deco/, "tshiala"],
    [/étudiant|etudiant|campus|cours|formation/, "khady"],
    [/famille|enfant|bébé|bebe|école|ecole/, "ibrahima"],
    [/luxe|bijou|montre|parfum|élégan|elegan/, "wanjiru"],
    [/business|commerce|boutique|grossiste|import/, "amina"],
    [/bien-être|bien etre|yoga|tisane|santé|sante/, "grace"],
    [/art|design|tableau|artisan/, "adjoa"],
    [/promo|prix|bon plan|march[eé]|solde/, "moussa"],
    [/humour|drôle|drole|blague/, "chinedu"],
  ];
  for (const [re, id] of rules) if (re.test(t)) return getActor(id)!;
  return getActor("amina")!;
}
