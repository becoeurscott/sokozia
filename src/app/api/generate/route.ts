import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { consumePass } from "@/lib/passes";
import { startGeneration } from "@/lib/generation";
import { loadProject } from "@/lib/project";

// Lance la vidéo d'un projet validé, avec une pub restante du pass (style + durée). L'admin crée gratuitement.
export async function POST(req: Request) {
  const { user, profile } = await getSession();
  if (!user || !profile) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const body = (await req.json()) as { conversationId: string; styleId?: string };
  const conversationId = body.conversationId;
  const p = await loadProject(user.id, conversationId);
  if (!p?.duration_s) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const styleId = body.styleId || p.style_id || "";

  const { data: styles } = await adminClient().database.from("styles").select("durations").eq("id", styleId).eq("active", true).limit(1);
  if (!((styles?.[0]?.durations as number[]) ?? []).map(Number).includes(p.duration_s))
    return NextResponse.json({ error: "Ce style ne fait pas cette durée." }, { status: 400 });

  let passId: string | null = null;
  if (!profile.is_admin) {
    passId = await consumePass(user.id, styleId, p.duration_s);
    if (!passId) return NextResponse.json({ error: "Aucune pub restante pour ce style et cette durée.", needPayment: true }, { status: 402 });
  }
  try {
    return NextResponse.json({ videoId: await startGeneration({ userId: user.id, conversationId, styleId, passId }) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
