import { NextResponse, after, type NextRequest } from "next/server";
import { getDb, now } from "@/lib/db";
import type { Generation, WebhookEvent } from "@/lib/types";
import { applyResult } from "@/lib/services/generations";
import { mapStatus } from "@/lib/providers/higgsfield";

export const dynamic = "force-dynamic";

interface HfWebhook {
  request_id?: string;
  status?: string;
  error?: unknown;
  payload?: { video?: { url?: string } | null } | null;
}

/**
 * Higgsfield delivery: { request_id, status, error, payload }.
 * Always 2xx once recorded; duplicates are ignored via webhook_events.
 */
export async function POST(req: NextRequest) {
  let body: HfWebhook;
  try {
    body = (await req.json()) as HfWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.request_id || !body.status) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const db = await getDb();
  const fresh = await db.insertUnique<WebhookEvent>(
    "webhook_events",
    { provider: "higgsfield", external_id: body.request_id, status: body.status, payload: body as Record<string, unknown>, received_at: now() },
    ["provider", "external_id", "status"],
  );
  if (!fresh) return NextResponse.json({ ok: true, duplicate: true });

  // `g` is set on the webhook URL at submit time: a 30 s ad has two clips,
  // and only the first clip's id is stored in provider_request_id.
  const gid = req.nextUrl.searchParams.get("g");
  const generation = gid
    ? await db.get<Generation>("generations", gid)
    : await db.find<Generation>("generations", { provider_request_id: body.request_id });
  if (!generation) return NextResponse.json({ ok: true, unknown: true });

  // Finish the copy to storage (and the 30 s join) after responding, so
  // Higgsfield gets a fast 2xx; after() keeps the function alive meanwhile.
  const result = mapStatus(body.status, body.payload?.video?.url ?? null, body.error);
  after(() => applyResult(generation, result, body.request_id).catch((e) => console.error("[webhook:higgsfield]", e)));
  return NextResponse.json({ ok: true });
}
