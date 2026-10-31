import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ACTORS, getActor, hasVoice, suggestActor, type Actor } from "../actors";
import { MAX_CLIP_SECONDS, clipCount, closestDuration, isDuration, type Duration, type Style } from "../models";
import type { BriefContent, ProductInsight } from "../types";
import { isInsForgeConfigured } from "../db";
import { readLocalFile } from "../storage";
import { elevenVoiceId } from "../providers/elevenlabs";
import { firstLink, readProductPage, type ProductPage } from "./productPage";

/**
 * "Awa", the creative director, is Claude. From the client's message, the
 * product photo and any product link, it first works out what the product
 * is, who buys it and why, then picks a creator and an ad format and writes
 * the script and one camera shot per 15 s Seedance clip.
 *
 * Claude is reached directly when ANTHROPIC_API_KEY is set, otherwise
 * through the project's OpenRouter key (OPENROUTER_API_KEY, the InsForge
 * Model Gateway), and as a last resort through the legacy InsForge AI proxy.
 * If none answers in time, deterministic rules write the brief, so the
 * studio never blocks.
 */

const DIRECTOR_MODEL = process.env.ANTHROPIC_DIRECTOR_MODEL || "claude-opus-5-5";
const OPENROUTER_MODEL = process.env.OPENROUTER_DIRECTOR_MODEL || "anthropic/claude-opus-5.5";
const DIRECTOR_TIMEOUT_MS = 40_000;
/** Spoken words per second that still sound natural and lip-sync well. */
const WORDS_PER_SECOND = 2.5;

/** Joins per-clip prompts in generations.prompt so retries reuse the same shots. */
export const PROMPT_SEPARATOR = "\n\n---\n\n";

export interface BriefInput {
  text: string;
  imageUrl?: string | null;
  previous?: BriefContent | null;
  /** Explicit choices sent by the UI chips. */
  actorId?: string | null;
  duration?: Duration | null;
  style?: Style | null;
}

/** The ad formats Awa chooses from, with the label shown to the client. */
const FORMATS = {
  temoignage: "Témoignage",
  probleme_solution: "Problème → solution",
  demonstration: "Démonstration",
  deballage: "Déballage",
  avant_apres: "Avant / après",
  essayage: "Essayage",
  offre: "Offre spéciale",
  pov: "POV",
  trois_raisons: "3 raisons",
  arrete: "Arrête de…",
  reponse_commentaire: "Réponse à un commentaire",
} as const;
type FormatKey = keyof typeof FORMATS;

interface Direction {
  product: string;
  message: string;
  insight: ProductInsight;
  creatorId: string | null;
  format: FormatKey | null;
  lines: string[];
  scene: string;
  shots: string[];
}

export async function buildBrief(input: BriefInput): Promise<BriefContent> {
  const text = input.text.trim();
  const prev = input.previous ?? null;

  const link = firstLink(text);
  const page = link ? await readProductPage(link) : null;
  // A product page's main image stands in for a photo the client didn't send.
  const imageUrl = input.imageUrl ?? prev?.imageUrl ?? page?.imageUrl ?? null;

  const guessedProduct = prev?.product ?? page?.title?.slice(0, 60) ?? extractProduct(text);
  const forced = forcedActor(input, text, prev);
  const duration = pickDuration(input, text, prev);
  const fallbackActor = forced ?? suggestActor(`${text} ${guessedProduct}`);
  const fallbackScene = extractScene(text, fallbackActor, prev?.scene);

  const directed = await direct({ text, previous: prev, page, imageUrl, duration, forced, scene: fallbackScene });

  const actor = forced ?? getActor(directed?.creatorId) ?? fallbackActor;
  const product = prev?.product ?? directed?.product ?? guessedProduct;
  const lines = directed?.lines ?? null;
  const script = lines ? lines.join(" ") : templateScript({ product, duration, text });

  const changed = prev ? describeChanges(prev, { actorId: actor.id, duration }) : null;
  const fallbackIntro = prev
    ? changed
      ? `C'est noté : ${changed}. Voici le brief mis à jour.`
      : "J'ai retravaillé le script avec tes précisions."
    : `Top ! Voici ce que je propose pour « ${product} ». Tu peux changer le créateur, la durée ou le script avant de lancer.`;

  return {
    text: directed?.message || fallbackIntro,
    product,
    actorId: actor.id,
    duration,
    style: "seedance",
    script,
    scene: directed?.scene ?? fallbackScene,
    shots: directed?.shots ?? null,
    lines,
    insight: directed?.insight ?? prev?.insight ?? null,
    format: directed?.format ? FORMATS[directed.format] : (prev?.format ?? null),
    imageUrl,
  };
}

