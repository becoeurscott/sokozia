import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ACTORS, getActor, suggestActor, type Actor } from "../actors";
import { MAX_CLIP_SECONDS, clipCount, closestDuration, isDuration, type Duration, type Style } from "../models";
import type { BriefContent } from "../types";
import { isInsForgeConfigured } from "../db";

/**
 * "Awa", the creative director, is Claude. It turns a user message (plus the
 * previous brief, if any) into a brief: product, creator, duration, scene,
 * script, and one shot per 15 s Seedance clip.
 *
 * Claude is called directly when ANTHROPIC_API_KEY is set, otherwise through
 * the InsForge model gateway. If neither answers in time, deterministic
 * rules write the brief, so the studio never blocks.
 */

/** Claude model used as the ad director. */
const DIRECTOR_MODEL = process.env.ANTHROPIC_DIRECTOR_MODEL || "claude-opus-5-5";
const DIRECTOR_TIMEOUT_MS = 20_000;

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

interface Direction {
  script: string;
  scene: string;
  shots: string[];
}

export async function buildBrief(input: BriefInput): Promise<BriefContent> {
  const text = input.text.trim();
  const prev = input.previous ?? null;

  const product = extractProduct(text, prev?.product);
  const actor = pickActor(input, text, prev, product);
  const duration = pickDuration(input, text, prev);
  const fallbackScene = extractScene(text, actor, prev?.scene);

  const directed = await direct({ product, actor, duration, text, scene: fallbackScene, previous: prev, hasPhoto: Boolean(input.imageUrl ?? prev?.imageUrl) });
  const script = directed?.script ?? templateScript({ product, duration, text });
  const scene = directed?.scene ?? fallbackScene;

  const changed = prev ? describeChanges(prev, { actorId: actor.id, duration }) : null;
  const intro = prev
    ? changed
      ? `C'est noté : ${changed}. Voici le brief mis à jour.`
      : "J'ai retravaillé le script avec tes précisions."
    : `Top ! Voici ce que je propose pour « ${product} ». Tu peux changer le créateur, la durée ou le script avant de lancer.`;

  return {
    text: intro,
    product,
    actorId: actor.id,
    duration,
    style: "seedance",
    script,
    scene,
    shots: directed?.shots ?? null,
    imageUrl: input.imageUrl ?? prev?.imageUrl ?? null,
  };
}

/* ------------------------------------------------------------------ */

function extractProduct(text: string, previous?: string): string {
  // Follow-ups ("fais-la en 30 secondes", "change de créateur") refine the
  // brief; they don't name a new product.
  if (previous) return previous;
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
  return previous ?? "Ton produit";
}

