// Directrice de création UGC « Awa » : adaptation du master template en 5 étapes
// (fiche produit, créateur, lieu, script, vidéo), pour des commerçants d'Afrique francophone.
// Chaque étape = un appel IA ciblé qui répond en JSON strict.

export type Product = {
  brand: string;
  name: string;
  what: string;          // type de produit, taille
  looks?: string;        // forme, matière, couleurs, bouchon, texte des étiquettes (si pas de photos)
  hidden?: string;       // ce que les photos ne montrent pas (dos, intérieur…)
  benefits: string;
  buyer: string;
  platform: string;      // TikTok / Reels / Shorts / WhatsApp
  videoStyle: string;    // avis, routine, déballage, démo, "propose"
  vibe?: string;
  direction?: string;
  avoid?: string;        // mots / promesses à ne jamais dire
  language: string;      // langue parlée dans la vidéo
  photos: string[];      // URLs des photos produit (peut être vide)
};

export type Option = { title: string; detail: string; format?: string };
import { FORMATS } from "@/content/formats";

// Règles d'écriture propres à chaque modèle vidéo (Awa écrit le prompt pour le modèle qui va le tourner).
export function modelGuide(endpoint: string | null | undefined) {
  const e = endpoint ?? "";
  if (e.includes("wan-3")) return "Model: Wan 3.0. Be concise and concrete, present tense: who, where, what they do, camera. Put every spoken line in quotes after the speaker. One continuous scene or at most 3 clean cuts. Refer to references as @Image1 (creator), @Image2 (product), @Image3 (location).";
  if (e.includes("kling")) return "Model: Kling 3.0 image-to-video. The video starts from an opening frame that already shows the creator, product and location: do NOT redescribe their appearance, describe only motion, gestures, facial expression and speech from the first frame. Keep one location, simple handheld camera, no scene change.";
  if (e.includes("seedance")) return "Model: Seedance. Write a timed shot list ([0-3s], [3-8s]…), explicit camera for each shot (close-up, medium, handheld push-in). Refer to references as @Image1 (creator), @Image2 (product), @Image3 (location). Dialogue in quotes with lip-sync. Clean cuts between shots are fine.";
  return "Write a clear timed shot list with dialogue in quotes.";
}

export type StyleBrief = { id: string; name: string; description: string; durations: number[]; price: string };

const BASE = `Tu es "Awa", directrice de création de vidéos UGC pour des commerçants et marques d'Afrique francophone.
Tu parles un français simple et chaleureux, tu tutoies, phrases courtes, JAMAIS d'emoji, jamais de jargon.
Tu ne parles JAMAIS de modèles d'IA, de fournisseurs ou de technique.
Les créateurs sont des Africains ordinaires et crédibles (pas des mannequins), les lieux sont africains et réalistes (Douala, Abidjan, Dakar, Kinshasa, Cotonou, Lomé…).
Les prompts d'image et de vidéo sont écrits EN ANGLAIS, très précis. Réponds TOUJOURS en JSON strict, sans texte autour.`;

