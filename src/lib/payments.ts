import { adminClient } from "./insforge";
import { depositStatus } from "./pawapay";
import { consumePass } from "./passes";
import { startGeneration } from "./generation";

// Idempotent : un paiement confirmé crée UN pass (pending -> completed une seule fois).
// Pour « 1 pub » lancée depuis le studio, la pub est créée automatiquement juste après.
export async function settlePayment(paymentId: string) {
  const db = adminClient().database;
  const { data: rows } = await db.from("payments").select("*").eq("id", paymentId).limit(1);
  const p = rows?.[0];
  if (!p || p.status !== "pending") return p?.status ?? "unknown";
  const d = await depositStatus(paymentId);

  if (d.status === "FAILED") {
    await db.from("payments").update({ status: "failed", raw: d.raw, updated_at: new Date().toISOString() })
      .eq("id", paymentId).eq("status", "pending");
    return "failed";
  }
  if (d.status !== "COMPLETED" || d.amount < p.amount || d.currency !== p.currency) return "pending";

  const { data: claimed } = await db.from("payments")
    .update({ status: "completed", correspondent: d.provider, raw: d.raw, updated_at: new Date().toISOString() })
    .eq("id", paymentId).eq("status", "pending").select("id");
  if (!claimed?.length) return "completed";

  const total = p.plan === "single" ? 1 : p.plan === "pack5" ? 5 : Number(p.videos ?? 10);
  await db.from("video_passes").insert([{
    user_id: p.user_id, style_id: p.style_id, duration_s: p.duration_s, plan: p.plan, total, remaining: total,
    expires_at: p.plan === "monthly" ? new Date(Date.now() + 30 * 86400000).toISOString() : null, payment_id: paymentId,
  }]);

  if (p.plan === "single" && p.conversation_id) {
    const passId = await consumePass(p.user_id, p.style_id, p.duration_s);
    if (passId) await startGeneration({
      userId: p.user_id, conversationId: p.conversation_id, styleId: p.style_id, duration: p.duration_s, imageUrl: p.image_url, passId,
    }).catch(() => null);
  }
  return "completed";
}
