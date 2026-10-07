import { adminClient } from "./insforge";
import { getJobStatus, startImageJob } from "./providers";
import * as awa from "./director";
import type { ChatTurn, Option, Product, Shot } from "./director";
import { creatorSheetUrl, findCreator } from "@/content/creators";
import { findFormat } from "@/content/formats";
import { currencyOf, fmt, loadPricing, planPrice } from "./pricing";

// Projet de pub guidé, tout en choix cliquables :
// produit -> créateur -> format -> lieu -> style (durée, prix) -> aperçu (découpage + image) -> vidéo.
// Chaque image peut être régénérée au plus `max_retries` fois (coût inclus dans le prix).

export type Step = "product" | "creator" | "format" | "location" | "style" | "preview" | "video" | "done";
export type ImageKind = "product" | "creator" | "location" | "frame" | "location_option";
type Img = { id: string; kind: ImageKind; prompt: string | null; status: string; url: string | null; approved: boolean; apiframe_task_id: string | null };

export type ProjectRow = {
  id: string; user_id: string; title: string; step: Step; product: Product | null; options: Option[] | null;
  picked: string | null; duration_s: number | null; script: string | null; retries: Record<string, number>;
  photos: string[]; creator_id: string | null; creator_desc: string | null;
  format_id: string | null; style_id: string | null; suggested_style: string | null; suggested_reason: string | null; shots: Shot[] | null;
};

const COLS = "id, user_id, title, step, product, options, picked, duration_s, script, retries, photos, creator_id, creator_desc, format_id, style_id, suggested_style, suggested_reason, shots";
const db = () => adminClient().database;

async function settings() {
  const { data } = await db().from("settings").select("key, value").in("key", ["max_retries"]);
  const s = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return { maxRetries: Number(s.max_retries ?? 3) };
}

async function say(convId: string, content: string, role: "assistant" | "user" = "assistant", attachments: string[] = []) {
  if (content || attachments.length) await db().from("messages").insert([{ conversation_id: convId, role, content, attachments }]);
}

async function update(convId: string, patch: Partial<ProjectRow>) {
  await db().from("conversations").update(patch).eq("id", convId);
}

