import { NextResponse, type NextRequest } from "next/server";
import { badRequest, readJson, requireUser, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import { isStyle } from "@/lib/models";
import { PACKS, type PackKind } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import { createOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  const orders = await db.list<Order>("orders", { user_id: user.id }, { orderBy: "created_at", ascending: false, limit: 50 });
  return NextResponse.json({ orders });
});

/** Buys a pack (pack5 / monthly) or a single credit. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await readJson<{ kind?: string; style?: string }>(req);
  const kind = body.kind as PackKind;
  if (!(kind in PACKS)) badRequest("Formule invalide.");
  if (!isStyle(body.style)) badRequest("Style invalide.");
  const { order, redirectUrl } = await createOrder({ user, kind, style: body.style, duration: 15 });
  return NextResponse.json({ order, redirectUrl });
});
