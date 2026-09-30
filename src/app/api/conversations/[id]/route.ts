import { NextResponse } from "next/server";
import { adminClient, getSession } from "@/lib/insforge";

// Rouvre une conversation : messages + brief (sans le prompt vidéo, qui reste côté serveur).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = adminClient().database;
  const { data: convs } = await db.from("conversations").select("id, brief").eq("id", id).eq("user_id", user.id).limit(1);
  const conv = convs?.[0];
  if (!conv) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const { data: messages } = await db.from("messages").select("role, content").eq("conversation_id", id).order("created_at").limit(100);
  const b = conv.brief as { title: string; script_fr: string; suggested_style: string; duration_s?: number } | null;
  return NextResponse.json({
    messages: messages ?? [],
    brief: b ? { title: b.title, script_fr: b.script_fr, suggested_style: b.suggested_style, duration_s: Number(b.duration_s) } : null,
  });
}