function describe(p: Product) {
  return `PRODUIT
Marque : ${p.brand}
Nom du produit : ${p.name}
Ce que c'est : ${p.what}
${p.photos.length ? `Photos jointes : ${p.photos.length} (références @Image1…@Image${p.photos.length}, seule vérité pour l'apparence)
Ce que les photos ne montrent pas : ${p.hidden || "rien de précisé"}` : `Apparence : ${p.looks || "non précisée"}`}
Points forts : ${p.benefits}
Qui achète : ${p.buyer}
VIDÉO
Plateforme : ${p.platform}
Style de vidéo : ${p.videoStyle}
Ambiance du créateur : ${p.vibe || "libre"}
Direction : ${p.direction || "libre"}
À ne jamais dire : ${p.avoid || "rien"}
Langue parlée : ${p.language}`;
}

export const CHARACTER_SHEET_TEMPLATE = `A three-panel character reference sheet composed as one horizontal frame, divided into three equal vertical panels side by side, thin clean separation between panels, the same figure and the same outfit rendered identically across all three. [Identity paragraph: build, skin, hair color/length/texture, makeup register, identity markers, nails. Described ONCE, applies to all three panels.] [Wardrobe paragraph: full outfit head-to-toe, every garment, fabric, color, construction detail, footwear, jewelry. Described ONCE, applies to all three panels.] LEFT PANEL — full body front view, no head, no neck, and no hair. The body stands squared to camera from the shoulders down to [the shoes / the hem], arms relaxed at the sides, hands open and loose, weight even across both feet. There is no head, no neck, and no hair at all — nothing rises above the shoulder line, and no hair falls across the chest or shoulders. The [collar type] of the [garment] holds its own shape at the top of the garment and its opening is an empty dark hollow looking down into the inside of the [garment], with the inner back of the fabric faintly visible inside the opening. The garment reads as if worn by an invisible body — full three-dimensional shape, natural drape, real fabric tension across the chest and shoulders, but nothing emerging from the neckline. No stump, no skin, no cut edge, no anatomy, no blood, no fade, no blur, no ghosting, no transparency in the body. The panel keeps full headroom, generous empty mid-gray backdrop above the shoulders, so the figure sits at the same scale and position in the frame as a normal full-body portrait. CENTER PANEL — full body rear view, head attached. The same figure photographed from directly behind, standing straight, [hair fall from behind], [garment back construction], arms relaxed at the sides, hands loose, weight even across both feet, from the top of the head down to [the shoes / the end of the hem]. RIGHT PANEL — tight chest-up portrait, identity lock. The same figure framed from just above the top of the head down to the collarbones and the very top of the garment only, the face filling most of the panel, a true close-up. Body squared to camera, head level, eyes directly to camera, lips closed and relaxed, neutral controlled expression. [Hair, brows, lashes, lip texture, key identity markers] all clearly readable at close range. 18% neutral gray seamless studio backdrop applied uniformly across all three panels — one single flat uniform value corner to corner in every panel, no seam line, no gradient, no hotspot, no vignette, no falloff to black or white, and the identical gray value in all three panels. Relight from scratch overriding any reference lighting: completely flat shadowless illumination in every panel — one enormous soft frontal source at camera position with matched equal fill from camera-left, camera-right, above, and below, so both sides of the face and body read at exactly the same brightness. No key-and-fill ratio, no modelling, no shadow side, no nose shadow, no under-chin shadow, no rim light, no hair light, no kicker, no specular hotspot. Zero shadow cast onto the background in any panel — the backdrop stays clean flat gray behind and around the figure. No contact shadow, no drop shadow, no ambient occlusion on the floor beneath the feet. Extremely low contrast, even, milky, catalogue-flat, identical in every panel. Form is described by fabric folds, garment structure, and bone structure alone, not by light and shadow. Skin and fabric read matte and velvety, no shine, no gloss, no oily T-zone. Skin renders at its true natural skin tone, identical in value and hue across the face, arms, and body in every panel, never darkened, never tanned, never pale or washed-out or cool-shifted by the background. [Garment colors] render true and consistent across all three panels. Real peach fuzz at the jaw and hairline, real fine even pore texture, subsurface scattering reading as semi-translucent biology, real fabric weave and drape, visible fine metal surface detail on the jewelry, never plastic, never waxy, never harsh. Photographed on a 50mm prime, even sharpness, soft natural film grain. Photographed not generated.`;

// Cerveau d'Awa : Claude (via OpenRouter) ; en cas d'échec, repli automatique sur un second modèle.
const DIRECTOR = process.env.DIRECTOR_MODEL || "anthropic/claude-sonnet-5.5";
const FALLBACK = process.env.DIRECTOR_FALLBACK_MODEL || "google/gemini-2.5-flash";

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```(?:json)?/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean) as T;
}

async function callModel<T>(model: string, task: string): Promise<T> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      ...(model.startsWith("anthropic/") ? {} : { response_format: { type: "json_object" } }),
      messages: [{ role: "system", content: BASE }, { role: "user", content: task }],
    }),
  });
  if (!res.ok) throw new Error(`director ${res.status}`);
  const json = await res.json();
  return parseJSON<T>(json.choices?.[0]?.message?.content ?? "{}");
}

async function askJSON<T>(task: string): Promise<T> {
  try {
    return await callModel<T>(DIRECTOR, task);
  } catch {
    return callModel<T>(FALLBACK, task);
  }
}

const revision = (feedback?: string, previous?: string) =>
  feedback ? `\n\nPROMPT PRÉCÉDENT :\n${previous}\n\nLE CLIENT DEMANDE CES CHANGEMENTS : ${feedback}\nRéécris le prompt en appliquant exactement ces changements, garde le reste.` : "";

// 0. Recueil du produit en conversation (remplace le formulaire).
export type ChatTurn = { role: "user" | "assistant"; content: string };

export function productChat(history: ChatTurn[], photos: number) {
  return askJSON<{ reply: string; product: Omit<Product, "photos"> & { worn?: boolean } | null }>(`ÉTAPE 1 — TON PRODUIT, en conversation.
Tu poses UNE question courte à la fois, avec 2 à 4 exemples de réponses, pour connaître :
1) la marque et le nom du produit, 2) ce que c'est (type, taille), 3) ${photos ? `ce que les ${photos} photo(s) envoyée(s) ne montrent pas (dos, intérieur, texte de l'étiquette)` : "à quoi il ressemble (forme, couleurs, bouchon, texte EXACT de l'étiquette) — propose aussi d'envoyer des photos avec le bouton Photo"}, 4) pourquoi il est bien, 5) qui l'achète, 6) la langue parlée dans la vidéo (français, anglais, français avec expressions locales, pidgin…).
Le reste (plateforme, style de vidéo, ambiance, direction, mots interdits) est facultatif : demande-le en UNE seule question groupée à la fin, le client peut répondre « non ».
Regroupe ce que le client dit déjà, ne redemande jamais une info donnée. Si le client est pressé, déduis le reste intelligemment.
Photos reçues : ${photos}.

CONVERSATION :
${history.map((m) => `${m.role === "user" ? "CLIENT" : "AWA"} : ${m.content}`).join("\n")}

Quand tu as au moins 1 à 5 et la langue, réponds avec la fiche complète. Sinon product = null.
JSON : {"reply": "ton message court au client", "product": null}
ou {"reply": "résumé en 1 phrase + « Je prépare ta fiche produit. »", "product": {"brand": "", "name": "", "what": "", "looks": "", "hidden": "", "benefits": "", "buyer": "", "platform": "TikTok", "videoStyle": "", "vibe": "", "direction": "", "avoid": "", "language": "", "worn": false}}`);
}

