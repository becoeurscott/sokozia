import "server-only";
import type { CheckResult, PaymentProvider, VideoProvider } from "./types";
import { appUrl } from "../auth";

/**
 * Fake providers so the whole product works before any key exists.
 * Each clip goes queued -> in_progress -> completed in ~9 s.
 */
export const SAMPLE_VIDEO = "/samples/sample.mp4";
export const SAMPLE_POSTER = "/samples/sample.jpg";

/**
 * Orders whose first attempt already failed in this process. A product
 * containing "échec" fails once, so the free retry can be tested.
 */
// Shared across route bundles (each Next.js route has its own module copy in dev).
const g = globalThis as unknown as { __sokoziaFailedOnce?: Set<string> };
const failedOnce = (g.__sokoziaFailedOnce ??= new Set<string>());

export const mockVideo: VideoProvider = {
  name: "mock",
  async submit({ generation, part }) {
    return { requestId: `mock_${generation.id}_${part}`, statusUrl: null };
  },
  async check(_part, generation): Promise<CheckResult> {
    const started = generation.started_at ? Date.parse(generation.started_at) : Date.now();
    const elapsed = (Date.now() - started) / 1000;
    const key = generation.order_id ?? generation.id;
    const firstAttempt = !failedOnce.has(key) || failedOnce.has(`${key}:${generation.id}`);
    if (/échec|echec|fail/i.test(generation.product) && firstAttempt) {
      if (elapsed > 4) {
        failedOnce.add(key);
        failedOnce.add(`${key}:${generation.id}`);
        return { status: "failed", error: "Le modèle a refusé cette demande (test)." };
      }
      return { status: "in_progress" };
    }
    if (elapsed < 2) return { status: "queued" };
    if (elapsed < 9) return { status: "in_progress" };
    return { status: "completed", videoUrl: `${appUrl()}${SAMPLE_VIDEO}` };
  },
};

export const mockPayment: PaymentProvider = {
  name: "mock",
  async createCheckout({ order, returnUrl }) {
    const url = new URL(`${appUrl()}/paiement/simulateur`);
    url.searchParams.set("order", order.id);
    url.searchParams.set("return", returnUrl);
    return { redirectUrl: url.toString(), checkoutCode: `MOCK-${order.id.slice(0, 8).toUpperCase()}` };
  },
  async checkStatus(order) {
    // The simulator page flips the order itself; nothing to ask upstream.
    return { status: order.status };
  },
};
