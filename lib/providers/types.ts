import type { Generation, GenerationPart, Order } from "../types";

/** One Seedance clip request. */
export interface SubmitInput {
  generation: Generation;
  /** Clip index (0-based) and total, for idempotency and mock timing. */
  part: number;
  parts: number;
  prompt: string;
  duration: number;
  actorImageUrl: string;
  productImageUrl: string | null;
  /** The creator's own voice, sent as the audio reference (null when they have none). */
  voiceUrl?: string | null;
  webhookUrl: string | null;
}

export interface SubmitResult {
  requestId: string;
  statusUrl: string | null;
}

export type ProviderStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw";

export interface CheckResult {
  status: ProviderStatus;
  videoUrl?: string | null;
  error?: string | null;
}

export interface VideoProvider {
  name: "mock" | "higgsfield";
  submit(input: SubmitInput): Promise<SubmitResult>;
  check(part: GenerationPart, generation: Generation): Promise<CheckResult>;
}

export interface CheckoutInput {
  order: Order;
  returnUrl: string;
  userEmail: string;
}

export interface CheckoutResult {
  redirectUrl: string;
  checkoutCode: string | null;
  raw?: Record<string, unknown>;
}

export type PaymentStatus = "pending" | "completed" | "failed" | "expired";

export interface PaymentCheck {
  status: PaymentStatus;
  failure?: string | null;
  raw?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: "mock" | "pawapay" | "stripe";
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  checkStatus(order: Order): Promise<PaymentCheck>;
}