/* ------------------------- fallback rules ------------------------- */

function extractProduct(text: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b\d{1,2}\s*(s|sec|secondes?)\b/gi, " ")
    .replace(/\b(je veux|je voudrais|fais|faire|crée|cree|créer|une pub|une vidéo|une video|pour|promo|promouvoir|mon|ma|mes|le|la|les|un|une|de|du|des)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 3) {
    const first = cleaned.split(/[.,;:!?\n]/)[0].trim();
    return capitalize(first.slice(0, 60));
  }
  return "Ton produit";
}

/** A creator the client chose (chip, name in the message, or the previous brief). */
function forcedActor(input: BriefInput, text: string, prev: BriefContent | null): Actor | null {
  if (input.actorId && getActor(input.actorId)) return getActor(input.actorId)!;
  const t = fold(text);
  for (const a of ACTORS) if (new RegExp(`\\b${fold(a.name)}\\b`).test(t)) return a;
  if (prev) return getActor(prev.actorId) ?? null;
  return null;
}

function pickDuration(input: BriefInput, text: string, prev: BriefContent | null): Duration {
  if (input.duration && isDuration(input.duration)) return input.duration;
  const m = text.match(/(\d{1,2})\s*(s|sec|secondes?)\b/i);
  if (m) return closestDuration(Number(m[1]));
  if (/\b(longue|plus long|une minute)\b/i.test(text)) return 30;
  return prev && isDuration(prev.duration) ? prev.duration : 15;
}

function extractScene(text: string, actor: Actor, previous?: string): string {
  const t = text.toLowerCase();
  const places: Array<[RegExp, string]> = [
    [/salon de coiffure|coiffeur/, "dans un salon de coiffure lumineux"],
    [/boutique|magasin/, "dans une boutique bien rangée"],
    [/march[eé]/, "au marché, ambiance animée"],
    [/cuisine|resto|restaurant|maquis/, "dans une cuisine ou un maquis vivant"],
    [/atelier/, "dans un atelier de couture"],
    [/rue|quartier|dehors/, "dans la rue du quartier, lumière du jour"],
    [/maison|salon|chez moi/, "dans un salon moderne"],
    [/bureau/, "dans un bureau clair"],
  ];
  for (const [re, s] of places) if (re.test(t)) return s;
  if (previous) return previous;
  const byNiche: Record<string, string> = {
    Beauté: "dans une salle de bain lumineuse, face caméra",
    Coiffure: "dans un salon de coiffure moderne",
    "Mode wax": "devant un portant de pagnes colorés",
    Cuisine: "dans une cuisine chaleureuse",
    "Tech & téléphones": "dans un bureau épuré avec le produit en main",
    "Livraison & quartier": "dans la rue, moto en arrière-plan",
    Maison: "dans un salon bien décoré",
    "Commerce & business": "dans sa boutique, rayons en fond",
    "Luxe & élégance": "dans un intérieur chic à la lumière douce",
  };
  return byNiche[actor.niche] ?? "dans un décor simple et lumineux, face caméra";
}

function templateScript(p: { product: string; duration: Duration; text: string }): string {
  const promo = p.text.match(/-?\s?\d{1,2}\s?%|promo|réduction|reduction|offre/i)?.[0];
  const hook = promo
    ? `Les amis, ${promo.trim().toLowerCase().includes("%") ? promo.trim() + " sur" : "offre spéciale sur"} ${lower(p.product)} cette semaine !`
    : `Vous cherchez ${lower(p.product)} ? Regardez ça.`;
  const body = `Je l'ai testé moi-même : la qualité est là, et c'est livré partout.`;
  const cta = `Commandez maintenant sur WhatsApp, le lien est en bio.`;
  if (p.duration <= 15) return `${hook} ${body} ${cta}`;
  return `${hook} ${body} Franchement, je recommande les yeux fermés. Et pour les premiers, une petite surprise à la livraison. ${cta}`;
}

