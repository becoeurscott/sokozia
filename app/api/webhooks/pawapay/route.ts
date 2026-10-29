import { NextResponse, after, type NextRequest } from "next/server";
import { getDb, now } from "@/lib/db";
import type { Order, WebhookEvent } from "@/lib/types";
import { syncOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

/**
 * pawaPay deposit callback. Only the depositId (= our order id) is read;
 * the status is always fetched again from pawaPay, so a forged callback
 * can't mark an order paid. Answers 200 fast and is idempotent (pawaPay
 * retries up to 8 times over 25 min).
 *
 * The pawaPay dashboard points at /api/pay/callback (the earlier app's
 * path), which re-exports this handler.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { depositId?: string; status?: string; data?: { depositId?: string; status?: string } };
  const id = String(body.depositId ?? body.data?.depositId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: true, ignored: true });

  const db = await getDb();
  const order = await db.get<Order>("orders", id);
  // Not ours: the earlier app's payments share the same pawaPay account.
  if (!order) return NextResponse.json({ ok: true, unknown: true });

  await db.insertUnique<WebhookEvent>(
    "webhook_events",
    { provider: "pawapay", external_id: id, status: String(body.status ?? body.data?.status ?? "callback"), payload: body as Record<string, unknown>, received_at: now() },
    ["provider", "external_id", "status"],
  );
  // after() keeps the serverless function alive until the check finishes.
  after(() => syncOrder(order).catch((e) => console.error("[webhook:pawapay]", e)));
  return NextResponse.json({ ok: true });
}
