import "server-only";
import type { CheckResult, PaymentProvider, VideoProvider } from "./types";
import { appUrl } from "../auth";

/**
 * Fake providers so the whole product works before any key exists.
 * Generation goes queued -> in_progress -> completed in ~9 s.
 */
export const SAMPLE_VIDEO = "/samples/sample.mp4";
export const SAMPLE_POSTER = "/samples/sample.jpg";

export const mockVideo: VideoProvider = {
  name: "mock",
  async submit({ generation }) {
    return { requestId: `mock_${generation.id}`, statusUrl: null };
  },
  async check(generation): Promise<CheckResult> {
    const started = generation.started_at ? Date.parse(generation.started_at) : Date.now();
    const elapsed = (Date.now() - started) / 1000;
    if (/échec|echec|fail/i.test(generation.product)) {
      return elapsed > 4 ? { status: "failed", error: "Le modèle a refusé cette demande (test)." } : { status: "in_progress" };
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
