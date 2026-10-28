import { NextResponse, type NextRequest } from "next/server";
import { badRequest, notFound, params, requireUser, route } from "@/lib/api";
import { getDb, now } from "@/lib/db";
import type { Generation, Message, Order } from "@/lib/types";
import { publicGeneration, retryFailedGeneration } from "@/lib/services/generations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A paid video failed: try again for free on the same order. Only the
 * latest attempt of a paid order can be retried.
 */
export const POST = route<Ctx>(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await params(ctx);
  const db = await getDb();
  const g = await db.get<Generation>("generations", id);
  if (!g || g.user_id !== user.id) notFound("Vidéo introuvable.");
  if (g.status !== "failed" && g.status !== "nsfw") badRequest("Seule une vidéo en échec peut être relancée.");
  const order = g.order_id ? await db.get<Order>("orders", g.order_id) : null;
  if (!order || order.status !== "completed") badRequest("Cette vidéo n'a pas été payée.");
  if (order.generation_id !== g.id) badRequest("Cette vidéo a déjà été relancée.");

  const retry = await retryFailedGeneration(g);
  const message = await db.insert<Message>("messages", {
    thread_id: g.thread_id,
    user_id: user.id,
    role: "assistant",
    kind: "video",
    content: { generationId: retry.id, text: "Je relance ta vidéo, sans frais." },
    created_at: now(),
  });
  return NextResponse.json({ generation: publicGeneration(retry), message });
});
