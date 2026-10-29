import { NextResponse, type NextRequest } from "next/server";
import { notFound, params, readJson, requireUser, route } from "@/lib/api";
import { getDb, now } from "@/lib/db";
import type { BriefContent, Message, Thread } from "@/lib/types";
import { buildBrief } from "@/lib/agent/brief";
import type { Duration } from "@/lib/models";

export const dynamic = "force-dynamic";
// Claude briefs, Higgsfield submits and the 30 s join can take longer than the default limit.
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

interface Body {
  text?: string;
  imageUrl?: string | null;
  actorId?: string | null;
  duration?: Duration | null;
}

/** Adds a user message and replies with an updated brief. */
export const POST = route<Ctx>(async (req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await params(ctx);
  const body = await readJson<Body>(req);
  const text = String(body.text ?? "").trim();
  if (!text && !body.imageUrl) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const db = await getDb();
  const thread = await db.get<Thread>("threads", id);
  if (!thread || thread.user_id !== user.id) notFound("Conversation introuvable.");

  const history = await db.list<Message>("messages", { thread_id: id }, { orderBy: "created_at", ascending: true });
  const lastBrief = [...history].reverse().find((m) => m.kind === "brief");
  const previous = (lastBrief?.content as unknown as BriefContent | undefined) ?? null;

  const userMsg = await db.insert<Message>("messages", {
    thread_id: id,
    user_id: user.id,
    role: "user",
    kind: "text",
    content: { text, imageUrl: body.imageUrl ?? null },
    created_at: now(),
  });
  const brief = await buildBrief({
    text: text || "Utilise cette photo du produit.",
    imageUrl: body.imageUrl,
    previous,
    actorId: body.actorId,
    duration: body.duration,
  });
  const briefMsg = await db.insert<Message>("messages", {
    thread_id: id,
    user_id: user.id,
    role: "assistant",
    kind: "brief",
    content: brief as unknown as Record<string, unknown>,
    created_at: now(),
  });
  await db.update<Thread>("threads", id, { updated_at: now() });
  return NextResponse.json({ messages: [userMsg, briefMsg] });
});
