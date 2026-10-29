import { cardPriceCents, videoPrice } from "./models";

/**
 * Wallet top-ups (client and server). A top-up buys N "units", one unit
 * being the price of a 15 s video: N × 2 540 FCFA by Mobile Money, or
 * N × 3,87 € by card (the existing Stripe 15 s price with quantity N).
 * The balance is always credited in FCFA, from the units, never from the
 * euro amount.
 */
export const TOPUP_PACKS = [2, 5, 10] as const;
export type TopupUnits = (typeof TOPUP_PACKS)[number];

export function isTopupUnits(v: unknown): v is TopupUnits {
  return TOPUP_PACKS.includes(v as TopupUnits);
}

/** FCFA credited to the balance for a pack. */
export function topupFcfa(units: number): number {
  return units * videoPrice(15);
}

/** Euro cents charged by card for a pack. */
export function topupCardCents(units: number): number {
  return units * cardPriceCents(15);
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  kind: "topup" | "video" | "credit" | "refund";
  /** FCFA: positive adds to the balance, negative spends from it. */
  amount: number;
  balance_after: number;
  order_id: string | null;
  generation_id: string | null;
  label: string;
  created_at: string;
}

/** One line of the history page: a balance move or a direct payment. */
export interface HistoryItem {
  id: string;
  date: string;
  label: string;
  /** "Solde", "Mobile Money" or "Carte". */
  method: string;
  /** Signed FCFA amount for balance moves; the price for direct payments. */
  amount: number;
  /** Text shown for card payments, e.g. "3,87 €". */
  charged?: string | null;
  status: "completed" | "pending" | "failed" | "expired";
  failure?: string | null;
  balanceAfter?: number | null;
  /** Where the line points to (the conversation of the video). */
  threadId?: string | null;
}
