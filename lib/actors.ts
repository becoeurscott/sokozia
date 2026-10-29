/**
 * The 26 Sokozia creators (AI characters). Their files live in
 * public/creators/<files>/: portrait.jpg (cards), sheet.jpg (character
 * sheet sent as the identity reference with every video) and, for the
 * first 16, intro.mp4 (spoken introduction).
 */
export interface Actor {
  id: string;
  /** Folder under public/creators/. */
  files: string;
  name: string;
  country: string;
  flag: string;
  niche: string;
  gender: "f" | "m";
  age: string;
  /** Precise appearance (English), used in the Seedance prompt so the face stays the same. */
  look: string;
  bio: string;
  voice: string;
  /** False when the creator has no intro.mp4 yet (the card shows the portrait only). */
  intro?: boolean;
}

export const ACTORS: Actor[] = [
  { files: "creator_maya", id: "aicha", name: "Aïcha", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Beauté", gender: "f", age: "24", look: "Aïcha, 24-year-old Ivorian woman, warm deep-brown skin with a natural glow, round face, full cheeks, bright wide smile, shoulder-length box braids with a few gold cuffs, small gold hoop earrings, wearing a mustard-yellow wrap top, soft natural makeup", bio: "Routines karité, soins naturels et conseils peau. Ton chaleureux de grande sœur.", voice: "douce et enjouée" },
  { files: "creator_jordan", id: "kofi", name: "Kofi", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Tech & téléphones", gender: "m", age: "29", look: "Kofi, 29-year-old Ivorian man, dark brown skin, short fade haircut with a sharp line-up, neat short beard, rectangular black glasses, slim build, wearing a navy polo shirt with an orange collar trim, silver wristwatch", bio: "Déballages de téléphones et tests honnêtes, du marché d'Adjamé à la boutique.", voice: "claire et rapide" },
  { files: "creator_sofia", id: "fatou", name: "Fatou", country: "Sénégal", flag: "🇸🇳", niche: "Mode wax", gender: "f", age: "27", look: "Fatou, 27-year-old Senegalese woman, very dark ebony skin, tall and slender, elegant oval face, high cheekbones, wearing a colorful red-and-blue wax print head wrap (tied high), matching wax print dress, gold statement earrings", bio: "Tenues wax, essayages et transitions pour cérémonies et bureau.", voice: "posée et élégante" },
  { files: "creator_marcus", id: "moussa", name: "Moussa", country: "Mali", flag: "🇲🇱", niche: "Marché & bons plans", gender: "m", age: "31", look: "Moussa, 31-year-old Malian man, dark brown skin, bald head, full rounded beard, big expressive smile, sturdy build, wearing a light blue embroidered short-sleeve boubou shirt (bazin), cream kufi cap in his hand or on his head", bio: "Comparaisons de prix et bons plans du marché, avec beaucoup d'humour.", voice: "chaleureuse et drôle" },
  { files: "creator_priya", id: "nneka", name: "Nneka", country: "Nigeria", flag: "🇳🇬", niche: "Coiffure", gender: "f", age: "26", look: "Nneka, 26-year-old Nigerian woman, medium brown skin, heart-shaped face, long knotless braids dyed burgundy, small nose ring, bold winged eyeliner, wearing a black crop top and denim jacket", bio: "Tresses, perruques et soins des cheveux crépus. Démos pas à pas.", voice: "pétillante" },
  { files: "creator_leo", id: "chinedu", name: "Chinedu", country: "Nigeria", flag: "🇳🇬", niche: "Humour", gender: "m", age: "23", look: "Chinedu, 23-year-old Nigerian man, medium-dark brown skin, playful face, short curly high-top afro, thin mustache, gap-toothed grin, wearing a bright green oversized t-shirt and a white bucket hat", bio: "Sketchs courts où le produit arrive au bon moment. Ça fait vraiment rire.", voice: "très expressive" },
  { files: "creator_hana", id: "mariam", name: "Mariam", country: "Mali", flag: "🇲🇱", niche: "Cuisine", gender: "f", age: "30", look: "Mariam, 30-year-old Malian woman, deep brown skin, soft round face, calm kind eyes, wearing a patterned indigo bogolan (mud cloth) head scarf and a matching loose kaftan, small silver earrings", bio: "Recettes du quotidien vues du dessus, voix posée et astuces de maman.", voice: "rassurante" },
  { files: "creator_diego", id: "yao", name: "Yao", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Livraison & quartier", gender: "m", age: "34", look: "Yao, 34-year-old Ivorian man, dark skin, athletic build, short twists hairstyle, trimmed goatee, wearing a bright orange delivery-style jacket over a white t-shirt, crossbody bag", bio: "Vidéos en extérieur dans les rues d'Abidjan, produits en situation réelle.", voice: "directe et amicale" },
  { files: "creator_amara", id: "grace", name: "Grâce", country: "RD Congo", flag: "🇨🇩", niche: "Bien-être", gender: "f", age: "28", look: "Grâce, 28-year-old Congolese woman, rich dark brown skin, oval face, short natural afro (TWA) with defined curls, freckle-free glowing skin, wearing a sage-green linen shirt, wooden bead necklace", bio: "Explications simples sur les ingrédients naturels et les bonnes habitudes.", voice: "calme et apaisante" },
  { files: "creator_ethan", id: "emeka", name: "Émeka", country: "Nigeria", flag: "🇳🇬", niche: "Gaming & tech", gender: "m", age: "25", look: "Émeka, 25-year-old Nigerian man, medium brown skin, lean build, short dreadlocks tied up in a small bun, clean-shaven, wearing a black hoodie with purple gaming headphones around his neck", bio: "Tests d'accessoires, montages rythmés et avis sans détour.", voice: "dynamique" },
  { files: "creator_chloe", id: "khady", name: "Khady", country: "Sénégal", flag: "🇸🇳", niche: "Vie étudiante", gender: "f", age: "22", look: "Khady, 22-year-old Senegalese woman, dark skin, youthful round face, big curious eyes, high puff natural hair with a yellow scrunchie, wearing an oversized light-grey university sweatshirt, small backpack", bio: "Angle petit budget et vie de campus à Dakar, très authentique.", voice: "spontanée" },
  { files: "creator_noah", id: "ibrahima", name: "Ibrahima", country: "Sénégal", flag: "🇸🇳", niche: "Vie de famille", gender: "m", age: "36", look: "Ibrahima, 36-year-old Senegalese man, dark ebony skin, tall, short cropped hair with a little grey at the temples, short neat beard, warm fatherly smile, wearing a beige kaftan (grand boubou top) with subtle embroidery", bio: "Démos pratiques à la maison avec les enfants, une touche d'humour.", voice: "posée et sincère" },
  { files: "creator_yuki", id: "adjoa", name: "Adjoa", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Art & design", gender: "f", age: "27", look: "Adjoa, 27-year-old Ivorian woman, light-brown skin, angular face, short platinum-blonde buzz cut, bold geometric earrings, colorful kente-pattern jacket over a black top, creative artist look", bio: "Mises en scène produit colorées, pagnes et boucles en stop-motion.", voice: "inspirante" },
  { files: "creator_isabella", id: "tshiala", name: "Tshiala", country: "RD Congo", flag: "🇨🇩", niche: "Maison", gender: "f", age: "33", look: "Tshiala, 33-year-old Congolese woman, deep brown skin, gentle smile, shoulder-length straight black wig with bangs, wearing a coral-pink blouse and a patterned apron in the kitchen", bio: "Produits mis en scène dans la cuisine et la salle de bain, ton rassurant.", voice: "accueillante" },
  { files: "creator_samuel", id: "amina", name: "Amina", country: "Cameroun", flag: "🇨🇲", niche: "Commerce & business", gender: "f", age: "40", look: "Amina, 40-year-old Cameroonian businesswoman, dark brown skin, confident mature face, short sleek bob haircut, pearl earrings, wearing a tailored emerald-green blazer over a patterned ndop-inspired top", bio: "Conseils aux commerçantes et avis francs sur le rapport qualité-prix.", voice: "assurée et pro" },
  { files: "creator_zara", id: "wanjiru", name: "Wanjiru", country: "Kenya", flag: "🇰🇪", niche: "Luxe & élégance", gender: "f", age: "29", look: "Wanjiru, 29-year-old Kenyan woman, rich brown skin, long elegant neck, sharp cheekbones, sleek low bun with a middle part, minimal gold jewelry, wearing a champagne satin slip dress with a cream tailored blazer", bio: "Finition éditoriale, révélations lentes et cadrages élégants.", voice: "raffinée" },
  // The 10 creators below have a portrait and a character sheet but no intro video yet.
  { files: "creator_coumba", id: "coumba", name: "Coumba", country: "Sénégal", flag: "🇸🇳", niche: "Mariage & cérémonies", gender: "f", age: "26", look: "Coumba, 26-year-old Senegalese woman, dark ebony skin, elegant oval face with defined cheekbones, warm genuine smile, waist-length goddess locs (bohemian locs with soft curly ends) swept over one shoulder with thin gold cuffs, gold drop earrings, wearing a champagne-gold lace tailored midi dress with a high neckline and delicate embroidery, gold strappy heels", bio: "Tenues de cérémonie, baptêmes et mariages : élégance et émotion.", voice: "douce et raffinée", intro: false },
  { files: "creator_nadege", id: "nadege", name: "Nadège", country: "Cameroun", flag: "🇨🇲", niche: "Sport & fitness", gender: "f", age: "27", look: "Nadège, 27-year-old Cameroonian woman, medium-deep brown skin, athletic toned build, defined jawline, bright confident smile, sleek high braided ponytail (one long braid down her back) with laid edges, small gold stud earrings, wearing a lilac zip-up training jacket with a white stripe, matching lilac leggings and white sneakers", bio: "Routines sport, compléments et tenues de training, énergie à fond.", voice: "énergique et motivante", intro: false },
  { files: "creator_binta", id: "binta", name: "Binta", country: "Guinée", flag: "🇬🇳", niche: "Bijoux & accessoires", gender: "f", age: "25", look: "Binta, 25-year-old Guinean woman, deep dark-brown skin, heart-shaped face with high cheekbones, playful closed-lip smile, short tapered natural coils dyed honey blonde, oversized gold hoop earrings and layered gold chain necklaces, bold berry lipstick, wearing a fuchsia-pink satin puff-sleeve blouse tucked into high-waisted black wide-leg trousers, gold strappy sandals", bio: "Bijoux, sacs et accessoires en gros plan, avec beaucoup de style.", voice: "pétillante et chic", intro: false },
  { files: "creator_ange", id: "ange", name: "Ange", country: "Côte d'Ivoire", flag: "🇨🇮", niche: "Ongles & beauté des mains", gender: "f", age: "23", look: "Ange, 23-year-old Ivorian woman, warm medium-brown skin, soft oval face, sweet open smile, long silky jet-black straight hair with a middle part falling past her chest, small gold huggie earrings, long almond nails in glossy baby pink, soft glam makeup with glossy pink lips, wearing a baby-pink ribbed knit sweater with a matching baby-pink knit midi skirt and white sneakers", bio: "Nail art, soins des mains et unboxings girly, très gros plans.", voice: "douce et girly", intro: false },
  { files: "creator_rokhaya", id: "rokhaya", name: "Rokhaya", country: "Sénégal", flag: "🇸🇳", niche: "Maternité & bébé", gender: "f", age: "31", look: "Rokhaya, 31-year-old Senegalese woman, dark brown skin, serene round-oval face, gentle motherly smile, traditional Fulani braids with a center braid, long braids decorated with small amber beads, cowrie shells and silver rings, small silver earrings, wearing a flowing full-length white cotton boubou with rich gold embroidery at the neckline, white trousers and gold flat sandals", bio: "Produits bébé et maman testés à la maison, conseils de grande sœur.", voice: "tendre et rassurante", intro: false },
  { files: "creator_esther", id: "esther", name: "Esther", country: "RD Congo", flag: "🇨🇩", niche: "Musique & danse", gender: "f", age: "24", look: "Esther, 24-year-old Congolese woman from Kinshasa, rich dark-brown skin, expressive lively face with defined cheekbones, big joyful laughing smile, large voluminous round natural afro with a wide orange satin headband, chunky gold hoop earrings, wearing a bright orange ribbed crop top under an open blue-orange-yellow wax-print shirt, high-waisted wide-leg trousers in the same wax print and white sneakers", bio: "Danse, sons du moment et transitions rythmées, le produit dans le flow.", voice: "très expressive et joyeuse", intro: false },
  { files: "creator_laetitia", id: "laetitia", name: "Laetitia", country: "Gabon", flag: "🇬🇦", niche: "Parfums & senteurs", gender: "f", age: "29", look: "Laetitia, 29-year-old Gabonese woman, deep brown skin with cool undertones, elegant long face with sculpted cheekbones, soft sophisticated half-smile, chin-length bouncy curly bob with glossy defined ringlets and a deep side part, pearl drop earrings, thin gold chain, dark berry lipstick and subtle smoky eyes, wearing a burgundy silk slip midi dress with nude strappy heels", bio: "Parfums, encens et huiles : révélations lentes et ambiance sensuelle.", voice: "veloutée et posée", intro: false },
  { files: "creator_sali", id: "sali", name: "Sali", country: "Burkina Faso", flag: "🇧🇫", niche: "Déco & intérieur", gender: "f", age: "32", look: "Sali, 32-year-old Burkinabè woman, dark brown skin, calm oval face with mature features, warm relaxed smile, neat straight-back cornrows woven with thin gold thread gathered into a low chignon bun, small round wooden earrings, a stack of carved wooden bangles on one wrist, natural minimal makeup, wearing a terracotta-orange linen jumpsuit with a wide collar and tan leather flat sandals", bio: "Déco, meubles et objets artisanaux mis en scène dans un intérieur chaleureux.", voice: "calme et inspirante", intro: false },
  { files: "creator_maimouna", id: "maimouna", name: "Maïmouna", country: "Mali", flag: "🇲🇱", niche: "Voyage & découverte", gender: "f", age: "28", look: "Maïmouna, 28-year-old Malian woman, medium-dark brown skin, oval face with high cheekbones, adventurous bright smile, two long jumbo feed-in braids falling over both shoulders down to her waist, small gold hoop earrings, light natural makeup, wearing a knee-length belted khaki safari shirt dress with rolled sleeves, a colorful bogolan-pattern scarf loosely tied around her neck and brown leather ankle boots", bio: "Vlogs de voyage, hôtels, transport et bons plans à travers l'Afrique.", voice: "curieuse et entraînante", intro: false },
  { files: "creator_princesse", id: "princesse", name: "Princesse", country: "Togo", flag: "🇹🇬", niche: "Sneakers & streetwear", gender: "f", age: "22", look: "Princesse, 22-year-old Togolese woman, dark brown skin, defined cheekbones and a pointed chin, cool confident smirk, long passion twists dyed copper-ginger falling past her shoulders with a few gold cuffs, gold nameplate necklace and small gold hoops, wearing an oversized cropped light-wash denim jacket over a white ribbed tank top, beige cargo pants and chunky white sneakers", bio: "Sneakers, streetwear et looks du jour, ton cool et direct.", voice: "cool et directe", intro: false },
];

export const actorPortrait = (a: Actor) => `/creators/${a.files}/portrait.jpg`;
export const actorIntro = (a: Actor) => `/creators/${a.files}/intro.mp4`;

/**
 * Public URL of the character sheet, which Higgsfield downloads. On a
 * local or http dev server it can't reach us, so the copy served by the
 * live sokozia site is used instead (same files).
 */
export function actorSheetUrl(a: Actor, appUrl: string): string {
  const origin = appUrl.startsWith("https://") ? appUrl : "https://h8fj6hqu.insforge.site";
  return new URL(`/creators/${a.files}/sheet.jpg`, origin).toString();
}

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
    [/ongle|nail|manucure|vernis/, "ange"],
    [/mariage|c[eé]r[eé]monie|bapt[eê]me|mari[eé]e/, "coumba"],
    [/sport|fitness|gym|muscu|prot[eé]ine|training|yoga/, "nadege"],
    [/b[eé]b[eé]|bebe|maman|maternit|couche|biberon|grossesse/, "rokhaya"],
    [/parfum|senteur|encens|fragrance/, "laetitia"],
    [/sneaker|basket|streetwear|casquette/, "princesse"],
    [/voyage|h[oô]tel|vol |billet|tourisme|valise/, "maimouna"],
    [/danse|musique|son |chanson|dj/, "esther"],
    [/d[eé]co|canap|lampe|rideau|tapis|int[eé]rieur/, "sali"],
    [/bijou|boucle|collier|bracelet|sac [aà] main|accessoire/, "binta"],
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
