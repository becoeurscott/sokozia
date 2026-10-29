import { NextResponse, type NextRequest } from "next/server";
import { badRequest, notFound, readJson, requireUser, route } from "@/lib/api";
import { getDb, now } from "@/lib/db";
import type { BriefContent, Generation, Message, Thread } from "@/lib/types";
import { isDuration } from "@/lib/models";
import { getActor } from "@/lib/actors";
import { createGeneration, publicGeneration } from "@/lib/services/generations";
import { createOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

/** Library: the user's generations, newest first. */
export const GET = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  const gens = await db.list<Generation>("generations", { user_id: user.id }, { orderBy: "created_at", ascending: false, limit: 100 });
  return NextResponse.json({ generations: gens.filter((g) => g.status !== "awaiting_payment").map(publicGeneration) });
});

interface Body {
  messageId?: string;
  style?: string;
  duration?: number;
  actorId?: string;
  script?: string;
  /** ISO3 country of the Mobile Money account. */
  country?: string;
}

/**
 * "Créer la vidéo": creates the generation from a brief message and opens
 * a Mobile Money checkout for it (pay-per-video).
 */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson<Body>(req);
  if (!isDuration(body.duration)) badRequest("Durée invalide : 15 ou 30 secondes.");
  const actor = getActor(body.actorId);
  if (!actor) badRequest("Créateur invalide.");
  const script = String(body.script ?? "").trim();
  if (script.length < 10) badRequest("Le script est trop court.");

  const db = await getDb();
  const msg = body.messageId ? await db.get<Message>("messages", body.messageId) : null;
  if (!msg || msg.user_id !== user.id || msg.kind !== "brief") notFound("Brief introuvable.");
  const thread = await db.get<Thread>("threads", msg.thread_id);
  if (!thread) notFound("Conversation introuvable.");
  const brief = msg.content as unknown as BriefContent;

  const generation = await createGeneration({
    userId: user.id,
    threadId: thread.id,
    briefMessage: msg,
    brief,
    style: "seedance",
    duration: body.duration,
    actorId: actor.id,
    script,
  });

  // Keep the brief in sync with what was launched and attach a video message.
  await db.update<Message>("messages", msg.id, {
    content: { ...brief, style: "seedance", duration: body.duration, actorId: actor.id, script, generationId: generation.id },
  });
  const videoMsg = await db.insert<Message>("messages", {
    thread_id: thread.id,
    user_id: user.id,
    role: "assistant",
    kind: "video",
    content: { generationId: generation.id, text: "Ta vidéo part dès que le paiement Mobile Money est confirmé." },
    created_at: now(),
  });
  await db.update<Thread>("threads", thread.id, { updated_at: now() });

  const { redirectUrl } = await createOrder({ user, generation, country: body.country });
  return NextResponse.json({ generation: publicGeneration(generation), message: videoMsg, redirectUrl });
});