/* ---------------------------- Claude ------------------------------ */

const DIRECTOR_SYSTEM = `Tu es Awa, directrice de création d'une agence de pubs vidéo UGC pour les commerces d'Afrique francophone (Côte d'Ivoire, Sénégal, Cameroun, RDC, Mali, Bénin, Togo, Burkina, Guinée…). Tes clients sont de petits commerçants : boutiques, vendeuses sur WhatsApp et Facebook, maquis, salons, artisans. Chaque pub doit faire vendre, pas seulement être jolie.

La vidéo est verticale 9:16, tournée par un créateur africain face caméra comme une vraie personne qui parle à ses amis (style TikTok / statut WhatsApp). Elle est générée par Seedance 2.0 en clips de 15 secondes ; le créateur dit le texte en synchronisation labiale.

ÉTAPE 1 — COMPRENDRE LE PRODUIT (avant d'écrire quoi que ce soit)
- Regarde la photo avec attention : type de produit, marque et texte lisibles sur l'étiquette, couleur, matière, emballage, contenance ou taille, état neuf ou non, nombre d'articles.
- Lis la demande du client et la page produit s'il y en a une.
- Déduis : ce que c'est exactement, qui l'achète (âge, situation, ville), le problème du quotidien qu'il règle, le bénéfice principal pour cet acheteur, le moment où on l'utilise.
- Ne garde comme « faits » que ce que le client a écrit ou ce qui est lisible sur la photo ou la page (prix, quantité, livraison, numéro, ingrédients, garantie…). Si la photo contredit le texte, fie-toi au texte et adapte.
- Si le produit n'est pas clair, prends l'interprétation la plus probable pour un commerce africain et reste prudente dans le script.

ÉTAPE 2 — CHOISIR L'ANGLE
Choisis un format :
- temoignage : la créatrice raconte son expérience (cosmétiques, cheveux, alimentation, bien-être).
- probleme_solution : on part d'une galère connue (coupure de courant, cheveux cassants, chaleur, moustiques…) et le produit la règle.
- demonstration : on voit le produit fonctionner (électroménager, tech, outils, cuisine, solaire).
- deballage : on ouvre le colis et on découvre (téléphones, accessoires, cadeaux, commandes en ligne).
- avant_apres : un résultat visible (nettoyage, coiffure, peau, réparation) — sans promesse exagérée.
- essayage : on porte et on tourne sur soi (vêtements, chaussures, bijoux, perruques, sacs).
- offre : la pub est portée par une promo ou un prix que le client a donné.
Choisis aussi le créateur le plus crédible pour ce produit et cet acheteur (genre, âge, univers), sauf si on t'impose quelqu'un.

ÉTAPE 3 — ÉCRIRE LE SCRIPT
- Français parlé d'Afrique de l'Ouest et centrale : naturel, chaleureux, phrases courtes faciles à dire. Quelques tournures locales légères sont bienvenues (« franchement », « vraiment », « c'est propre », « on est ensemble ») mais pas de caricature ni d'argot difficile.
- Accroche dans les 2 premières secondes, liée au produit. Exemples de mécaniques : question qui touche le problème (« Tes cheveux cassent dès que tu les coiffes ? »), résultat d'abord (« Regarde ma peau après une semaine »), interdiction (« Arrête d'acheter des ventilos qui lâchent en un mois »), surprise ou prix si le client l'a donné, preuve sociale (« Tout le quartier me demande où je l'ai eu »). Jamais « Salut tout le monde » ni « Bonjour à tous ».
- Ensuite un bénéfice concret avec un détail sensoriel ou une preuve visible (texture, odeur, bruit, rapidité, solidité, avant/après), et une objection levée si possible (qualité, livraison, prix).
- Termine par UN appel à l'action clair. Utilise les infos du client (numéro WhatsApp, boutique, quartier, livraison, prix). Sans info : « Écris-nous sur WhatsApp » ou « Passe à la boutique ». N'invente jamais de numéro, d'adresse, de prix, de pourcentage, de délai ni de garantie.
- Pas de promesses médicales, de gains d'argent garantis ni de comparaisons dénigrantes avec une marque.
- 15 s = un clip : accroche (0–3 s), preuve ou démo (3–11 s), appel à l'action (11–15 s).
- 30 s = deux clips : le clip 1 accroche, pose le problème et présente le produit ; le clip 2 montre la démo ou le résultat, lève une objection et finit sur l'appel à l'action.
- Donne le texte clip par clip (« lines ») : chaque élément est ce que le créateur dit pendant ce clip, en phrases complètes. Respecte le nombre de mots demandé : au-delà, il parle trop vite.
- Écris les nombres comme on les dit : « quarante-cinq mille francs », « zéro sept, zéro sept, douze, trente-quatre, cinquante-six ».
- Pas de didascalies, d'emojis, de hashtags ni de guillemets dans le texte parlé.

ÉTAPE 4 — LES PLANS (en anglais, pour Seedance)
Le style est celui des pubs qui marchent sur TikTok et Reels : une vraie personne qui se filme en selfie avec son téléphone, face caméra, qui PARLE tout le temps, avec des plans courts qui changent toutes les 2 à 4 secondes. Pour chaque clip de 15 s, écris une timeline de 3 à 5 temps avec leur minutage, en anglais, par exemple :
"0-3s: tight selfie close-up, she says the hook straight into the lens, surprised face. 3-7s: she brings the jar next to her face, label to camera, still talking. 7-11s: quick close-up of her fingers scooping the butter, her voice continues. 11-15s: back to her face, she points at the camera for the call to action."
Règles :
- Le visage du créateur, en gros plan ou plan poitrine, est à l'écran au moins 70 % du temps, la bouche bien visible : c'est ce qui rend la synchronisation labiale crédible. Les gros plans produit sont courts (2 à 4 s) et sa voix continue dessus.
- Ne décris jamais un sourire bouche fermée pendant qu'il parle. Écris qu'il parle, réagit, hoche la tête, fait des gestes.
- Le produit est visible dans les 3 premières secondes et ressemble exactement à ta description visuelle. Gestes concrets avec le produit (tenir l'étiquette face caméra, ouvrir, verser, appliquer, allumer, porter, croquer…).
- Caméra tenue à la main, petits zooms rapides (punch-in), lumière naturelle. Même personne, même tenue, même décor d'un clip à l'autre. Pas de texte à l'écran, pas d'autres personnes, pas de miroir avec un reflet, pas d'actions impossibles à filmer.
- Formats tendance que tu peux choisir quand ils servent le produit : pov (« POV : tu as enfin trouvé… »), trois_raisons (« 3 raisons d'acheter… »), arrete (« Arrête d'acheter des… »), reponse_commentaire (le créateur répond à une question de client lue sur son téléphone).

ÉTAPE 5 — TON MESSAGE AU CLIENT
En une ou deux phrases, en tutoyant : dis ce que tu as compris du produit et l'angle choisi. S'il manque une info qui rendrait la pub plus efficace (prix, numéro WhatsApp, lieu de livraison, promo), propose-lui de l'ajouter, une seule fois.

Quand le client demande une modification d'un brief existant, garde ce qui marche et change seulement ce qu'il demande.`;

