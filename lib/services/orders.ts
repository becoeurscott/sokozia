import "server-only";
import { getDb, now } from "../db";
import { packPrice, PACKS, type PackKind } from "../pricing";
import { videoPrice, type Duration, type Style } from "../models";
import type { Generation, Order, User } from "../types";
import { paymentProvider } from "../providers";
import type { PaymentCheck } from "../providers/types";
import { appUrl } from "../auth";
import { grantCredits } from "./credits";
import { submitGeneration } from "./generations";

export interface NewOrderInput {
  user: User;
  kind: PackKind;
  style: Style;
  /** Only for single-video orders. */
  duration?: Duration | null;
  generationId?: string | null;
  threadId?: string | null;
}

/** Creates a pending order and the hosted checkout; returns the redirect URL. */
export async function createOrder(input: NewOrderInput): Promise<{ order: Order; redirectUrl: string }> {
  const db = await getDb();
  const amount = input.kind === "single" ? videoPrice(input.style, input.duration ?? 15) : packPrice(input.style, input.kind);
  const provider = paymentProvider();

  const order = await db.insert<Order>("orders", {
    user_id: input.user.id,
    kind: input.kind,
    style: input.style,
    duration: input.kind === "single" ? (input.duration ?? 15) : null,
    amount,
    currency: "XAF",
    country: null,
    provider: provider.name,
    checkout_code: null,
    redirect_url: null,
    status: "pending",
    generation_id: input.generationId ?? null,
    thread_id: input.threadId ?? null,
    failure: null,
    raw: null,
    created_at: now(),
    updated_at: now(),
  });

  if (input.generationId) {
    await db.update<Generation>("generations", input.generationId, { order_id: order.id, updated_at: now() });
  }

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
    check = await paymentProvider().checkStatus(order);
  } catch {
    return order;
  }
  return applyPayment(order, check);
}

/**
 * Idempotent transition. Only the first move to `completed` grants credits
 * or starts the generation.
 */
export async function applyPayment(order: Order, check: PaymentCheck): Promise<Order> {
  const db = await getDb();
  const fresh = (await db.get<Order>("orders", order.id)) ?? order;
  if (fresh.status !== "pending" || check.status === "pending") return fresh;

  if (check.status === "completed") {
    const updated = await db.update<Order>("orders", fresh.id, { status: "completed", raw: check.raw ?? fresh.raw, updated_at: now() });
    await fulfil(updated ?? fresh);
    return updated ?? fresh;
  }
  const updated = await db.update<Order>("orders", fresh.id, {
    status: check.status,
    failure: check.failure ?? null,
    raw: check.raw ?? fresh.raw,
    updated_at: now(),
  });
  return updated ?? fresh;
}

async function fulfil(order: Order) {
  const db = await getDb();
  if (order.kind === "single") {
    if (order.generation_id) {
      const g = await db.get<Generation>("generations", order.generation_id);
      if (g && g.status === "awaiting_payment") await submitGeneration(g);
    } else {
      await grantCredits({ userId: order.user_id, orderId: order.id, style: order.style, qty: 1 });
    }
    return;
  }
  const pack = PACKS[order.kind];
  await grantCredits({ userId: order.user_id, orderId: order.id, style: order.style, qty: pack.videos, validityDays: pack.validityDays });
}
