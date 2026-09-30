import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/payments";

// Callback pawaPay : on ne lit que l'ID et on revérifie le statut via l'API.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.depositId ?? body.data?.depositId ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await settlePayment(id);
  return NextResponse.json({ ok: true });
}
