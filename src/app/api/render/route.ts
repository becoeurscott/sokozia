import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { currencyOf, fmt, loadPricing } from "@/lib/pricing";
import { quote } from "@/lib/quote";
import { walletApply } from "@/lib/wallet";
import { STYLE_COLS, startVideoJob, type StyleRow } from "@/lib/providers";
import { renderPrompt } from "@/lib/director";
import { syncVideo, VIDEO_COLS } from "@/lib/videos";

// Prix d'une génération (modèle + durée + format), pour l'afficher avant de lancer.
export async function GET(req: Request) {
  const { profile } = await getSession();
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  if (id) {
    // Suivi d'une génération en cours.
    if (!profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data } = await adminClient().database.from("videos").select(VIDEO_COLS).eq("id", id).eq("created_by", profile.id).limit(1);
    if (!data?.[0]) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    const v = await syncVideo(data[0] as Parameters<typeof syncVideo>[0]);
    return NextResponse.json({ status: v.status, url: v.video_url });
  }
  const currency = currencyOf(profile?.country ?? "CI");
  const q = await quote(u.searchParams.get("model") ?? "", Number(u.searchParams.get("duration")), u.searchParams.get("aspect") ?? "9:16", currency);
  if (!q) return NextResponse.json({ error: "Combinaison indisponible." }, { status: 400 });
  return NextResponse.json({ price: q.price, label: fmt(q.price, currency) });
}

// Lance une génération : débite le portefeuille, envoie à Higgsfield. Remboursé automatiquement en cas d'échec.
export async function POST(req: Request) {
  const { user, profile } = await getSession();
  if (!user || !profile) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const b = (await req.json()) as { imageUrl?: string; prompt?: string; duration?: number; aspect?: string; model?: string };
  const prompt = (b.prompt ?? "").trim().slice(0, 1500);
  if (!b.imageUrl || !/^https:\/\//.test(b.imageUrl)) return NextResponse.json({ error: "Ajoute la photo de ton produit." }, { status: 400 });
  if (prompt.length < 5) return NextResponse.json({ error: "Décris la vidéo que tu veux." }, { status: 400 });

  const currency = currencyOf(profile.country);
  const pricing = await loadPricing();
  const q = await quote(b.model ?? "", Number(b.duration), b.aspect ?? "9:16", currency, pricing);
  if (!q) return NextResponse.json({ error: "Ce modèle ne propose pas cette durée ou ce format." }, { status: 400 });

  const db = adminClient().database;
  const videoId = crypto.randomUUID();
  const label = `Vidéo ${q.style.name_fr} · ${b.duration} s · ${b.aspect}`;
  const free = profile.is_admin;
  if (!free) {
    const left = await walletApply(user.id, -q.price, "generation", label, videoId, currency);
    if (left === null) return NextResponse.json({ error: `Solde insuffisant : cette vidéo coûte ${fmt(q.price, currency)}.`, needTopup: true, price: q.price }, { status: 402 });
  }
  const { error } = await db.from("videos").insert([{
    id: videoId, created_by: user.id, style_id: q.style.id, prompt, image_url: b.imageUrl, status: "pending",
    duration_s: b.duration, aspect_ratio: b.aspect, price: free ? 0 : q.price, currency, cost_usd: q.usd, wallet_tx: free ? null : videoId,
  }]);
  if (error) {
    if (!free) await walletApply(user.id, q.price, "refund", `Remboursement · ${label}`, videoId, currency);
    return NextResponse.json({ error: "La création n'a pas pu démarrer." }, { status: 500 });
  }
  try {
    const { data: st } = await db.from("styles").select(STYLE_COLS).eq("id", q.style.id).limit(1);
    const finalPrompt = await renderPrompt(prompt, Number(b.duration), b.aspect ?? "9:16");
    const jobId = await startVideoJob(st![0] as StyleRow, finalPrompt, Number(b.duration), { startImage: b.imageUrl, aspect: b.aspect });
    await db.from("videos").update({ apiframe_task_id: jobId, status: "processing" }).eq("id", videoId);
    return NextResponse.json({ videoId });
  } catch (e) {
    await db.from("videos").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", videoId);
    if (!free) await walletApply(user.id, q.price, "refund", `Remboursement · ${label}`, videoId, currency);
    return NextResponse.json({ error: "Le modèle n'a pas pu démarrer. Tu n'as pas été débité." }, { status: 502 });
  }
}
