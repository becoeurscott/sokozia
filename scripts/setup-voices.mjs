// Creates one ElevenLabs voice per Sokozia creator and stores the ids in
// lib/voices.json (read by lib/providers/elevenlabs.ts).
//
// Voice Design v3 builds each voice from a description (age, gender,
// country accent, tone). For the creators who have an intro video, their
// voice.mp3 is sent as reference audio so the result keeps their timbre.
// A preview of each voice is saved in voices-preview/<id>.mp3 to listen to.
//
//   node --env-file=.env scripts/setup-voices.mjs --dry-run   # print descriptions only
//   node --env-file=.env scripts/setup-voices.mjs             # all creators without a voice yet
//   node --env-file=.env scripts/setup-voices.mjs --only=aicha,kofi --force
//
// Needs ELEVENLABS_API_KEY (Voice Design is included on paid plans).

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const VOICES_FILE = path.join(ROOT, "lib", "voices.json");
const PREVIEW_DIR = path.join(ROOT, "voices-preview");
const API = "https://api.elevenlabs.io/v1";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const dryRun = Boolean(args["dry-run"]);
const force = Boolean(args.force);
const only = typeof args.only === "string" ? new Set(args.only.split(",")) : null;
const key = process.env.ELEVENLABS_API_KEY;
if (!dryRun && !key) {
  console.error("ELEVENLABS_API_KEY manque (dans .env).");
  process.exit(1);
}

const ACCENT = {
  "Côte d'Ivoire": "Ivorian, from Abidjan",
  Sénégal: "Senegalese, from Dakar",
  Mali: "Malian, from Bamako",
  "Burkina Faso": "Burkinabè, from Ouagadougou",
  Guinée: "Guinean, from Conakry",
  Niger: "Nigerien, from Niamey",
  Bénin: "Beninese, from Cotonou",
  Togo: "Togolese, from Lomé",
  Ghana: "Ghanaian",
  Nigeria: "Nigerian",
  Cameroun: "Cameroonian, from Douala",
  Gabon: "Gabonese, from Libreville",
  "RD Congo": "Congolese, from Kinshasa",
  Kenya: "Kenyan",
};

const TONE = {
  "douce et enjouée": "soft and cheerful", "claire et rapide": "clear and quick", "posée et élégante": "calm and elegant",
  "chaleureuse et drôle": "warm and funny", pétillante: "bubbly", "très expressive": "very expressive", rassurante: "reassuring",
  "directe et amicale": "direct and friendly", "calme et apaisante": "calm and soothing", dynamique: "energetic", spontanée: "spontaneous",
  "posée et sincère": "calm and sincere", inspirante: "inspiring", accueillante: "welcoming", "assurée et pro": "confident and professional",
  raffinée: "refined", "douce et raffinée": "soft and refined", "énergique et motivante": "energetic and motivating",
  "pétillante et chic": "bubbly and chic", "douce et girly": "soft and girly", "tendre et rassurante": "tender and reassuring",
  "très expressive et joyeuse": "very expressive and joyful", "veloutée et posée": "velvety and calm", "calme et inspirante": "calm and inspiring",
  "curieuse et entraînante": "curious and catchy", "cool et directe": "cool and direct", "grave et assurée": "deep and confident",
  "posée et charmeuse": "calm and charming", élégante: "elegant", "chaleureuse et terrienne": "warm and down-to-earth",
  "rassurante et claire": "reassuring and clear", survoltée: "hyped and excited", "calme et experte": "calm and expert",
  "posée et crédible": "calm and credible", joviale: "jovial", "claire et pédagogue": "clear and didactic",
};

// A French ad-style text (100–1000 characters) the previews are spoken with.
const SAMPLE =
  "Franchement, je ne pensais pas que ça marcherait aussi bien. Regarde ça : c'est livré partout, la qualité est vraiment là, et le prix est correct. Moi je l'utilise tous les jours. Si tu veux le tien, écris-nous sur WhatsApp, on est ensemble !";

/** The creators, read from lib/actors.ts (one object per line). */
async function readActors() {
  const src = await fs.readFile(path.join(ROOT, "lib", "actors.ts"), "utf8");
  const field = (line, name) => line.match(new RegExp(`${name}: "([^"]*)"`))?.[1];
  return src
    .split("\n")
    .filter((l) => l.trim().startsWith("{ files:"))
    .map((l) => ({
      files: field(l, "files"),
      id: field(l, "id"),
      name: field(l, "name"),
      country: field(l, "country"),
      gender: field(l, "gender"),
      age: field(l, "age"),
      voice: field(l, "voice"),
      intro: !/intro: false/.test(l),
    }));
}

function describe(a) {
  const who = a.gender === "f" ? "woman" : "man";
  const [nationality, place] = (ACCENT[a.country] ?? "West African").split(", from ");
  const tone = TONE[a.voice] ?? "warm and natural";
  return [
    `A ${a.age}-year-old ${nationality} ${who}${place ? ` from ${place}` : ""}, speaking French with a natural, authentic ${nationality} accent.`,
    `${tone.charAt(0).toUpperCase() + tone.slice(1)} voice, lively and friendly, like a TikTok creator talking to ${a.gender === "f" ? "her" : "his"} friends in a voice note.`,
    "Clear, close-mic phone recording, no background noise.",
  ].join(" ");
}

async function el(pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  const actors = (await readActors()).filter((a) => !only || only.has(a.id));
  const voices = JSON.parse(await fs.readFile(VOICES_FILE, "utf8").catch(() => "{}"));
  await fs.mkdir(PREVIEW_DIR, { recursive: true });

  for (const a of actors) {
    if (voices[a.id] && !force) {
      console.log(`= ${a.name}: déjà une voix (${voices[a.id]})`);
      continue;
    }
    const description = describe(a);
    const refFile = path.join(ROOT, "public", "creators", a.files, "voice.mp3");
    const reference = a.intro ? await fs.readFile(refFile).catch(() => null) : null;
    console.log(`→ ${a.name} (${a.id})${reference ? " + voix de référence" : ""}\n  ${description}`);
    if (dryRun) continue;

    const design = await el("/text-to-voice/design?output_format=mp3_44100_128", {
      voice_description: description,
      model_id: "eleven_ttv_v3",
      text: SAMPLE,
      ...(reference ? { reference_audio_base64: reference.toString("base64"), prompt_strength: 0.35 } : {}),
    });
    const preview = design.previews?.[0];
    if (!preview?.generated_voice_id) throw new Error(`${a.name}: aucune proposition de voix`);
    if (preview.audio_base_64) await fs.writeFile(path.join(PREVIEW_DIR, `${a.id}.mp3`), Buffer.from(preview.audio_base_64, "base64"));

    const created = await el("/text-to-voice", {
      voice_name: `Sokozia ${a.name}`,
      voice_description: description,
      generated_voice_id: preview.generated_voice_id,
    });
    voices[a.id] = created.voice_id;
    // Saved after each creator so a failure halfway keeps what was done.
    await fs.writeFile(VOICES_FILE, JSON.stringify(voices, null, 2) + "\n");
    console.log(`  ✓ voix ${created.voice_id}, aperçu dans voices-preview/${a.id}.mp3`);
  }
  console.log(dryRun ? "\nAperçu seulement (--dry-run), rien n'a été créé." : `\nlib/voices.json : ${Object.keys(voices).length} voix.`);
}

main().catch((e) => {
  console.error("Échec :", e.message);
  process.exit(1);
});
