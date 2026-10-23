import { adminClient } from "./insforge";
import { depositStatus } from "./pawapay";
import { checkoutStatus } from "./stripe";
import { consumePass } from "./passes";
import { startGeneration } from "./generation";
import { walletApply } from "./wallet";

// Idempotent : un paiement confirmé crée UN pass (pending -> completed une seule fois).
// Pour « 1 pub » lancée depuis le studio, la pub est créée automatiquement juste après.
export async function settlePayment(paymentId: string) {
  const db = adminClient().database;
  const { data: rows } = await db.from("payments").select("*").eq("id", paymentId).limit(1);
  const p = rows?.[0];
  if (!p || p.status !== "pending") return p?.status ?? "unknown";
  const session = (p.raw as { stripe_session?: string } | null)?.stripe_session;
  const d = p.method === "card"
    ? (session ? await checkoutStatus(session) : { status: "NOT_FOUND", amount: 0, currency: "", provider: "CARD", raw: null })
    : await depositStatus(paymentId);

  if (d.status === "FAILED") {
    await db.from("payments").update({ status: "failed", raw: d.raw, updated_at: new Date().toISOString() })
      .eq("id", paymentId).eq("status", "pending");
    return "failed";
  }
  // Page de paiement jamais validée (elle expire après 15 min chez pawaPay) : on clôt au bout de 30 min.
  if (d.status === "NOT_FOUND" && Date.now() - new Date(p.created_at).getTime() > 30 * 60000) {
    await db.from("payments").update({ status: "failed", raw: { expired: true }, updated_at: new Date().toISOString() })
      .eq("id", paymentId).eq("status", "pending");
    return "failed";
  }
  if (d.status !== "COMPLETED" || d.amount < p.amount || d.currency !== p.currency) return "pending";

  const { data: claimed } = await db.from("payments")
    .update({ status: "completed", correspondent: d.provider, raw: d.raw, updated_at: new Date().toISOString() })
    .eq("id", paymentId).eq("status", "pending").select("id");
  if (!claimed?.length) return "completed";

  if (p.plan === "topup") {
    await walletApply(p.user_id, Number(p.amount), "topup", p.method === "card" ? "Recharge par carte" : "Recharge Mobile Money", paymentId, p.currency);
    return "completed";
  }

  const total = p.plan === "single" ? 1 : p.plan === "pack5" ? 5 : Number(p.videos ?? 10);
  await db.from("video_passes").insert([{
    user_id: p.user_id, style_id: p.style_id, duration_s: p.duration_s, plan: p.plan, total, remaining: total,
    expires_at: p.plan === "monthly" ? new Date(Date.now() + 30 * 86400000).toISOString() : null, payment_id: paymentId,
  }]);

  if (p.plan === "single" && p.conversation_id) {
    const passId = await consumePass(p.user_id, p.style_id, p.duration_s);
    if (passId) await startGeneration({ userId: p.user_id, conversationId: p.conversation_id, styleId: p.style_id, passId }).catch(() => null);
  }
  return "completed";
}
