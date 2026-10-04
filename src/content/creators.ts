// Les 16 créateurs Sokozia (personnages IA). Fichiers dans public/creators/<id>/ :
// portrait.jpg (cartes), sheet.jpg (fiche personnage envoyée avec chaque vidéo), intro.mp4 (présentation avec voix).
export type Creator = {
  id: string; name: string; gender: "female" | "male"; age: number; specialty: string;
  languages: string[]; country: string; bio: string; featured: boolean; look: string;
};

export const CREATORS: Creator[] = [
  { id: "creator_maya", name: "Aïcha", gender: "female", age: 24, specialty: "Beauté", languages: ["Français", "Dioula"], country: "Côte d'Ivoire", featured: true,
    bio: "Routines karité, soins naturels et conseils peau. Ton chaleureux de grande sœur.",
    look: "Aïcha, 24-year-old Ivorian woman, warm deep-brown skin with a natural glow, round face, full cheeks, bright wide smile, shoulder-length box braids with a few gold cuffs, small gold hoop earrings, wearing a mustard-yellow wrap top, soft natural makeup" },
  { id: "creator_jordan", name: "Kofi", gender: "male", age: 29, specialty: "Tech & téléphones", languages: ["Français", "Anglais"], country: "Côte d'Ivoire", featured: true,
    bio: "Déballages de téléphones et tests honnêtes, du marché d'Adjamé à la boutique.",
    look: "Kofi, 29-year-old Ivorian man, dark brown skin, short fade haircut with a sharp line-up, neat short beard, rectangular black glasses, slim build, wearing a navy polo shirt with an orange collar trim, silver wristwatch" },
  { id: "creator_sofia", name: "Fatou", gender: "female", age: 27, specialty: "Mode wax", languages: ["Français", "Wolof"], country: "Sénégal", featured: true,
    bio: "Tenues wax, essayages et transitions pour cérémonies et bureau.",
    look: "Fatou, 27-year-old Senegalese woman, very dark ebony skin, tall and slender, elegant oval face, high cheekbones, wearing a colorful red-and-blue wax print head wrap (tied high), matching wax print dress, gold statement earrings" },
  { id: "creator_marcus", name: "Moussa", gender: "male", age: 31, specialty: "Marché & bons plans", languages: ["Français", "Bambara"], country: "Mali", featured: true,
    bio: "Comparaisons de prix et bons plans du marché, avec beaucoup d'humour.",
    look: "Moussa, 31-year-old Malian man, dark brown skin, bald head, full rounded beard, big expressive smile, sturdy build, wearing a light blue embroidered short-sleeve boubou shirt (bazin), cream kufi cap in his hand or on his head" },
  { id: "creator_priya", name: "Nneka", gender: "female", age: 26, specialty: "Coiffure", languages: ["Anglais", "Pidgin"], country: "Nigeria", featured: false,
    bio: "Tresses, perruques et soins des cheveux crépus. Démos pas à pas.",
    look: "Nneka, 26-year-old Nigerian woman, medium brown skin, heart-shaped face, long knotless braids dyed burgundy, small nose ring, bold winged eyeliner, wearing a black crop top and denim jacket" },
  { id: "creator_leo", name: "Chinedu", gender: "male", age: 23, specialty: "Humour", languages: ["Anglais", "Pidgin"], country: "Nigeria", featured: false,
    bio: "Sketchs courts où le produit arrive au bon moment. Ça fait vraiment rire.",
    look: "Chinedu, 23-year-old Nigerian man, medium-dark brown skin, playful face, short curly high-top afro, thin mustache, gap-toothed grin, wearing a bright green oversized t-shirt and a white bucket hat" },
  { id: "creator_hana", name: "Mariam", gender: "female", age: 30, specialty: "Cuisine", languages: ["Français", "Bambara"], country: "Mali", featured: false,
    bio: "Recettes du quotidien vues du dessus, voix posée et astuces de maman.",
    look: "Mariam, 30-year-old Malian woman, deep brown skin, soft round face, calm kind eyes, wearing a patterned indigo bogolan (mud cloth) head scarf and a matching loose kaftan, small silver earrings" },
  { id: "creator_diego", name: "Yao", gender: "male", age: 34, specialty: "Livraison & quartier", languages: ["Français", "Dioula"], country: "Côte d'Ivoire", featured: false,
    bio: "Vidéos en extérieur dans les rues d'Abidjan, produits en situation réelle.",
    look: "Yao, 34-year-old Ivorian man, dark skin, athletic build, short twists hairstyle, trimmed goatee, wearing a bright orange delivery-style jacket over a white t-shirt, crossbody bag" },
  { id: "creator_amara", name: "Grâce", gender: "female", age: 28, specialty: "Bien-être", languages: ["Français", "Lingala"], country: "RD Congo", featured: false,
    bio: "Explications simples sur les ingrédients naturels et les bonnes habitudes.",
    look: "Grâce, 28-year-old Congolese woman, rich dark brown skin, oval face, short natural afro (TWA) with defined curls, freckle-free glowing skin, wearing a sage-green linen shirt, wooden bead necklace" },
  { id: "creator_ethan", name: "Émeka", gender: "male", age: 25, specialty: "Gaming & tech", languages: ["Anglais", "Pidgin"], country: "Nigeria", featured: false,
    bio: "Tests d'accessoires, montages rythmés et avis sans détour.",
    look: "Émeka, 25-year-old Nigerian man, medium brown skin, lean build, short dreadlocks tied up in a small bun, clean-shaven, wearing a black hoodie with purple gaming headphones around his neck" },
  { id: "creator_chloe", name: "Khady", gender: "female", age: 22, specialty: "Vie étudiante", languages: ["Français", "Wolof"], country: "Sénégal", featured: false,
    bio: "Angle petit budget et vie de campus à Dakar, très authentique.",
    look: "Khady, 22-year-old Senegalese woman, dark skin, youthful round face, big curious eyes, high puff natural hair with a yellow scrunchie, wearing an oversized light-grey university sweatshirt, small backpack" },
  { id: "creator_noah", name: "Ibrahima", gender: "male", age: 36, specialty: "Vie de famille", languages: ["Français", "Wolof"], country: "Sénégal", featured: false,
    bio: "Démos pratiques à la maison avec les enfants, une touche d'humour.",
    look: "Ibrahima, 36-year-old Senegalese man, dark ebony skin, tall, short cropped hair with a little grey at the temples, short neat beard, warm fatherly smile, wearing a beige kaftan (grand boubou top) with subtle embroidery" },
  { id: "creator_yuki", name: "Adjoa", gender: "female", age: 27, specialty: "Art & design", languages: ["Français", "Anglais"], country: "Côte d'Ivoire", featured: false,
    bio: "Mises en scène produit colorées, pagnes et boucles en stop-motion.",
    look: "Adjoa, 27-year-old Ivorian woman, light-brown skin, angular face, short platinum-blonde buzz cut, bold geometric earrings, colorful kente-pattern jacket over a black top, creative artist look" },
  { id: "creator_isabella", name: "Tshiala", gender: "female", age: 33, specialty: "Maison", languages: ["Français", "Lingala"], country: "RD Congo", featured: false,
    bio: "Produits mis en scène dans la cuisine et la salle de bain, ton rassurant.",
    look: "Tshiala, 33-year-old Congolese woman, deep brown skin, gentle smile, shoulder-length straight black wig with bangs, wearing a coral-pink blouse and a patterned apron in the kitchen" },
  { id: "creator_samuel", name: "Amina", gender: "female", age: 40, specialty: "Commerce & business", languages: ["Français", "Anglais"], country: "Cameroun", featured: false,
    bio: "Conseils aux commerçantes et avis francs sur le rapport qualité-prix.",
    look: "Amina, 40-year-old Cameroonian businesswoman, dark brown skin, confident mature face, short sleek bob haircut, pearl earrings, wearing a tailored emerald-green blazer over a patterned ndop-inspired top" },
  { id: "creator_zara", name: "Wanjiru", gender: "female", age: 29, specialty: "Luxe & élégance", languages: ["Anglais", "Swahili"], country: "Kenya", featured: false,
    bio: "Finition éditoriale, révélations lentes et cadrages élégants.",
    look: "Wanjiru, 29-year-old Kenyan woman, rich brown skin, long elegant neck, sharp cheekbones, sleek low bun with a middle part, minimal gold jewelry, wearing a champagne satin slip dress with a cream tailored blazer" },
]

export const creatorFiles = (id: string) => ({
  portrait: `/creators/${id}/portrait.jpg`,
  sheet: `/creators/${id}/sheet.jpg`,
  intro: `/creators/${id}/intro.mp4`,
});

// URL publique de la fiche personnage, pour que le générateur vidéo puisse la télécharger.
export function creatorSheetUrl(id: string) {
  const app = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const origin = app.startsWith("https://") ? app : "https://h8fj6hqu.insforge.site";
  return new URL(creatorFiles(id).sheet, origin).toString();
}

export const findCreator = (id: string | null | undefined) => CREATORS.find((c) => c.id === id);
