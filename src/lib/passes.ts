import { adminClient } from "./insforge";

export type Pass = { id: string; style_id: string; duration_s: number; plan: string; total: number; remaining: number; expires_at: string | null };

export async function consumePass(userId: string, styleId: string, duration: number) {
  const { data, error } = await adminClient().database.rpc("consume_pass", { p_user: userId, p_style: styleId, p_duration: duration });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function refundPass(passId: string) {
  await adminClient().database.rpc("refund_pass", { p_pass: passId });
}

export async function activePasses(userId: string) {
  const { data } = await adminClient().database.from("video_passes")
    .select("id, style_id, duration_s, plan, total, remaining, expires_at")
    .eq("user_id", userId).gt("remaining", 0).order("created_at", { ascending: false }).limit(50);
  const now = Date.now();
  return ((data ?? []) as Pass[]).filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now);
}