function directionSchema(clips: number, creatorIds: string[]) {
  const str = (description: string) => ({ type: "string", description });
  return {
    type: "object",
    properties: {
      product_name: str("Nom court du produit en français, 2 à 6 mots, tel qu'un client le dirait (ex. « Beurre de karité pur »)."),
      understanding: {
        type: "object",
        properties: {
          what: str("Ce qu'est le produit, une phrase en français."),
          audience: str("Qui l'achète, en français, quelques mots."),
          benefit: str("Le bénéfice principal pour cet acheteur, en français, une phrase courte."),
          facts: { type: "array", items: { type: "string" }, description: "Faits donnés par le client ou lisibles sur la photo ou la page (prix, contenance, livraison…), en français. Liste vide si aucun." },
          visual: str("Apparence exacte du produit seul en anglais pour le modèle vidéo : forme, couleurs, matière, emballage, taille, texte lisible. Ne décris pas le décor ni les objets autour (boissons, enseignes, autres marques)."),
          demo: str("Comment une personne le montre ou l'utilise physiquement face caméra, en anglais."),
        },
        required: ["what", "audience", "benefit", "facts", "visual", "demo"],
        additionalProperties: false,
      },
      creator_id: { type: "string", enum: creatorIds, description: "Le créateur le plus crédible pour ce produit." },
      format: { type: "string", enum: Object.keys(FORMATS), description: "Le format de la pub." },
      lines: { type: "array", items: { type: "string" }, description: `Exactement ${clips} élément(s) : le texte parlé de chaque clip de 15 s, en français.` },
      scene: str("Le lieu du tournage en quelques mots, en français (ex. « dans une boutique bien rangée »), sans décrire la personne."),
      shots: { type: "array", items: { type: "string" }, description: `Exactement ${clips} plan(s), un par clip de 15 s, en anglais.` },
      message: str("Ton message au client, une ou deux phrases en français, en le tutoyant."),
    },
    required: ["product_name", "understanding", "creator_id", "format", "lines", "scene", "shots", "message"],
    additionalProperties: false,
  };
}

