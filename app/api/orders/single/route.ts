import { NextResponse, type NextRequest } from "next/server";
import { badRequest, notFound, readJson, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { Generation } from "@/lib/types";
import { createOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

/** (Re)creates the checkout for a generation still waiting for payment. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson<{ generationId?: string; country?: string }>(req);
  const db = await getDb();
  const g = body.generationId ? await db.get<Generation>("generations", body.generationId) : null;
  if (!g || g.user_id !== user.id) notFound("Vidéo introuvable.");
  if (g.status !== "awaiting_payment") badRequest("Cette vidéo est déjà payée.");
  const { redirectUrl } = await createOrder({ user, generation: g, country: body.country });
  return NextResponse.json({ redirectUrl });
});
