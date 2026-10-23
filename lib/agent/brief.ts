import "server-only";
import { ACTORS, getActor, suggestActor, type Actor } from "../actors";
import { DURATIONS, STYLES, isStyle, type Duration, type Style } from "../models";
import type { BriefContent } from "../types";
import { isInsForgeConfigured } from "../db";

/**
 * "Awa", the creative director. Turns a user message (plus the previous
 * brief, if any) into a brief: product, creator, duration, style, script.
 *
 * Deterministic rules run first so the answer is instant; the model gateway
 * only polishes the script when InsForge is configured and reachable.
 */

export interface BriefInput {
  text: string;
  imageUrl?: string | null;
  previous?: BriefContent | null;
  /** Explicit choices sent by the UI chips. */
  actorId?: string | null;
  duration?: Duration | null;
  style?: Style | null;
}

export async function buildBrief(input: BriefInput): Promise<BriefContent> {
  const text = input.text.trim();
  const prev = input.previous ?? null;

  const product = extractProduct(text, prev?.product);
  const actor = pickActor(input, text, prev, product);
  const duration = pickDuration(input, text, prev);
  const style = pickStyle(input, text, prev);
  const scene = extractScene(text, actor, prev?.scene);

  let script = templateScript({ product, actor, duration, text, scene });
  const polished = await polishWithModel({ product, actor, duration, text, scene, previousScript: prev?.script ?? null });
  if (polished) script = polished;

  const changed = prev ? describeChanges(prev, { actorId: actor.id, duration, style }) : null;
  const intro = prev
    ? changed
      ? `C'est noté : ${changed}. Voici le brief mis à jour.`
      : "J'ai retravaillé le script avec tes précisions."
    : `Top ! Voici ce que je propose pour « ${product} ». Tu peux changer le créateur, la durée ou le style avant de lancer.`;

  return {
    text: intro,
    product,
    actorId: actor.id,
    duration,
    style,
    script,
    scene,
    imageUrl: input.imageUrl ?? prev?.imageUrl ?? null,
  };
}

/* ------------------------------------------------------------------ */

function extractProduct(text: string, previous?: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
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
  if (input.duration && DURATIONS.includes(input.duration)) return input.duration;
  const m = text.match(/(\d{1,2})\s*(s|sec|secondes?)\b/i);
  if (m) {
    const n = Number(m[1]);
    const closest = DURATIONS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
    return closest;
  }
  return prev?.duration ?? 15;
}

function pickStyle(input: BriefInput, text: string, prev: BriefContent | null): Style {
  if (input.style && isStyle(input.style)) return input.style;
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const s of Object.values(STYLES)) {
    const n = s.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (new RegExp(`\\b${n}\\b`).test(t)) return s.id;
  }
  if (/moins cher|economique|pas cher/.test(t)) return "eclair";
  if (/realiste|le plus beau|haut de gamme/.test(t)) return "signature";
  return prev?.style ?? "naturel";
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

function templateScript(p: { product: string; actor: Actor; duration: Duration; text: string; scene: string }): string {
  const promo = p.text.match(/-?\s?\d{1,2}\s?%|promo|réduction|reduction|offre/i)?.[0];
  const hook = promo
    ? `Les amis, ${promo.trim().toLowerCase().includes("%") ? promo.trim() + " sur" : "offre spéciale sur"} ${lower(p.product)} cette semaine !`
    : `Vous cherchez ${lower(p.product)} ? Regardez ça.`;
  const body = `Je l'ai testé moi-même : la qualité est là, et c'est livré partout.`;
  const proof = `Franchement, je recommande les yeux fermés.`;
  const cta = `Commandez maintenant sur WhatsApp, le lien est en bio.`;
  if (p.duration === 8) return `${hook} ${cta}`;
  if (p.duration === 15) return `${hook} ${body} ${cta}`;
  return `${hook} ${body} ${proof} Et pour les premiers, une petite surprise à la livraison. ${cta}`;
}

async function polishWithModel(p: {
  product: string;
  actor: Actor;
  duration: Duration;
  text: string;
  scene: string;
  previousScript: string | null;
}): Promise<string | null> {
  if (!isInsForgeConfigured()) return null;
  try {
    const { getAdminClient } = await import("../insforge/server");
    const words = p.duration === 8 ? "20 à 25" : p.duration === 15 ? "38 à 45" : "75 à 85";
    const completion = await Promise.race([
      getAdminClient().ai.chat.completions.create({
        model: process.env.INSFORGE_SCRIPT_MODEL || "anthropic/claude-sonnet-4.5",
        temperature: 0.8,
        maxTokens: 300,
        messages: [
          {
            role: "system",
            content:
              "Tu es Awa, directrice de création d'une agence de pubs UGC en Afrique francophone. Tu écris des scripts parlés, naturels, en français d'Afrique de l'Ouest et centrale (tutoiement, chaleureux, sans jargon). Réponds uniquement avec le texte du script, sans titre ni guillemets.",
          },
          {
            role: "user",
            content: `Produit : ${p.product}\nCréateur : ${p.actor.name} (${p.actor.niche}, voix ${p.actor.voice})\nLieu : ${p.scene}\nDurée : ${p.duration} secondes (${words} mots)\nDemande du client : ${p.text}${p.previousScript ? `\nScript précédent à améliorer : ${p.previousScript}` : ""}\n\nÉcris le script : une accroche forte dans les 2 premières secondes, un bénéfice concret, et un appel à l'action WhatsApp.`,
          },
        ],
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text && text.length > 20 ? text : null;
  } catch {
    return null;
  }
}

function describeChanges(prev: BriefContent, next: { actorId: string; duration: Duration; style: Style }): string | null {
  const parts: string[] = [];
  if (prev.actorId !== next.actorId) parts.push(`${getActor(next.actorId)?.name} présente le produit`);
  if (prev.duration !== next.duration) parts.push(`${next.duration} secondes`);
  if (prev.style !== next.style) parts.push(`style ${STYLES[next.style].name}`);
  return parts.length ? parts.join(", ") : null;
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Final prompt sent to the video model. */
export function buildVideoPrompt(brief: Pick<BriefContent, "product" | "script" | "scene" | "duration">, actor: Actor): string {
  return [
    `Vertical 9:16 UGC advert, ${brief.duration} seconds, filmed on a phone, natural handheld feel.`,
    `The first reference image is the presenter: ${actor.look}. Keep this exact face and identity throughout.`,
    `The second reference image is the product (${brief.product}); show it clearly in hand or on screen.`,
    `Setting: ${brief.scene}. Warm daylight, authentic African small-business atmosphere.`,
    `The presenter looks at the camera and speaks in French with a ${actor.voice} voice, lip-synced to this script: "${brief.script}"`,
    `No captions, no logos, no text overlays.`,
  ].join(" ");
}
