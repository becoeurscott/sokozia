import { NextResponse, type NextRequest } from "next/server";
import { badRequest, notFound, params, readJson, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { Order } from "@/lib/types";
import { applyPayment } from "@/lib/services/orders";
import { isMock } from "@/lib/providers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Mock Mobile Money page: confirm or refuse a pending order. */
export const POST = route<Ctx>(async (req: NextRequest, ctx) => {
  if (!isMock()) badRequest("Le simulateur est désactivé en production.");
  const user = await requireUser();
  const { id } = await params(ctx);
  const body = await readJson<{ outcome?: "completed" | "failed" }>(req);
  const db = await getDb();
  const order = await db.get<Order>("orders", id);
  if (!order || order.user_id !== user.id) notFound("Commande introuvable.");
  const updated = await applyPayment(order, body.outcome === "failed" ? { status: "failed", failure: "Paiement refusé (simulation)." } : { status: "completed" });
  return NextResponse.json({ order: updated });
});
