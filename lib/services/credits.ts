import "server-only";
import { getDb, now } from "../db";
import { STYLE_RANK, type Style } from "../models";
import type { Credit } from "../types";

/** Active (non-expired, remaining > 0) credits for a user. */
export async function activeCredits(userId: string): Promise<Credit[]> {
  const db = await getDb();
  const all = await db.list<Credit>("credits", { user_id: userId }, { orderBy: "created_at", ascending: true });
  const t = Date.now();
  return all.filter((c) => c.remaining > 0 && (!c.expires_at || Date.parse(c.expires_at) > t));
}

/**
 * Finds a credit that can pay for `style`: same style first, otherwise the
 * cheapest higher tier. Returns null when the user must pay.
 */
export async function findUsableCredit(userId: string, style: Style): Promise<Credit | null> {
  const credits = await activeCredits(userId);
  const same = credits.find((c) => c.style === style);
  if (same) return same;
  const higher = credits
    .filter((c) => STYLE_RANK[c.style] > STYLE_RANK[style])
    .sort((a, b) => STYLE_RANK[a.style] - STYLE_RANK[b.style]);
  return higher[0] ?? null;
}

export async function consumeCredit(credit: Credit): Promise<Credit | null> {
  const db = await getDb();
  if (credit.remaining <= 0) return null;
  return db.update<Credit>("credits", credit.id, { remaining: credit.remaining - 1 });
}

export async function refundCredit(creditId: string): Promise<void> {
  const db = await getDb();
  const c = await db.get<Credit>("credits", creditId);
  if (c) await db.update<Credit>("credits", c.id, { remaining: Math.min(c.total, c.remaining + 1) });
}

export async function grantCredits(input: { userId: string; orderId: string; style: Style; qty: number; validityDays?: number }): Promise<Credit> {
  const db = await getDb();
  const expires = input.validityDays ? new Date(Date.now() + input.validityDays * 86400000).toISOString() : null;
  return db.insert<Credit>("credits", {
    user_id: input.userId,
    order_id: input.orderId,
    style: input.style,
    total: input.qty,
    remaining: input.qty,
    expires_at: expires,
    created_at: now(),
  });
}
