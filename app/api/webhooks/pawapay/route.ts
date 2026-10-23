import { NextResponse, type NextRequest } from "next/server";
import { getDb, now } from "@/lib/db";
import type { Order, WebhookEvent } from "@/lib/types";
import { applyPayment } from "@/lib/services/orders";
import { mapCheckoutStatus } from "@/lib/providers/pawapay";

export const dynamic = "force-dynamic";

/**
 * pawaPay checkout / deposit callback. The order id is our checkoutId.
 * Must answer 200 fast and be idempotent (up to 8 retries over 25 min).
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const id = String(body.checkoutId ?? body.depositId ?? "");
  const status = String(body.status ?? "");
  if (!id || !status) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const db = await getDb();
  const fresh = await db.insertUnique<WebhookEvent>(
    "webhook_events",
    { provider: "pawapay", external_id: id, status, payload: body, received_at: now() },
    ["provider", "external_id", "status"],
  );
  if (!fresh) return NextResponse.json({ ok: true, duplicate: true });

  const order = await db.get<Order>("orders", id);
  if (!order) return NextResponse.json({ ok: true, unknown: true });

  const check = mapCheckoutStatus(body as never);
  const work = applyPayment(order, check).catch((e) => console.error("[webhook:pawapay]", e));
  if (process.env.NODE_ENV !== "production") await work;
  return NextResponse.json({ ok: true });
}
