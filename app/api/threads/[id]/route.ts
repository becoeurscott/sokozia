import { NextResponse, type NextRequest } from "next/server";
import { notFound, params, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { Generation, Message, Thread } from "@/lib/types";
import { publicGeneration, syncGeneration } from "@/lib/services/generations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await params(ctx);
  const db = await getDb();
  const thread = await db.get<Thread>("threads", id);
  if (!thread || thread.user_id !== user.id) notFound("Conversation introuvable.");
  const messages = await db.list<Message>("messages", { thread_id: id }, { orderBy: "created_at", ascending: true });
  const gens = await db.list<Generation>("generations", { thread_id: id }, { orderBy: "created_at", ascending: true });
  const generations = await Promise.all(gens.map((g) => syncGeneration(g)));
  return NextResponse.json({ thread, messages, generations: generations.map(publicGeneration) });
});

export const DELETE = route<Ctx>(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await params(ctx);
  const db = await getDb();
  const thread = await db.get<Thread>("threads", id);
  if (!thread || thread.user_id !== user.id) notFound("Conversation introuvable.");
  await db.remove("threads", id);
  return NextResponse.json({ ok: true });
});