// 1. Fiche produit : une image 16:9, 8 vues en grille 4x2.
export function productSheetPrompt(p: Product, feedback?: string, previous?: string) {
  return askJSON<{ message: string; prompt: string }>(`${describe(p)}

ÉTAPE 1 — FICHE PRODUIT.
${p.photos.length
    ? "Utilise toutes les photos jointes comme seules références (@Image1, @Image2…) et combine leurs angles. Garde exactement tout ce qui est visible sur les photos et construis les vues manquantes à partir de ce que le client a décrit."
    : "Dessine le produit à partir de la description. Tout texte imprimé doit être identique et écrit exactement."}
Écris le prompt d'UNE fiche produit multi-vues : une seule image 16:9 avec huit panneaux en grille 4x2 sur un fond studio gris clair uni. Choisis les huit vues qui montrent le mieux la forme, les détails et l'usage (face, dos, côtés, dessus, vue héros trois-quarts, produit ouvert ou en usage, gros plan de l'étiquette ou du détail clé). Chaque panneau montre exactement le même produit, avec un texte imprimé identique et bien orthographié.${revision(feedback, previous)}
JSON : {"message": "1 phrase courte au client en français", "prompt": "le prompt en anglais"}`);
}

// 2. Créateur : 3 options, puis la fiche personnage via le gabarit.
export function creatorOptions(p: Product) {
  return askJSON<{ message: string; options: Option[] }>(`${describe(p)}

ÉTAPE 2 — CRÉATEUR. Propose 3 créateurs africains ordinaires et crédibles qui collent à l'acheteur et au style de vidéo.
JSON : {"message": "1 phrase courte", "options": [{"title": "ex : Mireille, 32 ans, commerçante à Douala", "detail": "1 ligne : look, énergie, pourquoi elle convient"}, …3]}`);
}

