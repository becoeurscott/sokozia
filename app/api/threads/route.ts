import { NextResponse, type NextRequest } from "next/server";
import { readJson, requireUser, route } from "@/lib/api";
import { getDb, now } from "@/lib/db";
import type { Message, Thread } from "@/lib/types";
import { buildBrief } from "@/lib/agent/brief";
import type { Duration } from "@/lib/models";

export const dynamic = "force-dynamic";
// Claude briefs, Higgsfield submits and the 30 s join can take longer than the default limit.
export const maxDuration = 60;

export const GET = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  const threads = await db.list<Thread>("threads", { user_id: user.id }, { orderBy: "updated_at", ascending: false, limit: 50 });
  return NextResponse.json({ threads });
});

interface NewThreadBody {
  text?: string;
  imageUrl?: string | null;
  actorId?: string | null;
  duration?: Duration | null;
}

/** Creates a thread from the first prompt and answers with Awa's brief. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson<NewThreadBody>(req);
  const text = String(body.text ?? "").trim();
  if (!text && !body.imageUrl) return NextResponse.json({ error: "Décris ton produit pour commencer." }, { status: 400 });

  const db = await getDb();
  const ts = now();
  const thread = await db.insert<Thread>("threads", {
    user_id: user.id,
    title: (text || "Nouvelle pub").slice(0, 60),
    created_at: ts,
    updated_at: ts,
  });
  const userMsg = await db.insert<Message>("messages", {
    thread_id: thread.id,
    user_id: user.id,
    role: "user",
    kind: "text",
    content: { text, imageUrl: body.imageUrl ?? null },
    created_at: ts,
  });
  const brief = await buildBrief({ text, imageUrl: body.imageUrl, actorId: body.actorId, duration: body.duration });
  const briefMsg = await db.insert<Message>("messages", {
    thread_id: thread.id,
    user_id: user.id,
    role: "assistant",
    kind: "brief",
    content: brief as unknown as Record<string, unknown>,
    created_at: now(),
  });
  await db.update<Thread>("threads", thread.id, { title: brief.product.slice(0, 60), updated_at: now() });
  return NextResponse.json({ thread: { ...thread, title: brief.product }, messages: [userMsg, briefMsg] });
});
