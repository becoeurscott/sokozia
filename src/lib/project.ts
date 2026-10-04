import { adminClient } from "./insforge";
import { getJob, startImage, type ImageModel } from "./apiframe";
import * as awa from "./director";
import type { ChatTurn, Option, Product } from "./director";
import { creatorSheetUrl, findCreator } from "@/content/creators";

// Projet de pub guidé : produit -> créateur -> lieu -> script -> vidéo.
// Chaque étape d'image peut être régénérée au plus `max_retries` fois (coût inclus dans le prix).

export type Step = "product" | "creator" | "location" | "script" | "video" | "done";
export type ImageKind = "product" | "creator" | "location" | "frame";
type Img = { id: string; kind: ImageKind; prompt: string | null; status: string; url: string | null; approved: boolean; apiframe_task_id: string | null };

export type ProjectRow = {
  id: string; user_id: string; title: string; step: Step; product: Product | null; options: Option[] | null;
  picked: string | null; duration_s: number | null; script: string | null; retries: Record<string, number>;
  photos: string[]; creator_id: string | null; creator_desc: string | null;
};

const db = () => adminClient().database;

async function settings() {
  const { data } = await db().from("settings").select("key, value").in("key", ["image_model", "max_retries"]);
  const s = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return { imageModel: s.image_model as ImageModel, maxRetries: Number(s.max_retries ?? 3) };
}

async function say(convId: string, content: string, role: "assistant" | "user" = "assistant") {
  if (content) await db().from("messages").insert([{ conversation_id: convId, role, content }]);
}

async function update(convId: string, patch: Partial<ProjectRow>) {
  await db().from("conversations").update(patch).eq("id", convId);
}

export async function loadProject(userId: string, convId: string) {
  const { data } = await db().from("conversations")
    .select("id, user_id, title, step, product, options, picked, duration_s, script, retries, photos, creator_id, creator_desc")
    .eq("id", convId).eq("user_id", userId).limit(1);
  return (data?.[0] as ProjectRow) ?? null;
}

async function latestImages(convId: string) {
  const { data } = await db().from("project_images")
    .select("id, kind, prompt, status, url, approved, apiframe_task_id")
    .eq("conversation_id", convId).order("created_at", { ascending: false }).limit(40);
  const out: Partial<Record<ImageKind, Img>> = {};
  for (const i of (data ?? []) as Img[]) if (!out[i.kind]) out[i.kind] = i;
  return out;
}

// Interroge APIFrame pour les images en cours et copie le résultat dans NOTRE stockage.
export async function syncImages(convId: string) {
  const { data } = await db().from("project_images").select("id, apiframe_task_id")
    .eq("conversation_id", convId).eq("status", "processing").limit(10);
  for (const img of (data ?? []) as { id: string; apiframe_task_id: string | null }[]) {
    if (!img.apiframe_task_id) continue;
    const job = await getJob(img.apiframe_task_id);
    if (job.status === "failed") {
      await db().from("project_images").update({ status: "failed" }).eq("id", img.id).eq("status", "processing");
    } else if (job.status === "ready" && job.url) {
      const file = await fetch(job.url);
      if (!file.ok) continue;
      const { data: up } = await adminClient().storage.from("videos").upload(`projects/${convId}/${img.id}.png`, await file.blob());
      if (up) await db().from("project_images").update({ status: "ready", url: up.url, storage_key: up.key }).eq("id", img.id).eq("status", "processing");
    }
  }
}

async function genImage(convId: string, kind: ImageKind, prompt: string, aspect: "16:9" | "9:16", refs: string[]) {
  const { imageModel } = await settings();
  const { data } = await db().from("project_images").insert([{ conversation_id: convId, kind, prompt }]).select("id");
  const id = data![0].id as string;
  try {
    const task = await startImage(imageModel, prompt, aspect, refs);
    await db().from("project_images").update({ apiframe_task_id: task }).eq("id", id);
  } catch (e) {
    await db().from("project_images").update({ status: "failed" }).eq("id", id);
    throw e;
  }
  return id;
}

// État complet envoyé au navigateur (sans les prompts techniques).
export type ProjectState = Awaited<ReturnType<typeof projectState>>;