export function creatorSheetPrompt(p: Product, choice: string, worn: boolean, feedback?: string, previous?: string) {
  return askJSON<{ message: string; prompt: string }>(`${describe(p)}

ÉTAPE 2 — FICHE PERSONNAGE pour le créateur choisi : ${choice}
Remplis UNIQUEMENT les parties entre crochets du gabarit ci-dessous, garde tout le reste mot pour mot.
${worn
    ? "Le produit se porte : le créateur le porte, la fiche produit est jointe en @Image1 et le produit porté doit y correspondre exactement."
    : "Donne à la tenue une encolure structurée (T-shirt, col rond ou chemise à col)."}
Le créateur doit ressembler à une vraie personne ordinaire, pas à un mannequin. Peau, cheveux (tresses, locks, afro, tissage, crâne rasé…) et tenue fidèles à l'Afrique d'aujourd'hui.

GABARIT :
${CHARACTER_SHEET_TEMPLATE}${revision(feedback, previous)}
JSON : {"message": "1 phrase courte", "prompt": "le gabarit rempli, en anglais"}`);
}

// 3. Lieu : 3 options, puis une photo vide du lieu.
export function locationOptions(p: Product, creator: string) {
  return askJSON<{ message: string; options: Option[] }>(`${describe(p)}
Créateur : ${creator}

ÉTAPE 3 — LIEU. Propose 3 lieux de tournage africains réalistes qui collent à la vidéo (salon de maison, boutique, marché, salon de coiffure, bureau, cour, voiture…).
JSON : {"message": "1 phrase courte", "options": [{"title": "nom court du lieu", "detail": "1 ligne de description"}, …3]}`);
}

export function locationPrompt(p: Product, choice: string, feedback?: string, previous?: string) {
  return askJSON<{ message: string; prompt: string }>(`${describe(p)}

ÉTAPE 3 — PHOTO DU LIEU choisi : ${choice}
Écris le prompt d'UNE photo grand-angle d'un lieu vide mais vécu, prise comme une vraie photo de smartphone depuis l'endroit où serait la caméra, avec une place claire pour le créateur et le produit. Aucune personne, aucune main, aucun produit, aucun logo de marque. Détails africains authentiques. Format 16:9.${revision(feedback, previous)}
JSON : {"message": "1 phrase courte", "prompt": "le prompt en anglais"}`);
}

// 4. Script : 3 idées, puis le script à la bonne durée et dans la bonne langue.
export function scriptIdeas(p: Product, duration: number) {
  return askJSON<{ message: string; options: Option[] }>(`${describe(p)}

ÉTAPE 4 — IDÉES. Propose 3 idées de vidéo de ${duration} secondes, chacune basée sur un FORMAT différent de cette liste (choisis les plus adaptés au produit) :
${FORMATS.map((f) => `- ${f.id} : ${f.label} (pour ${f.when})`).join("\n")}
JSON : {"message": "1 phrase courte", "options": [{"title": "idée en quelques mots", "detail": "1 ligne", "format": "id du format"}, …3]}`);
}

