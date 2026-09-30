import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { consumePass } from "@/lib/passes";
import { startGeneration } from "@/lib/generation";

// Crée une pub avec une pub restante du pass correspondant (style + durée). L'admin crée gratuitement.
export async function POST(req: Request) {
  const { user, profile } = await getSession();
  if (!user || !profile) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const { conversationId, styleId, duration, imageUrl } = (await req.json()) as { conversationId: string; styleId: string; duration: number; imageUrl?: string };

  const { data: styles } = await adminClient().database.from("styles").select("durations").eq("id", styleId).eq("active", true).limit(1);
  const durations = ((styles?.[0]?.durations as number[]) ?? []).map(Number);
  if (!durations.includes(duration)) return NextResponse.json({ error: "Cette durée n'est pas disponible pour ce style." }, { status: 400 });

  let passId: string | null = null;
  if (!profile.is_admin) {
    passId = await consumePass(user.id, styleId, duration);
    if (!passId) return NextResponse.json({ error: "Aucune pub restante pour ce style et cette durée.", needPayment: true }, { status: 402 });
  }
  try {
    const videoId = await startGeneration({ userId: user.id, conversationId, styleId, duration, imageUrl, passId });
    return NextResponse.json({ videoId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