export async function loadProject(userId: string, convId: string) {
  const { data } = await db().from("conversations").select(COLS).eq("id", convId).eq("user_id", userId).limit(1);
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

// Interroge le fournisseur pour les images en cours et copie le résultat dans NOTRE stockage.
export async function syncImages(convId: string) {
  const { data } = await db().from("project_images").select("id, apiframe_task_id")
    .eq("conversation_id", convId).eq("status", "processing").limit(10);
  for (const img of (data ?? []) as { id: string; apiframe_task_id: string | null }[]) {
    if (!img.apiframe_task_id) continue;
    const job = await getJobStatus(img.apiframe_task_id);
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

async function genImage(convId: string, kind: ImageKind, prompt: string, aspect: "16:9" | "9:16", refs: string[], optionIndex?: number) {
  const { data } = await db().from("project_images").insert([{ conversation_id: convId, kind, prompt, option_index: optionIndex ?? null }]).select("id");
  const id = data![0].id as string;
  try {
    const task = await startImageJob(prompt, aspect, refs);
    await db().from("project_images").update({ apiframe_task_id: task }).eq("id", id);
  } catch (e) {
    await db().from("project_images").update({ status: "failed" }).eq("id", id);
    throw e;
  }
  return id;
}

// État complet envoyé au navigateur (sans les prompts techniques).
export type ProjectState = Awaited<ReturnType<typeof projectState>>;

// Photos des lieux proposés (la plus récente par option).
async function locationOptionImages(convId: string) {
  const { data } = await db().from("project_images").select("option_index, status, url, created_at")
    .eq("conversation_id", convId).eq("kind", "location_option").order("created_at", { ascending: false }).limit(12);
  const out: Record<number, { status: string; url: string | null }> = {};
  for (const r of (data ?? []) as { option_index: number; status: string; url: string | null }[]) if (out[r.option_index] === undefined) out[r.option_index] = { status: r.status, url: r.url };
  return out;
}

export async function projectState(p: ProjectRow) {
  await syncImages(p.id);
  const locOpts = p.step === "location" && p.options?.length ? await locationOptionImages(p.id) : {};
  const [imgs, { data: msgs }, { maxRetries }, { data: vids }] = await Promise.all([
    latestImages(p.id),
    db().from("messages").select("role, content, attachments").eq("conversation_id", p.id).order("created_at").limit(200),
    settings(),
    db().from("videos").select("id, status, video_url, style_id, created_at").eq("conversation_id", p.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const v = vids?.[0] as { id: string; status: string; video_url: string | null; style_id: string; created_at: string } | undefined;
  const pub = (i?: Img) => (i ? { status: i.status, url: i.url, approved: i.approved } : null);
  return {
    id: p.id, title: p.title, step: p.step, options: p.options, picked: p.picked, duration: p.duration_s,
    product: p.product ? { brand: p.product.brand, name: p.product.name, language: p.product.language } : null,
    creatorId: p.creator_id, creatorName: findCreator(p.creator_id)?.name ?? (p.creator_desc ? "créateur sur mesure" : null),
    photos: p.photos ?? [],
    formatId: p.format_id, format: findFormat(p.format_id)?.label ?? null,
    styleId: p.style_id, suggestedStyle: p.suggested_style, suggestedReason: p.suggested_reason,
    locationName: p.step === "location" || ORDER.indexOf(p.step) > ORDER.indexOf("location") ? (p.picked?.split(" — ")[0] ?? null) : null,
    shots: p.shots ?? null,
    images: { product: pub(imgs.product), creator: pub(imgs.creator), location: pub(imgs.location), frame: pub(imgs.frame) },
    locationPhotos: (p.options ?? []).map((_, i) => locOpts[i] ?? null),
    retriesLeft: Math.max(0, maxRetries - (p.retries?.[p.step] ?? 0)),
    messages: (msgs ?? []) as { role: string; content: string; attachments: string[] }[],
    video: v ? { id: v.id, status: v.status === "pending" ? "processing" : v.status, url: v.video_url, style: v.style_id, startedAt: v.created_at } : null,
  };
}

const ORDER: Step[] = ["product", "creator", "format", "location", "style", "preview", "video", "done"];

// ---- Démarrage ----

// Le projet démarre par un premier message dans le chat ; Awa recueille les infos du produit.
export async function createProject(userId: string, text: string, photos: string[]) {
  const { data } = await db().from("conversations").insert([{
    user_id: userId, title: text.slice(0, 50) || "Nouvelle pub", step: "product", photos,
  }]).select("id");
  const convId = data![0].id as string;
  await say(convId, text, "user", photos);
  await intake((await loadProject(userId, convId))!);
  return convId;
}

// Une étape de la conversation produit. Quand la fiche est complète, on lance l'image de la fiche produit.
async function intake(p: ProjectRow) {
  const { data: msgs } = await db().from("messages").select("role, content").eq("conversation_id", p.id).order("created_at").limit(60);
  const r = await awa.productChat((msgs ?? []) as ChatTurn[], p.photos?.length ?? 0);
  await say(p.id, r.reply);
  if (!r.product) {
    const choices = (r.choices ?? []).map((c) => String(c).trim()).filter(Boolean).slice(0, 4);
    await update(p.id, { options: choices.map((c) => ({ title: c, detail: "" })) });
    return;
  }
  const raw = r.product as Record<string, unknown>;
  const str = (k: string, d = "") => (typeof raw[k] === "string" && (raw[k] as string).trim() ? (raw[k] as string).trim() : d);
  const product = {
    brand: str("brand"), name: str("name"), what: str("what"), looks: str("looks"), hidden: str("hidden"),
    benefits: str("benefits"), buyer: str("buyer"), platform: str("platform", "TikTok"), videoStyle: str("videoStyle", "propose"),
    vibe: str("vibe"), direction: str("direction"), avoid: str("avoid"), language: str("language", "français"),
    worn: Boolean(raw.worn), photos: p.photos ?? [],
  } as Product;
  await update(p.id, { product, options: null, title: `${product.brand} ${product.name}`.trim().slice(0, 60) });
  // Pas de fiche produit sans vraie photo : sinon l'IA invente un produit qui n'est pas le sien.
  if (!product.photos.length) {
    await say(p.id, "Il me manque une chose : envoie-moi au moins une photo de ton produit (de face, bien éclairée). C'est elle qui garantit que la pub montre ton vrai produit.");
    return;
  }
  await sheetFor(p.id, product);
}

async function sheetFor(id: string, product: Product) {
  const sheet = await awa.productSheetPrompt(product);
  await genImage(id, "product", sheet.prompt, "16:9", product.photos);
}

// ---- Outils ----

async function styleBriefs(userId: string): Promise<awa.StyleBrief[]> {
  const [pricing, { data: prof }] = await Promise.all([loadPricing(), db().from("profiles").select("country").eq("id", userId).limit(1)]);
  const cur = currencyOf(prof?.[0]?.country ?? "CM");
  return pricing.styles.map((st) => ({
    id: st.id, name: st.name_fr, description: st.description_fr, durations: st.durations,
    price: st.durations.map((d) => `${d} s : ${fmt(planPrice(pricing, "single", st, d, cur), cur)}`).join(", "),
  }));
}

function cleanShots(raw: unknown): Shot[] {
  if (!Array.isArray(raw)) return [];
  const t = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  return raw.slice(0, 8).map((x) => ({ time: t(x?.time, 12), camera: t(x?.camera, 80), action: t(x?.action, 300), line: t(x?.line, 300) }))
    .filter((x) => x.action || x.line);
}

const IMAGE_STEP: Partial<Record<Step, ImageKind>> = { product: "product", creator: "creator", location: "location", preview: "frame" };

async function useRetry(p: ProjectRow) {
  const { maxRetries } = await settings();
  const used = p.retries?.[p.step] ?? 0;
  if (used >= maxRetries) throw new Error(`Tu as déjà utilisé tes ${maxRetries} essais pour cette étape. Valide la version actuelle ou écris-nous.`);
  await update(p.id, { retries: { ...p.retries, [p.step]: used + 1 } });
}

async function imageFor(p: ProjectRow, kind: ImageKind, feedback?: string, previous?: string) {
  const prod = p.product!;
  const imgs = await latestImages(p.id);
  if (kind === "product") {
    const r = await awa.productSheetPrompt(prod, feedback, previous);
    return { ...r, refs: prod.photos };
  }
  if (kind === "creator") {
    const worn = Boolean((prod as Product & { worn?: boolean }).worn);
    const r = await awa.creatorSheetPrompt(prod, p.picked ?? "", worn, feedback, previous);
    return { ...r, refs: worn && imgs.product?.url ? [imgs.product.url] : [] };
  }
  if (kind === "frame") {
    const r = await awa.previewPrompt(prod, p.shots ?? [], p.creator_desc ?? "", findFormat(p.format_id)?.direction);
    const refs = [imgs.creator?.url, imgs.location?.url, imgs.product?.url].filter(Boolean) as string[];
    return { message: "Je prépare un nouvel aperçu.", prompt: r.prompt, refs };
  }
  const r = await awa.locationPrompt(prod, p.picked ?? "", feedback, previous);
  return { ...r, refs: [] };
}

// Découpage (Claude) + image d'aperçu, une fois style et durée confirmés.
async function buildPreview(p: ProjectRow, feedback?: string) {
  const prod = p.product!;
  const fmtDef = findFormat(p.format_id);
  const idea = `Format ${fmtDef?.label ?? "libre"} : ${fmtDef?.direction ?? ""}. Lieu : ${p.picked ?? ""}. Créateur : ${p.creator_desc ?? ""}.`;
  const r = await awa.writeScript(prod, idea, p.duration_s ?? 15, await styleBriefs(p.user_id), feedback, p.shots ?? undefined);
  const shots = cleanShots(r.shots);
  if (!shots.length) throw new Error("Awa n'a pas réussi à écrire le découpage, réessaie.");
  await update(p.id, { shots, script: awa.shotsToScript(shots) });
  const f = await imageFor({ ...p, shots }, "frame");
  await genImage(p.id, "frame", f.prompt, "9:16", f.refs);
  await say(p.id, r.message);
}

// Une photo par lieu proposé (en parallèle), pour que le client choisisse sur image.
async function proposeLocationPhotos(convId: string, prod: Product, options: Option[]) {
  await Promise.all(options.slice(0, 3).map(async (o, i) => {
    try {
      const r = await awa.locationPrompt(prod, `${o.title} — ${o.detail}`);
      await genImage(convId, "location_option", r.prompt, "16:9", [], i);
    } catch {
      // Une photo manquante n'empêche pas de choisir : le lieu sera alors généré après le choix.
    }
  }));
}

// Lieu choisi : on passe au style, conseillé par Awa.
async function toStyle(p: ProjectRow, prod: Product, location: string) {
  const briefs = await styleBriefs(p.user_id);
  const r = await awa.styleAdvice(prod, p.creator_desc ?? "", findFormat(p.format_id)?.label ?? "", location, briefs);
  const st = briefs.find((x) => x.id === r.style) ?? briefs[0];
  const d = st.durations.includes(Number(r.duration)) ? Number(r.duration) : st.durations[0];
  await update(p.id, { step: "style", options: null, style_id: st.id, duration_s: d, suggested_style: st.id, suggested_reason: r.reason });
  await say(p.id, r.message);
}

// ---- Actions ----

export type Action = {
  action: string; text?: string; index?: number; duration?: number; photos?: string[];
  creatorId?: string; formatId?: string; styleId?: string; url?: string; shots?: unknown;
};

export async function act(p: ProjectRow, a: Action) {
  const text = (a.text ?? "").trim().slice(0, 1000);
  const kind = IMAGE_STEP[p.step];

  // 1. Conversation produit (avant la fiche produit) : message + photos éventuelles.
  if (p.step === "product" && (!p.product || !p.photos?.length)) {
    const photos = [...(p.photos ?? []), ...(a.photos ?? [])].slice(0, 6);
    if (a.photos?.length) await update(p.id, { photos });
    await say(p.id, text, "user", a.photos ?? []);
    // Fiche déjà complète, il ne manquait que la photo : on lance directement l'image.
    if (p.product && photos.length && a.photos?.length) {
      await say(p.id, "Merci, j'ai ta photo. Je prépare ta fiche produit.");
      return sheetFor(p.id, { ...(p.product as Product), photos });
    }
    await intake({ ...p, photos });
    return;
  }
  const prod = p.product!;

  // 2. Créateur du catalogue (clic sur une carte).
  if (a.action === "creator" && p.step === "creator") {
    const c = findCreator(a.creatorId);
    if (!c) throw new Error("Créateur introuvable.");
    const desc = `${c.name}, ${c.age} ans, ${c.country} — ${c.look}`;
    await say(p.id, `Je choisis ${c.name}`, "user");
    await db().from("project_images").insert([{ conversation_id: p.id, kind: "creator", status: "ready", approved: true, url: creatorSheetUrl(c.id), prompt: desc }]);
    const r = await awa.formatPicks(prod, desc);
    await update(p.id, { creator_id: c.id, creator_desc: desc, step: "format", options: r.picks.map((x) => ({ title: x.id, detail: x.reason, format: x.id })), picked: null });
    await say(p.id, `${c.name} va présenter ton produit. ${r.message}`);
    return;
  }

  // 3. Format de pub (clic sur une carte).
  if (a.action === "format" && p.step === "format") {
    const f = findFormat(a.formatId);
    if (!f) throw new Error("Format introuvable.");
    await say(p.id, `Format : ${f.label}`, "user");
    const r = await awa.locationOptions(prod, p.creator_desc ?? "");
    await update(p.id, { format_id: f.id, step: "location", options: r.options, picked: null });
    await proposeLocationPhotos(p.id, prod, r.options);
    await say(p.id, `${f.label}, très bon choix. ${r.message} Tu peux aussi envoyer une photo de ton propre lieu.`);
    return;
  }

  // 4. Photo du lieu envoyée par le client.
  if (a.action === "locationPhoto" && p.step === "location") {
    const url = String(a.url ?? "");
    if (!url.startsWith("https://")) throw new Error("Photo invalide.");
    await say(p.id, "(photo de mon lieu)", "user");
    await db().from("project_images").insert([{ conversation_id: p.id, kind: "location", status: "ready", url, prompt: "photo du client" }]);
    await update(p.id, { picked: "Mon lieu (photo envoyée)", options: null });
    await say(p.id, "Merci, j'ai ta photo. Si elle te convient, valide-la.");
    return;
  }

  // Modifier ou régénérer l'image de l'étape en cours (ou le découpage à l'aperçu).
  if (a.action === "revise" || a.action === "regenerate") {
    if (a.action === "revise" && text) await say(p.id, text, "user");
    if (p.step === "preview") {
      await useRetry(p);
      if (a.action === "revise" && text) await buildPreview(p, text);
      else {
        const f = await imageFor(p, "frame");
        await genImage(p.id, "frame", f.prompt, "9:16", f.refs);
        await say(p.id, f.message);
      }
      return;
    }
    if (kind) {
      const current = (await latestImages(p.id))[kind];
      if (!current) throw new Error("Choisis d'abord une option.");
      if (current.status !== "failed") await useRetry(p); // un échec technique ne coûte pas d'essai
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
    throw new Error("Rien à modifier pour l'instant.");
  }

  // Choisir une option texte (lieu proposé / lieu décrit / créateur sur mesure décrit).
  if (a.action === "pick") {
    const opt = typeof a.index === "number" ? p.options?.[a.index] : undefined;
    const choice = opt ? `${opt.title} — ${opt.detail}` : text;
    if (!choice) throw new Error("Choisis une option ou écris ta propre idée.");
    if (p.step !== "creator" && p.step !== "location") throw new Error("Choisis avec les boutons.");
    if (p.step === "location" && opt && typeof a.index === "number") {
      const photo = (await locationOptionImages(p.id))[a.index];
      if (photo?.status === "processing") throw new Error("La photo de ce lieu arrive dans quelques secondes.");
      if (photo?.status === "ready" && photo.url) {
        await say(p.id, `Je choisis : ${opt.title}`, "user");
        await db().from("project_images").insert([{ conversation_id: p.id, kind: "location", status: "ready", approved: true, url: photo.url, prompt: choice }]);
        await update(p.id, { picked: choice, options: null });
        await toStyle({ ...p, picked: choice }, prod, choice);
        return;
      }
    }
    await say(p.id, choice, "user");
    await update(p.id, { picked: choice, options: null });
    const r = await imageFor({ ...p, picked: choice }, p.step);
    await say(p.id, r.message);
    await genImage(p.id, p.step, r.prompt, "16:9", r.refs);
    return;
  }

  // 5. Style et durée (clics), puis confirmation du prix.
  if (a.action === "style" && p.step === "style") {
    const pricing = await loadPricing();
    const st = pricing.styles.find((s) => s.id === a.styleId);
    if (!st) throw new Error("Style introuvable.");
    const d = p.duration_s && st.durations.includes(p.duration_s) ? p.duration_s : st.durations[0];
    await update(p.id, { style_id: st.id, duration_s: d });
    return;
  }
  if (a.action === "duration" && p.step === "style") {
    const d = Number(a.duration);
    const pricing = await loadPricing();
    const st = pricing.styles.find((s) => s.id === p.style_id);
    if (!st || !st.durations.includes(d)) throw new Error("Cette durée n'existe pas pour ce style.");
    await update(p.id, { duration_s: d });
    return;
  }
  if (a.action === "confirm" && p.step === "style") {
    const pricing = await loadPricing();
    const st = pricing.styles.find((s) => s.id === p.style_id);
    if (!st || !p.duration_s || !st.durations.includes(p.duration_s)) throw new Error("Choisis un style et une durée.");
    await say(p.id, `Style ${st.name_fr}, ${p.duration_s} secondes. C'est bon pour moi.`, "user");
    await update(p.id, { step: "preview", options: null });
    await buildPreview({ ...p, step: "preview" });
    return;
  }

  // Le client modifie lui-même le découpage.
  if (a.action === "editShots" && p.step === "preview" && p.shots) {
    const shots = cleanShots(a.shots);
    if (!shots.length) throw new Error("Le découpage ne peut pas être vide.");
    await update(p.id, { shots, script: awa.shotsToScript(shots) });
    await say(p.id, "J'ai modifié le découpage.", "user");
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
      const r = await awa.creatorPicks(prod);
      const picks = r.picks.filter((x) => findCreator(x.id)).slice(0, 3);
      await update(p.id, { step: "creator", options: picks.map((x) => ({ title: x.id, detail: x.reason })), picked: null });
      await say(p.id, `Fiche produit validée. ${r.message} Tu peux écouter chacun, voir tous les créateurs, ou décrire un créateur sur mesure dans le chat.`);
    } else if (p.step === "creator") {
      // Créateur sur mesure validé (fiche générée).
      const r = await awa.formatPicks(prod, p.picked ?? "");
      await update(p.id, { step: "format", options: r.picks.map((x) => ({ title: x.id, detail: x.reason, format: x.id })), creator_desc: p.picked, creator_id: null, picked: null });
      await say(p.id, r.message);
    } else if (p.step === "location") {
      await toStyle(p, prod, p.picked ?? "");
    } else if (p.step === "preview") {
      if (!p.shots?.length) throw new Error("Le découpage n'est pas prêt.");
      await update(p.id, { step: "video", options: null });
      await say(p.id, "Tout est prêt. Lance ta pub quand tu veux.");
    }
    return;
  }

  // Revenir au choix du style (changer de style / durée) ou refaire une version.
  if (a.action === "again" && (p.step === "done" || p.step === "video" || p.step === "preview")) {
    await update(p.id, { step: "style" });
    await say(p.id, "On reprend au choix du style et de la durée.");
    return;
  }
  throw new Error("Action inconnue.");
}

// Références approuvées pour la vidéo : [fiche personnage, fiche produit, lieu].
export async function approvedRefs(convId: string) {
  const imgs = await latestImages(convId);
  return [imgs.creator, imgs.product, imgs.location].map((i) => (i?.approved ? i.url : null)).filter(Boolean) as string[];
}

export async function approvedFrame(convId: string) {
  const imgs = await latestImages(convId);
  return imgs.frame?.approved ? imgs.frame.url : null;
}

export { genImage, latestImages };
