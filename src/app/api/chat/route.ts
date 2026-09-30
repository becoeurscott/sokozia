import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";
import { askDirector } from "@/lib/director";

export async function POST(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  const { conversationId, message } = (await req.json()) as { conversationId?: string; message: string };
  const text = String(message ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  const db = adminClient().database;

  let convId = conversationId;
  if (convId) {
    const { data } = await db.from("conversations").select("id").eq("id", convId).eq("user_id", user.id).limit(1);
    if (!data?.length) convId = undefined;
  }
  if (!convId) {
    const { data } = await db.from("conversations").insert([{ user_id: user.id }]).select("id");
    convId = data![0].id as string;
  }

  await db.from("messages").insert([{ conversation_id: convId, role: "user", content: text }]);
  const { data: history } = await db.from("messages").select("role, content")
    .eq("conversation_id", convId).order("created_at").limit(40);

  try {
    const { reply, brief } = await askDirector(history as { role: "user" | "assistant"; content: string }[]);
    await db.from("messages").insert([{ conversation_id: convId, role: "assistant", content: reply }]);
    if (brief) await db.from("conversations").update({ brief, title: brief.title }).eq("id", convId);
    // Le prompt vidéo reste côté serveur ; on n'envoie au client que ce qui est utile.
    return NextResponse.json({
      conversationId: convId,
      reply,
      brief: brief ? { title: brief.title, script_fr: brief.script_fr, suggested_style: brief.suggested_style, duration_s: Number(brief.duration_s) } : null,
    });
  } catch {
    return NextResponse.json({ conversationId: convId, error: "Awa est occupée, réessaie dans un instant." }, { status: 502 });
  }
}