export async function projectState(p: ProjectRow) {
  await syncImages(p.id);
  const [imgs, { data: msgs }, { maxRetries }, { data: vids }] = await Promise.all([
    latestImages(p.id),
    db().from("messages").select("role, content").eq("conversation_id", p.id).order("created_at").limit(200),
    settings(),
    db().from("videos").select("id, status, video_url, style_id").eq("conversation_id", p.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const v = vids?.[0] as { id: string; status: string; video_url: string | null; style_id: string } | undefined;
  const pub = (i?: Img) => (i ? { status: i.status, url: i.url, approved: i.approved } : null);
  return {
    id: p.id, title: p.title, step: p.step, options: p.options, picked: p.picked, duration: p.duration_s, script: p.script,
    product: p.product ? { brand: p.product.brand, name: p.product.name, language: p.product.language } : null,
    creatorId: p.creator_id, photos: p.photos ?? [],
    images: { product: pub(imgs.product), creator: pub(imgs.creator), location: pub(imgs.location) },
    retriesLeft: Math.max(0, maxRetries - (p.retries?.[p.step] ?? 0)),
    messages: (msgs ?? []) as { role: string; content: string }[],
    video: v ? { id: v.id, status: v.status === "pending" ? "processing" : v.status, url: v.video_url, style: v.style_id } : null,
  };
}

// ---- Actions ----

// Le projet démarre par un premier message dans le chat ; Awa recueille les infos du produit.
export async function createProject(userId: string, text: string, photos: string[]) {
  const { data } = await db().from("conversations").insert([{
    user_id: userId, title: text.slice(0, 50) || "Nouvelle pub", step: "product", photos,
  }]).select("id");
  const convId = data![0].id as string;
  await say(convId, text || "(photos envoyées)", "user");
  await intake((await loadProject(userId, convId))!);
  return convId;
}

// Une étape de la conversation produit. Quand la fiche est complète, on lance l'image de la fiche produit.
async function intake(p: ProjectRow) {
  const { data: msgs } = await db().from("messages").select("role, content").eq("conversation_id", p.id).order("created_at").limit(60);
  const r = await awa.productChat((msgs ?? []) as ChatTurn[], p.photos?.length ?? 0);
  await say(p.id, r.reply);
  if (!r.product) return;
  // Valeurs par défaut pour les champs facultatifs que la conversation n'a pas couverts.
  const raw = r.product as Record<string, unknown>;
  const str = (k: string, d = "") => (typeof raw[k] === "string" && (raw[k] as string).trim() ? (raw[k] as string).trim() : d);
  const product = {
    brand: str("brand"), name: str("name"), what: str("what"), looks: str("looks"), hidden: str("hidden"),
    benefits: str("benefits"), buyer: str("buyer"), platform: str("platform", "TikTok"), videoStyle: str("videoStyle", "propose"),
    vibe: str("vibe"), direction: str("direction"), avoid: str("avoid"), language: str("language", "français"),
    worn: Boolean(raw.worn), photos: p.photos ?? [],
  } as Product;
  await update(p.id, { product, title: `${product.brand} ${product.name}`.trim().slice(0, 60) });
  const sheet = await awa.productSheetPrompt(product);
  await genImage(p.id, "product", sheet.prompt, "16:9", product.photos);
}

const IMAGE_STEP: Partial<Record<Step, ImageKind>> = { product: "product", creator: "creator", location: "location" };

async function useRetry(p: ProjectRow) {
  const { maxRetries } = await settings();
  const used = p.retries?.[p.step] ?? 0;
  if (used >= maxRetries) throw new Error(`Tu as déjà utilisé tes ${maxRetries} essais pour cette étape. Valide la version actuelle ou écris-nous.`);
  await update(p.id, { retries: { ...p.retries, [p.step]: used + 1 } });
}

async function imageFor(p: ProjectRow, kind: ImageKind, feedback?: string, previous?: string) {
  const prod = p.product!;
  if (kind === "product") {
    const r = await awa.productSheetPrompt(prod, feedback, previous);
    return { ...r, refs: prod.photos };
  }
  const imgs = await latestImages(p.id);
  if (kind === "creator") {
    const worn = Boolean((prod as Product & { worn?: boolean }).worn);
    const r = await awa.creatorSheetPrompt(prod, p.picked ?? "", worn, feedback, previous);
    return { ...r, refs: worn && imgs.product?.url ? [imgs.product.url] : [] };
  }
  const r = await awa.locationPrompt(prod, p.picked ?? "", feedback, previous);
  return { ...r, refs: [] };
}

export async function act(p: ProjectRow, a: { action: string; text?: string; index?: number; duration?: number; photos?: string[]; creatorId?: string }) {
  const text = (a.text ?? "").trim().slice(0, 1000);
  const kind = IMAGE_STEP[p.step];

  // Conversation produit (avant la fiche produit) : message + photos éventuelles.
  if (p.step === "product" && !p.product) {
    const photos = [...(p.photos ?? []), ...(a.photos ?? [])].slice(0, 6);
    if (a.photos?.length) await update(p.id, { photos });
    await say(p.id, text || `(${a.photos?.length ?? 0} photo(s) envoyée(s))`, "user");
    await intake({ ...p, photos });
    return;
  }
  const prod = p.product!;

  // Choix d'un créateur du catalogue : sa fiche personnage existe déjà, on passe directement au lieu.
  if (a.action === "creator" && p.step === "creator") {
    const c = findCreator(a.creatorId);
    if (!c) throw new Error("Créateur introuvable.");
    const desc = `${c.name}, ${c.age} ans, ${c.country} — ${c.look}`;
    await say(p.id, `Je choisis ${c.name}`, "user");
    await db().from("project_images").insert([{ conversation_id: p.id, kind: "creator", status: "ready", approved: true, url: creatorSheetUrl(c.id), prompt: desc }]);
    const r = await awa.locationOptions(prod, desc);
    await update(p.id, { creator_id: c.id, creator_desc: desc, step: "location", options: r.options, picked: null });
    await say(p.id, `Excellent choix, ${c.name} va présenter ton produit. ${r.message}`);
    return;
  }

  // Modifier ou régénérer l'image / le script de l'étape en cours.
  if (a.action === "revise" || a.action === "regenerate") {
    if (a.action === "revise" && text) await say(p.id, text, "user");
    if (kind) {
      const current = (await latestImages(p.id))[kind];
      if (!current) throw new Error("Choisis d'abord une option.");
      const failed = current.status === "failed";
      if (!failed) await useRetry(p); // un échec technique ne coûte pas d'essai
      if (a.action === "regenerate" || !text) {
        await genImage(p.id, kind, current.prompt ?? "", "16:9", (await imageFor(p, kind)).refs);
        await say(p.id, "Je relance une nouvelle version.");
      } else {
        const r = await imageFor(p, kind, text, current.prompt ?? "");
        await say(p.id, r.message);
        await genImage(p.id, kind, r.prompt, "16:9", r.refs);
      }
      return;
    }
    if (p.step === "script" && p.script && text) {
      const r = await awa.writeScript(prod, p.picked ?? "", p.duration_s ?? 15, text, p.script);
      await update(p.id, { script: r.script });
      await say(p.id, r.message);
      return;
    }
    throw new Error("Rien à modifier pour l'instant.");
  }

  // Choisir une des 3 options (ou proposer la sienne).
  if (a.action === "pick") {
    const choice = typeof a.index === "number" && p.options?.[a.index]
      ? `${p.options[a.index].title} — ${p.options[a.index].detail}`
      : text;
    if (!choice) throw new Error("Choisis une option ou écris ta propre idée.");
    await say(p.id, choice, "user");
    await update(p.id, { picked: choice, options: null });
    const next = { ...p, picked: choice };
    if (p.step === "creator" || p.step === "location") {
      const r = await imageFor(next, p.step);
      await say(p.id, r.message);
      await genImage(p.id, p.step, r.prompt, "16:9", r.refs);
    } else if (p.step === "script") {
      const r = await awa.writeScript(prod, choice, p.duration_s ?? 15);
      await update(p.id, { script: r.script });
      await say(p.id, r.message);
    }
    return;
  }

  // Durée de la pub (au début de l'étape script) -> 3 idées.
  if (a.action === "duration" && p.step === "script") {
    const d = Number(a.duration);
    if (![8, 15, 30].includes(d)) throw new Error("Durée invalide.");
    await say(p.id, `Pub de ${d} secondes`, "user");
    const r = await awa.scriptIdeas(prod, d);
    await update(p.id, { duration_s: d, options: r.options, picked: null, script: null });
    await say(p.id, r.message);
    return;
  }

  // Valider l'étape en cours et passer à la suivante.
  if (a.action === "approve") {
    if (kind) {
      const current = (await latestImages(p.id))[kind];
      if (current?.status !== "ready") throw new Error("Attends que l'image soit prête.");
      await db().from("project_images").update({ approved: true }).eq("id", current.id);
    }
    if (p.step === "product") {
      await update(p.id, { step: "creator", options: null, picked: null });
      await say(p.id, "Fiche produit validée. Choisis maintenant le créateur qui va présenter ton produit. Tu peux écouter sa présentation. Tu préfères un créateur sur mesure ? Décris-le dans le chat.");
    } else if (p.step === "creator") {
      const r = await awa.locationOptions(prod, p.picked ?? "");
      await update(p.id, { step: "location", options: r.options, picked: null, creator_desc: p.picked, creator_id: null });
      await say(p.id, r.message);
    } else if (p.step === "location") {
      await update(p.id, { step: "script", options: null, picked: null });
      await say(p.id, "Super. Ta pub doit durer combien de temps ?");
    } else if (p.step === "script") {
      if (!p.script) throw new Error("Choisis d'abord une idée de script.");
      await update(p.id, { step: "video", options: null });
      await say(p.id, "Script validé. Choisis le style de ta vidéo et on la lance.");
    }
    return;
  }
  // Une autre version de la pub : on revient au choix du style (mêmes images et même script).
  if (a.action === "again" && p.step === "done") {
    await update(p.id, { step: "video" });
    await say(p.id, "On refait une version. Choisis le style.");
    return;
  }
  throw new Error("Action inconnue.");
}

// Références approuvées pour la vidéo : [fiche personnage, fiche produit, lieu].
export async function approvedRefs(convId: string) {
  const imgs = await latestImages(convId);
  return [imgs.creator, imgs.product, imgs.location].map((i) => (i?.approved ? i.url : null)).filter(Boolean) as string[];
}

export { genImage, latestImages };
