import { NextResponse } from "next/server";
import { requireUser, route } from "@/lib/api";
import { getBalance, listHistory } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

/** The user's balance (FCFA) and transaction history, newest first. */
export const GET = route(async () => {
  const user = await requireUser();
  const [balance, history] = await Promise.all([getBalance(user.id), listHistory(user.id)]);
  return NextResponse.json({ balance, history });
});