interface DirectInput {
  text: string;
  previous: BriefContent | null;
  page: ProductPage | null;
  imageUrl: string | null;
  duration: Duration;
  forced: Actor | null;
  scene: string;
}

function directionPrompt(p: DirectInput, hasImage: boolean): string {
  const clips = clipCount(p.duration);
  const words = Math.round(MAX_CLIP_SECONDS * WORDS_PER_SECOND);
  const creators = p.forced
    ? `Créateur imposé par le client : ${p.forced.id} — ${p.forced.name}, ${p.forced.gender === "f" ? "femme" : "homme"} de ${p.forced.age} ans, ${p.forced.country}, univers ${p.forced.niche}, voix ${p.forced.voice}. Réponds avec creator_id = ${p.forced.id}.`
    : `Créateurs disponibles (id — prénom, genre, âge, pays, univers) :\n${ACTORS.map((a) => `- ${a.id} — ${a.name}, ${a.gender === "f" ? "F" : "H"}, ${a.age} ans, ${a.country}, ${a.niche}`).join("\n")}`;
  const prev = p.previous;
  return [
    hasImage ? "La photo jointe est le produit du client (ou l'image principale de sa page produit)." : "Le client n'a pas envoyé de photo : décris le produit le plus probable et le créateur le montre de façon crédible.",
    p.page ? `Page produit (${p.page.url}) :\nTitre : ${p.page.title ?? "—"}\nDescription : ${p.page.description ?? "—"}` : null,
    prev
      ? [
          "Brief précédent à faire évoluer :",
          `Produit : ${prev.product}`,
          prev.insight ? `Compréhension : ${prev.insight.what} Pour : ${prev.insight.audience}. Bénéfice : ${prev.insight.benefit} Faits : ${prev.insight.facts.join(" ; ") || "aucun"}` : null,
          prev.format ? `Format : ${prev.format}` : null,
          `Script : ${prev.script}`,
          `Lieu : ${prev.scene}`,
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    `Durée : ${p.duration} secondes, soit ${clips} clip(s) de ${MAX_CLIP_SECONDS} s. Chaque clip fait environ ${words} mots parlés, jamais plus de ${Math.round(words * 1.1)}.`,
    `Lieu suggéré (tu peux en choisir un meilleur) : ${p.scene}`,
    creators,
    "",
    `Demande du client : ${p.text || "(pas de texte, seulement la photo)"}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

async function direct(p: DirectInput): Promise<Direction | null> {
  const clips = clipCount(p.duration);
  const ids = p.forced ? [p.forced.id] : ACTORS.map((a) => a.id);
  const image = p.imageUrl ? await loadImage(p.imageUrl) : null;
  let raw: string | null = null;
  try {
    if (process.env.ANTHROPIC_API_KEY) raw = await directWithClaude(p, clips, ids, image);
    else if (process.env.OPENROUTER_API_KEY) raw = await directWithOpenRouter(p, clips, ids, image);
    else if (isInsForgeConfigured()) raw = await directWithGateway(p, clips);
  } catch (e) {
    console.error("[awa] director unavailable, using template:", e instanceof Error ? e.message : e);
    return null;
  }
  if (!raw) return null;
  try {
    return parseDirection(JSON.parse(raw), clips, p);
  } catch (e) {
    console.error("[awa] unreadable direction:", e instanceof Error ? e.message : e);
    return null;
  }
}

function parseDirection(d: Record<string, unknown>, clips: number, p: DirectInput): Direction | null {
  const strings = (v: unknown) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : []);
  let lines = strings(d.lines);
  // Older gateway answers send one "script" string; cut it per clip.
  if (!lines.length && typeof d.script === "string") lines = splitScript(d.script.trim(), clips);
  if (lines.length > clips) lines = [...lines.slice(0, clips - 1), lines.slice(clips - 1).join(" ")];
  if (lines.length !== clips || lines.join(" ").length < 20) return null;
  const shots = strings(d.shots);
  const u = (d.understanding ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const format = s(d.format) as FormatKey;
  return {
    product: s(d.product_name).slice(0, 60) || "Ton produit",
    message: s(d.message),
    insight: { what: s(u.what), audience: s(u.audience), benefit: s(u.benefit), facts: strings(u.facts), visual: s(u.visual), demo: s(u.demo) },
    creatorId: p.forced?.id ?? (getActor(s(d.creator_id)) ? s(d.creator_id) : null),
    format: format in FORMATS ? format : null,
    lines,
    scene: s(d.scene) || p.scene,
    shots: shots.length === clips ? shots : [],
  };
}

interface LoadedImage {
  /** Public https URL the model can fetch itself. */
  url?: string;
  /** Inline bytes, for files only this server can read (local dev). */
  base64?: string;
  mediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

/** Public images are passed by URL; local dev files are read and inlined. */
async function loadImage(url: string): Promise<LoadedImage | null> {
  const local = url.match(/\/api\/files\/([^/]+)\/(.+)$/);
  const isPublic = /^https:\/\//.test(url) && !/\/\/(localhost|127\.0\.0\.1)/.test(url);
  if (isPublic && !local) return { url };
  if (!local) return null;
  const bytes = await readLocalFile(local[1], decodeURIComponent(local[2]));
  if (!bytes || bytes.length > 4_500_000) return null;
  const ext = local[2].split(".").pop()?.toLowerCase();
  const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  return { base64: bytes.toString("base64"), mediaType };
}

async function directWithClaude(p: DirectInput, clips: number, ids: string[], image: LoadedImage | null): Promise<string | null> {
  const client = new Anthropic({ timeout: DIRECTOR_TIMEOUT_MS, maxRetries: 1 });
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image?.url) content.push({ type: "image", source: { type: "url", url: image.url } });
  else if (image?.base64) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType!, data: image.base64 } });
  content.push({ type: "text", text: directionPrompt(p, Boolean(image)) });
  const res = await client.beta.messages.create({
    model: DIRECTOR_MODEL,
    max_tokens: 6000,
    output_config: { effort: "low", format: { type: "json_schema", schema: directionSchema(clips, ids) } },
    // If a safety classifier declines, the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: DIRECTOR_SYSTEM,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : null;
}

async function directWithOpenRouter(p: DirectInput, clips: number, ids: string[], image: LoadedImage | null): Promise<string | null> {
  const content: Array<Record<string, unknown>> = [];
  const imageUrl = image?.url ?? (image?.base64 ? `data:${image.mediaType};base64,${image.base64}` : null);
  if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });
  content.push({ type: "text", text: directionPrompt(p, Boolean(image)) });
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(DIRECTOR_TIMEOUT_MS),
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "http-referer": "https://sokozia.com",
      "x-title": "Sokozia",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 6000,
      reasoning: { effort: "low" },
      provider: { require_parameters: true },
      response_format: { type: "json_schema", json_schema: { name: "brief", strict: true, schema: directionSchema(clips, ids) } },
      messages: [
        { role: "system", content: DIRECTOR_SYSTEM },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") return null;
  return stripFence(choice?.message?.content);
}

/** Legacy InsForge AI proxy: text only, used when no OpenRouter key is set. */
async function directWithGateway(p: DirectInput, clips: number): Promise<string | null> {
  const { getAdminClient } = await import("../insforge/server");
  const completion = await Promise.race([
    getAdminClient().ai.chat.completions.create({
      model: process.env.INSFORGE_SCRIPT_MODEL || "anthropic/claude-sonnet-4.5",
      maxTokens: 2000,
      messages: [
        {
          role: "system",
          content: `${DIRECTOR_SYSTEM}\n\nRéponds uniquement en JSON valide avec les clés : product_name, understanding {what, audience, benefit, facts[], visual, demo}, creator_id, format, lines [${clips} élément(s)], scene, shots [${clips} élément(s)], message.`,
        },
        { role: "user", content: directionPrompt(p, false) },
      ],
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), DIRECTOR_TIMEOUT_MS)),
  ]);
  return stripFence(completion?.choices?.[0]?.message?.content);
}

function stripFence(text: string | null | undefined): string | null {
  const t = text?.trim();
  return t ? t.replace(/^```(?:json)?\s*|\s*```$/g, "") : null;
}

/* ------------------------------------------------------------------ */

function describeChanges(prev: BriefContent, next: { actorId: string; duration: Duration }): string | null {
  const parts: string[] = [];
  if (prev.actorId !== next.actorId) parts.push(`${getActor(next.actorId)?.name} présente le produit`);
  if (prev.duration !== next.duration) parts.push(`${next.duration} secondes`);
  return parts.length ? parts.join(", ") : null;
}

function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Splits the script into `n` spoken segments of roughly equal length, on sentence boundaries. */
function splitScript(script: string, n: number): string[] {
  if (n <= 1) return [script];
  const sentences = script.match(/[^.!?…]+[.!?…]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [script];
  const total = script.length;
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    current = current ? `${current} ${s}` : s;
    if (out.length < n - 1 && current.length >= total / n) {
      out.push(current);
      current = "";
    }
  }
  if (current) out.push(current);
  while (out.length < n) out.push(out[out.length - 1]);
  return out;
}

/**
 * Final prompts sent to Seedance 2.0, one per 15 s clip. Each clip speaks
 * its share of the script; clips after the first continue the same take.
 */
export function buildVideoPrompts(
  brief: Pick<BriefContent, "product" | "script" | "scene" | "duration"> & Pick<Partial<BriefContent>, "shots" | "lines" | "insight" | "imageUrl">,
  actor: Actor,
): string[] {
  const n = clipCount(brief.duration);
  // Claude's per-clip lines hold only while the client kept the same script and duration.
  const lines = brief.lines?.length === n && brief.lines.join(" ") === brief.script ? brief.lines : splitScript(brief.script, n);
  const visual = brief.insight?.visual;
  const product = visual ? `${brief.product} (${visual})` : brief.product;
  const hasPhoto = Boolean(brief.imageUrl);
  const pronoun = actor.gender === "f" ? "She" : "He";
  const person = actor.gender === "f" ? "woman" : "man";
  // What the model is most likely to drop is the talking, so speech comes first.
  return lines.map((line, i) =>
    [
      `Talking-head TikTok ad, vertical 9:16 selfie video, ${MAX_CLIP_SECONDS} seconds, filmed by the ${person} on a phone front camera at arm's length, handheld, quick punch-in zooms, natural light.`,
      n > 1 ? `Part ${i + 1} of ${n} of the same ad: ${i === 0 ? "it opens on the hook." : "it continues the previous part seamlessly (same person, outfit, setting, light and voice) and ends on the call to action."}` : null,
      `The first reference image is the presenter's character sheet: ${actor.look}. Keep this exact face, hair, outfit and identity throughout.`,
      `${pronoun} TALKS directly into the lens for the whole clip: lips, jaw and face move clearly and in sync with every word, lips closing fully on m, b and p and teeth touching the lip on f and v, expressive eyebrows, natural head movement and hand gestures. No fixed grin and no closed-mouth smile while speaking, smiles only between sentences, no voice-over.`,
      elevenVoiceId(actor)
        ? `The audio reference is ${pronoun === "She" ? "her" : "his"} own recorded speech for this clip: ${pronoun.toLowerCase()} lip-syncs exactly to it, word for word, mouth shapes matching every syllable from the first frame to the last. Keep that audio as the soundtrack. ${pronoun} says: "${line}"`
        : hasVoice(actor)
          ? `${pronoun === "She" ? "Her" : "His"} voice is exactly the voice of the audio reference: same timbre and the same natural ${accentOf(actor.country)} French accent, ${VOICE_EN[actor.voice] ?? "warm and natural"}, like a voice note to friends. ${pronoun} says: "${line}"`
          : `${pronoun} speaks French with a natural ${accentOf(actor.country)} accent, a ${actor.age}-year-old ${person}'s voice, ${VOICE_EN[actor.voice] ?? "warm and natural"}, like a voice note to friends. ${pronoun} says: "${line}"`,
      brief.shots?.[i] ? `Timeline: ${brief.shots[i]}` : `Timeline: mostly a tight selfie close-up of ${pronoun === "She" ? "her" : "his"} talking face, with one short close-up of the product in hand while the voice continues.`,
      hasPhoto
        ? `The second reference image is the product: ${product}. Reproduce it exactly (shape, colours, packaging, label).`
        : `The product is ${product}.`,
      brief.insight?.demo ? `How the product is shown: ${brief.insight.demo}` : null,
      `Setting: ${brief.scene}. Light that fits the setting, authentic African everyday atmosphere.`,
      `Only this one person in frame, no reflections of other people, no music, no captions, no logos, no text overlays.`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** The accent Seedance gives the presenter's voice, from their country. */
function accentOf(country: string): string {
  const accents: Record<string, string> = {
    "Côte d'Ivoire": "Ivorian (West African)",
    Sénégal: "Senegalese (West African)",
    Mali: "Malian (West African)",
    "Burkina Faso": "Burkinabè (West African)",
    Guinée: "Guinean (West African)",
    Niger: "Nigerien (West African)",
    Bénin: "Beninese (West African)",
    Togo: "Togolese (West African)",
    Ghana: "Ghanaian (West African)",
    Nigeria: "Nigerian (West African)",
    Cameroun: "Cameroonian (Central African)",
    Gabon: "Gabonese (Central African)",
    "RD Congo": "Congolese, from Kinshasa (Central African)",
    Kenya: "East African",
  };
  return accents[country] ?? "West African";
}

/** The creators' voice descriptions (French, in lib/actors.ts) in English for Seedance. */
const VOICE_EN: Record<string, string> = {
  "douce et enjouée": "soft and cheerful",
  "claire et rapide": "clear and quick",
  "posée et élégante": "calm and elegant",
  "chaleureuse et drôle": "warm and funny",
  pétillante: "bubbly",
  "très expressive": "very expressive",
  rassurante: "reassuring",
  "directe et amicale": "direct and friendly",
  "calme et apaisante": "calm and soothing",
  dynamique: "energetic",
  spontanée: "spontaneous",
  "posée et sincère": "calm and sincere",
  inspirante: "inspiring",
  accueillante: "welcoming",
  "assurée et pro": "confident and professional",
  raffinée: "refined",
  "douce et raffinée": "soft and refined",
  "énergique et motivante": "energetic and motivating",
  "pétillante et chic": "bubbly and chic",
  "douce et girly": "soft and girly",
  "tendre et rassurante": "tender and reassuring",
  "très expressive et joyeuse": "very expressive and joyful",
  "veloutée et posée": "velvety and calm",
  "calme et inspirante": "calm and inspiring",
  "curieuse et entraînante": "curious and catchy",
  "cool et directe": "cool and direct",
  "grave et assurée": "deep and confident",
  "posée et charmeuse": "calm and charming",
  élégante: "elegant",
  "chaleureuse et terrienne": "warm and down-to-earth",
  "rassurante et claire": "reassuring and clear",
  survoltée: "hyped and excited",
  "calme et experte": "calm and expert",
  "posée et crédible": "calm and credible",
  joviale: "jovial",
  "claire et pédagogue": "clear and didactic",
};
