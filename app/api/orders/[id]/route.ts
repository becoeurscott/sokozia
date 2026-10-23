import { NextResponse, type NextRequest } from "next/server";
import { notFound, params, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { Generation, Order } from "@/lib/types";
import { syncOrder } from "@/lib/services/orders";
import { publicGeneration, syncGeneration } from "@/lib/services/generations";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await params(ctx);
  const db = await getDb();
  const order = await db.get<Order>("orders", id);
  if (!order || order.user_id !== user.id) notFound("Commande introuvable.");
  const synced = await syncOrder(order);
  let generation = null;
  if (synced.generation_id) {
    const g = await db.get<Generation>("generations", synced.generation_id);
    if (g) generation = publicGeneration(await syncGeneration(g));
  }
  return NextResponse.json({ order: synced, generation });
});