const WORDS: Record<number, number> = { 8: 18, 15: 35, 30: 70 };

export function writeScript(p: Product, idea: string, duration: number, styles: StyleBrief[], feedback?: string, previous?: string) {
  return askJSON<{ message: string; script: string; suggested_style: string; reason: string }>(`${describe(p)}

ÉTAPE 4 — SCRIPT de ${duration} secondes pour l'idée : ${idea}
Écris en ${p.language}, comme une vraie personne qui parle à une amie, pas comme une pub. ${WORDS[duration] ?? 70} mots parlés MAXIMUM (on parle ~2,5 mots/seconde). Accroche forte dans les 3 premières secondes, puis bénéfice, preuve, appel à l'action.
Utilise la marque et le nom du produit exactement comme imprimés. Ne dis jamais rien de la liste « À ne jamais dire ».
Donne seulement le texte parlé, avec les indications de plan entre crochets très courts, ex : [0-3s gros plan].${feedback ? `\n\nSCRIPT PRÉCÉDENT :\n${previous}\n\nCHANGEMENTS DEMANDÉS : ${feedback}` : ""}
Ensuite conseille LE style le plus adapté à cette pub parmi ceux disponibles en ${duration} s (qualité voulue, budget, type de produit) :
${styles.filter((x) => x.durations.includes(duration)).map((x) => `- ${x.id} : ${x.name} — ${x.description} — ${x.price}`).join("\n")}
JSON : {"message": "1 phrase courte qui demande au client de valider le script", "script": "le script", "suggested_style": "id du style", "reason": "1 phrase simple : pourquoi ce style pour cette pub"}`);
}

// 5. Vidéo : un prompt pour toute la durée, avec les 3 références.
export function videoPrompt(p: Product, script: string, duration: number, withRefs: boolean, creator: string, extra: { guide: string; format?: string }) {
  return askJSON<{ prompt: string }>(`${describe(p)}

ÉTAPE 5 — VIDÉO. Écris UN prompt vidéo verticale 9:16 de ${duration} secondes, style UGC smartphone.
Créateur (à décrire tel quel dans le prompt) : ${creator}\n${extra.guide}${extra.format ? `\nFormat de la pub : ${extra.format}` : ""}
${withRefs
    ? "La fiche personnage est @Image1, la fiche produit @Image2, la photo du lieu @Image3. Garde le créateur, le produit et le lieu identiques aux références."
    : "La vidéo démarre sur une image d'ouverture qui montre déjà le créateur, le produit et le lieu : garde-les identiques."}
Mets le script complet mot pour mot et indique comment prononcer le nom de la marque. Planifie chaque état du produit (fermé/ouvert, éteint/allumé, emballé/porté, plein/utilisé) pour que rien ne change ou n'apparaisse de nulle part, avec des coupes nettes quand le produit change d'état. Jeu naturel et humain, vraies réactions du visage, petits gestes des mains. Pas de musique, pas de sous-titres, pas de texte à l'écran.

SCRIPT (${p.language}) :
${script}
JSON : {"prompt": "le prompt vidéo en anglais, script inclus mot pour mot dans sa langue"}`);
}

// Pour les styles sans références : image d'ouverture 9:16 qui assemble créateur + produit + lieu.
export function framePrompt(p: Product, script: string, creator: string) {
  return askJSON<{ prompt: string }>(`${describe(p)}

Écris le prompt d'UNE image verticale 9:16, premier plan de la vidéo : le créateur de @Image1 (${creator}) dans le lieu de @Image2, tenant le produit de @Image3, cadrage selfie smartphone naturel, identiques aux références. Le premier plan du script est : ${script.slice(0, 200)}
JSON : {"prompt": "le prompt en anglais"}`);
}
