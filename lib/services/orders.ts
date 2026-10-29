import "server-only";
import { getDb, now } from "../db";
import type { Generation, Order, User } from "../types";
import { paymentProvider, providerFor, type PayMethod } from "../providers";
import type { PaymentCheck } from "../providers/types";
import { appUrl } from "../auth";
import { DEFAULT_COUNTRY, isPayCountry, localAmount } from "../pricing";
import { topupFcfa } from "../wallet";
import { submitGeneration } from "./generations";
import { applyWallet } from "./wallet";

/**
 * Two kinds of orders:
 *  - "video": pays exactly one generation, at the price stored on it when
 *    the brief was launched;
 *  - "topup": adds N × the 15 s price (FCFA) to the user's wallet.
 * Both settle through syncOrder / applyPayment (return page, provider
 * callbacks and the every-minute cron).
 */
export async function createOrder(input: { user: User; generation: Generation; country?: string | null; method?: PayMethod }): Promise<{ order: Order; redirectUrl: string }> {
  const g = input.generation;
  const db = await getDb();
  const order = await openCheckout({
    user: input.user,
    method: input.method,
    country: input.country,
    row: { purpose: "video", units: null, style: g.style, duration: g.duration, amount: g.price, generation_id: g.id, thread_id: g.thread_id },
  });
  await db.update<Generation>("generations", g.id, { order_id: order.order.id, updated_at: now() });
  return order;
}

/** Opens a checkout that adds `units` × the 15 s price to the wallet. */
export async function createTopupOrder(input: { user: User; units: number; country?: string | null; method?: PayMethod }): Promise<{ order: Order; redirectUrl: string }> {
  return openCheckout({
    user: input.user,
    method: input.method,
    country: input.country,
    row: { purpose: "topup", units: input.units, style: "seedance", duration: 15, amount: topupFcfa(input.units), generation_id: null, thread_id: null },
  });
}

async function openCheckout(input: {
  user: User;
  method?: PayMethod;
  country?: string | null;
  row: Pick<Order, "purpose" | "units" | "style" | "duration" | "amount" | "generation_id" | "thread_id">;
}): Promise<{ order: Order; redirectUrl: string }> {
  const db = await getDb();
  const provider = paymentProvider(input.method);
  const country = isPayCountry(input.country) ? input.country : DEFAULT_COUNTRY;

  const order = await db.insert<Order>("orders", {
    user_id: input.user.id,
    ...input.row,
    // amount stays the FCFA price; the local amount charged is derived from it.
    currency: provider.name === "stripe" ? "EUR" : localAmount(country, input.row.amount).currency,
    country,
    provider: provider.name,
    checkout_code: null,
    redirect_url: null,
    status: "pending",
    failure: null,
    raw: null,
    created_at: now(),
    updated_at: now(),
  });

  const returnUrl = `${appUrl()}/paiement/retour?order=${order.id}`;
  const checkout = await provider.createCheckout({ order, returnUrl, userEmail: input.user.email });
  const updated = await db.update<Order>("orders", order.id, {
    checkout_code: checkout.checkoutCode,
    redirect_url: checkout.redirectUrl,
    raw: checkout.raw ?? null,
    updated_at: now(),
  });
  return { order: updated ?? order, redirectUrl: checkout.redirectUrl };
}

/** Asks the provider for the latest state and applies it. */
export async function syncOrder(order: Order): Promise<Order> {
  if (order.status !== "pending") return order;
  let check: PaymentCheck;
  try {
    check = await providerFor(order).checkStatus(order);
  } catch {
    return order;
  }
  return applyPayment(order, check);
}

/**
 * Idempotent transition. Only the first move to `completed` acts:
 *  - a top-up credits the wallet;
 *  - a video payment starts the generation, or, when that video was
 *    already paid another way (a second checkout, the wallet), credits the
 *    amount to the wallet so the money is never lost.
 * Callbacks and polling can both call this safely.
 */
export async function applyPayment(order: Order, check: PaymentCheck): Promise<Order> {
  const db = await getDb();
  const fresh = (await db.get<Order>("orders", order.id)) ?? order;
  if (fresh.status !== "pending" || check.status === "pending") return fresh;

  if (check.status === "completed") {
    const updated = (await db.update<Order>("orders", fresh.id, { status: "completed", raw: check.raw ?? fresh.raw, updated_at: now() })) ?? fresh;
    await settleCompleted(updated);
    return updated;
  }
  return (
    (await db.update<Order>("orders", fresh.id, {
      status: check.status,
      failure: check.failure ?? null,
      raw: check.raw ?? fresh.raw,
      updated_at: now(),
    })) ?? fresh
  );
}

async function settleCompleted(order: Order): Promise<void> {
  const db = await getDb();
  if (order.purpose === "topup") {
    const units = order.units ?? 1;
    await applyWallet({
      userId: order.user_id,
      amount: order.amount,
      kind: "topup",
      label: `Recharge de ${units} vidéo${units > 1 ? "s" : ""}`,
      orderId: order.id,
    });
    return;
  }
  if (!order.generation_id) return;
  const g = await db.get<Generation>("generations", order.generation_id);
  if (g && g.status === "awaiting_payment") {
    // This order is the one that paid the video, even if another checkout was opened later.
    if (g.order_id !== order.id) await db.update<Generation>("generations", g.id, { order_id: order.id, updated_at: now() });
    await submitGeneration({ ...g, order_id: order.id });
    return;
  }
  if (g) {
    await applyWallet({
      userId: order.user_id,
      amount: order.amount,
      kind: "credit",
      label: `Paiement en double pour la vidéo ${g.duration} s, ajouté à ton solde`,
      orderId: order.id,
      generationId: g.id,
    });
  }
}
