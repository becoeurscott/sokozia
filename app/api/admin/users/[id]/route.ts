import { NextResponse } from "next/server";
import { badRequest, params, route } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { getBalance, listHistory } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

/** Admin: one customer's balance and history. */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireAdmin();
  const { id } = await params(ctx);
  if (!/^[0-9a-f-]{36}$/i.test(id)) badRequest("Identifiant invalide.");
  const [balance, history] = await Promise.all([getBalance(id), listHistory(id, 30)]);
  return NextResponse.json({ balance, history });
});
