import "server-only";
import { getDb, isInsForgeConfigured, now } from "../db";
import type { Generation, Order } from "../types";
import { cardPriceCents, formatEur, isDuration } from "../models";
import { topupCardCents, type HistoryItem, type WalletTransaction } from "../wallet";

/**
 * Prepaid FCFA balance. On InsForge every change goes through
 * public.sz_wallet_apply (migration 20261029151536): balance and history
 * row in one transaction, never below zero, once per order and per video.
 * The local JSON store does the same without the transaction, for dev.
 */

interface WalletRow {
  id: string;
  balance: number;
  updated_at: string;
}

export interface WalletMove {
  userId: string;
  /** FCFA: positive adds, negative spends. */
  amount: number;
  kind: WalletTransaction["kind"];
  label: string;
  orderId?: string | null;
  generationId?: string | null;
}

export interface WalletResult {
  ok: boolean;
  balance: number;
  /** True when this order or video had already moved the balance. */
  duplicate?: boolean;
  reason?: "insufficient";
}

export async function getBalance(userId: string): Promise<number> {
  const db = await getDb();
  const w = await db.get<WalletRow>("wallets", userId);
  return w?.balance ?? 0;
}

export async function applyWallet(m: WalletMove): Promise<WalletResult> {
  if (isInsForgeConfigured()) {
    const { getAdminClient } = await import("../insforge/server");
    const { data, error } = await getAdminClient().database.rpc("sz_wallet_apply", {
      p_user: m.userId,
      p_amount: m.amount,
      p_kind: m.kind,
      p_label: m.label,
      p_order: m.orderId ?? null,
      p_generation: m.generationId ?? null,
    });
    if (error || !data) throw new Error(`Portefeuille indisponible : ${error?.message ?? "pas de réponse"}`);
    const r = data as { ok: boolean; balance: number | null; duplicate?: boolean; reason?: "insufficient" };
    return { ok: r.ok, balance: r.balance ?? 0, duplicate: r.duplicate, reason: r.reason };
  }
  return applyLocal(m);
}

async function applyLocal(m: WalletMove): Promise<WalletResult> {
  const db = await getDb();
  const balance = await getBalance(m.userId);
  const dup =
    (m.orderId && (await db.find<WalletTransaction>("wallet_transactions", { order_id: m.orderId }))) ||
    (m.kind === "video" && m.generationId && (await db.find<WalletTransaction>("wallet_transactions", { generation_id: m.generationId, kind: "video" })));
  if (dup) return { ok: true, balance, duplicate: true };
  const next = balance + m.amount;
  if (next < 0) return { ok: false, balance, reason: "insufficient" };
  const existing = await db.get<WalletRow>("wallets", m.userId);
  if (existing) await db.update<WalletRow>("wallets", m.userId, { balance: next, updated_at: now() });
  else await db.insert<WalletRow>("wallets", { id: m.userId, balance: next, updated_at: now() });
  await db.insert<WalletTransaction>("wallet_transactions", {
    user_id: m.userId,
    kind: m.kind,
    amount: m.amount,
    balance_after: next,
    order_id: m.orderId ?? null,
    generation_id: m.generationId ?? null,
    label: m.label,
    created_at: now(),
  });
  return { ok: true, balance: next };
}

/** Takes the price of a video from the balance. */
export async function payVideoFromWallet(g: Generation): Promise<WalletResult> {
  return applyWallet({
    userId: g.user_id,
    amount: -g.price,
    kind: "video",
    label: `Vidéo ${g.duration} s · ${g.product}`.slice(0, 120),
    generationId: g.id,
  });
}

const METHOD: Record<Order["provider"], string> = { pawapay: "Mobile Money", stripe: "Carte", mock: "Test" };

/**
 * The user's history: every balance move, plus the videos paid directly
 * by Mobile Money or card (including those still pending or that failed),
 * newest first.
 */
export async function listHistory(userId: string, limit = 100): Promise<HistoryItem[]> {
  const db = await getDb();
  const [txs, orders] = await Promise.all([
    db.list<WalletTransaction>("wallet_transactions", { user_id: userId }, { orderBy: "created_at", ascending: false, limit }),
    db.list<Order>("orders", { user_id: userId }, { orderBy: "created_at", ascending: false, limit }),
  ]);
  const settled = new Set(txs.map((t) => t.order_id).filter(Boolean));
  const ordersById = new Map(orders.map((o) => [o.id, o]));
  // Videos paid from the balance link to their conversation too.
  const genIds = [...new Set(txs.map((t) => t.generation_id).filter((id): id is string => Boolean(id)))];
  const gens = genIds.length ? await db.list<Generation>("generations", { id: genIds }, { limit: genIds.length }) : [];
  const threadOf = new Map(gens.map((g) => [g.id, g.thread_id]));

  const items: HistoryItem[] = txs.map((t) => {
    const o = t.order_id ? ordersById.get(t.order_id) : undefined;
    return {
      id: t.id,
      date: t.created_at,
      label: t.label,
      method: o ? METHOD[o.provider] : "Solde",
      amount: t.amount,
      charged: o ? chargedText(o) : null,
      status: "completed",
      balanceAfter: t.balance_after,
      threadId: o?.thread_id ?? (t.generation_id ? threadOf.get(t.generation_id) : null) ?? null,
    };
  });

  for (const o of orders) {
    // Top-ups already show as balance moves once paid; abandoned checkouts
    // older than a day are noise.
    if (settled.has(o.id)) continue;
    if (o.status === "pending" && Date.now() - Date.parse(o.created_at) > 86_400_000) continue;
    const topup = o.purpose === "topup";
    items.push({
      id: o.id,
      date: o.created_at,
      label: topup ? `Recharge de ${o.units ?? 1} vidéo${(o.units ?? 1) > 1 ? "s" : ""}` : `Vidéo ${o.duration} s`,
      method: METHOD[o.provider],
      amount: topup ? o.amount : -o.amount,
      charged: chargedText(o),
      status: o.status,
      failure: o.failure,
      balanceAfter: null,
      threadId: o.thread_id,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** What the payer actually paid, when it differs from FCFA (cards in euros). */
function chargedText(o: Order): string | null {
  if (o.provider !== "stripe" || (o.currency ?? "").toUpperCase() !== "EUR") return null;
  if (o.purpose === "topup") return formatEur(topupCardCents(o.units ?? 1));
  return isDuration(o.duration) ? formatEur(cardPriceCents(o.duration)) : null;
}