function pickActor(input: BriefInput, text: string, prev: BriefContent | null, product: string): Actor {
  if (input.actorId && getActor(input.actorId)) return getActor(input.actorId)!;
  const t = text.toLowerCase();
  for (const a of ACTORS) {
    const n = a.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (t.normalize("NFD").replace(/[̀-ͯ]/g, "").includes(n)) return a;
  }
  if (prev) return getActor(prev.actorId) ?? suggestActor(product);
  return suggestActor(text + " " + product);
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

const DIRECTOR_SYSTEM = `Tu es Awa, directrice de création d'une agence de pubs vidéo UGC pour les commerces d'Afrique francophone (Cameroun, Côte d'Ivoire, Sénégal, RDC, Bénin…).

Tu écris le brief d'une pub verticale 9:16 tournée par un créateur africain face caméra, comme une vraie cliente qui parle à ses amis. La vidéo est générée par Seedance 2.0 en clips de 15 secondes.

Règles du script :
- Français parlé, naturel, chaleureux, comme en Afrique de l'Ouest et centrale. Phrases courtes, faciles à dire.
- Une accroche forte dans les 2 premières secondes, un bénéfice concret, puis un appel à l'action (WhatsApp, lien en bio, passer en boutique).
- Environ 2,5 mots par seconde de vidéo. Pas de didascalies, pas d'emojis, pas de hashtags, pas de guillemets.
- N'invente pas de prix, de chiffres ou de promesses que le client n'a pas donnés.

Pour chaque clip de 15 secondes, écris un plan ("shot") en anglais pour le modèle vidéo : ce que fait le créateur, comment il tient ou montre le produit, le cadrage et le mouvement de caméra. Les plans s'enchaînent dans le même décor avec la même personne.`;

function directionSchema(clips: number) {
  return {
    type: "object",
    properties: {
      script: { type: "string", description: "Texte parlé complet, en français." },
      scene: { type: "string", description: "Le lieu du tournage en quelques mots, en français (ex. « dans une boutique bien rangée »)." },
      shots: {
        type: "array",
        description: `Exactement ${clips} plan(s), un par clip de 15 s, en anglais.`,
        items: { type: "string" },
      },
    },
    required: ["script", "scene", "shots"],
    additionalProperties: false,
  };
}

function directionPrompt(p: { product: string; actor: Actor; duration: Duration; text: string; scene: string; previous: BriefContent | null; hasPhoto: boolean }): string {
  const clips = clipCount(p.duration);
  return [
    `Produit : ${p.product}`,
    `Créateur : ${p.actor.name}, ${p.actor.country} (${p.actor.niche}, voix ${p.actor.voice}). Apparence : ${p.actor.look}.`,
    `Durée : ${p.duration} secondes, soit ${clips} clip(s) de ${MAX_CLIP_SECONDS} s. Le script fait environ ${Math.round(p.duration * 2.5)} mots, jamais plus de ${Math.round(p.duration * 2.8)} : au-delà, le créateur parle trop vite.`,
    `Lieu suggéré : ${p.scene}`,
    p.hasPhoto ? "Le client a envoyé une photo du produit : le créateur doit le montrer clairement." : "Pas de photo du produit : le créateur en parle et le mime de façon crédible.",
    p.previous ? `Brief précédent à faire évoluer :\nScript : ${p.previous.script}\nLieu : ${p.previous.scene}` : null,
    `Demande du client : ${p.text}`,
    "",
    `Réponds avec le script et le lieu en français (le lieu en quelques mots, sans décrire la personne), et ${clips} plan(s) en anglais.`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

async function direct(p: { product: string; actor: Actor; duration: Duration; text: string; scene: string; previous: BriefContent | null; hasPhoto: boolean }): Promise<Direction | null> {
  const clips = clipCount(p.duration);
  let raw: string | null = null;
  try {
    if (process.env.ANTHROPIC_API_KEY) raw = await directWithClaude(p, clips);
    else if (isInsForgeConfigured()) raw = await directWithGateway(p, clips);
  } catch (e) {
    console.error("[awa] director unavailable, using template:", e instanceof Error ? e.message : e);
    return null;
  }
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<Direction>;
    const script = d.script?.trim();
    if (!script || script.length < 20) return null;
    const shots = Array.isArray(d.shots) ? d.shots.map((s) => String(s).trim()).filter(Boolean) : [];
    return { script, scene: d.scene?.trim() || p.scene, shots: shots.length === clips ? shots : [] };
  } catch {
    return null;
  }
}

async function directWithClaude(p: Parameters<typeof direct>[0], clips: number): Promise<string | null> {
  const client = new Anthropic({ timeout: DIRECTOR_TIMEOUT_MS, maxRetries: 1 });
  const res = await client.beta.messages.create({
    model: DIRECTOR_MODEL,
    max_tokens: 4000,
    // Low effort keeps the brief fast; a short script doesn't need deep thinking.
    output_config: { effort: "low", format: { type: "json_schema", schema: directionSchema(clips) } },
    // If a safety classifier declines, the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: DIRECTOR_SYSTEM,
    messages: [{ role: "user", content: directionPrompt(p) }],
  });
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : null;
}

async function directWithGateway(p: Parameters<typeof direct>[0], clips: number): Promise<string | null> {
  const { getAdminClient } = await import("../insforge/server");
  const completion = await Promise.race([
    getAdminClient().ai.chat.completions.create({
      model: process.env.INSFORGE_SCRIPT_MODEL || "anthropic/claude-sonnet-4.5",
      maxTokens: 800,
      messages: [
        { role: "system", content: `${DIRECTOR_SYSTEM}\n\nRéponds uniquement en JSON valide : {"script": "texte parlé en français", "scene": "lieu en quelques mots, en français", "shots": [${clips} plan(s) en anglais]}.` },
        { role: "user", content: directionPrompt(p) },
      ],
    }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), DIRECTOR_TIMEOUT_MS)),
  ]);
  const text = completion?.choices?.[0]?.message?.content?.trim();
  return text ? text.replace(/^```(?:json)?\s*|\s*```$/g, "") : null;
}

/* ------------------------------------------------------------------ */

function describeChanges(prev: BriefContent, next: { actorId: string; duration: Duration }): string | null {
  const parts: string[] = [];
  if (prev.actorId !== next.actorId) parts.push(`${getActor(next.actorId)?.name} présente le produit`);
  if (prev.duration !== next.duration) parts.push(`${next.duration} secondes`);
  return parts.length ? parts.join(", ") : null;
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
  brief: Pick<BriefContent, "product" | "script" | "scene" | "duration"> & { shots?: string[] | null },
  actor: Actor,
): string[] {
  const n = clipCount(brief.duration);
  const lines = splitScript(brief.script, n);
  return lines.map((line, i) =>
    [
      `Vertical 9:16 UGC advert, ${MAX_CLIP_SECONDS} seconds, filmed on a phone, natural handheld feel.`,
      n > 1 ? `Part ${i + 1} of ${n} of the same ad: ${i === 0 ? "it opens with a strong hook." : "it continues the previous part seamlessly, same person, outfit, setting and light, and ends on the call to action."}` : null,
      `The first reference image is the presenter: ${actor.look}. Keep this exact face and identity throughout.`,
      `The second reference image is the product (${brief.product}); show it clearly in hand or on screen.`,
      `Setting: ${brief.scene}. Warm daylight, authentic African small-business atmosphere.`,
      brief.shots?.[i] ? `Shot: ${brief.shots[i]}` : null,
      `The presenter looks at the camera and speaks in French with a ${actor.voice} voice, lip-synced to this script: "${line}"`,
      `No captions, no logos, no text overlays.`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}
