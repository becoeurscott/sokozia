import { NextResponse, type NextRequest } from "next/server";
import { badRequest, notFound, readJson, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { Generation } from "@/lib/types";
import { createOrder } from "@/lib/services/orders";
import { publicGeneration, submitGeneration } from "@/lib/services/generations";
import { payVideoFromWallet } from "@/lib/services/wallet";
import { formatFcfa } from "@/lib/models";

export const dynamic = "force-dynamic";
// Claude briefs, Higgsfield submits and the 30 s join can take longer than the default limit.
export const maxDuration = 60;

/** Pays a generation still waiting for payment: a new checkout, or the wallet. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson<{ generationId?: string; country?: string; method?: string }>(req);
  const db = await getDb();
  const g = body.generationId ? await db.get<Generation>("generations", body.generationId) : null;
  if (!g || g.user_id !== user.id) notFound("Vidéo introuvable.");
  if (g.status !== "awaiting_payment") badRequest("Cette vidéo est déjà payée.");
  if (body.method === "wallet") {
    const paid = await payVideoFromWallet(g);
    if (!paid.ok) badRequest(`Solde insuffisant : ${formatFcfa(paid.balance)} pour une vidéo à ${formatFcfa(g.price)}.`);
    const started = await submitGeneration(g);
    return NextResponse.json({ redirectUrl: null, generation: publicGeneration(started), balance: paid.balance });
  }
  const { redirectUrl } = await createOrder({ user, generation: g, country: body.country, method: body.method === "card" ? "card" : "mobile" });
  return NextResponse.json({ redirectUrl });
});
