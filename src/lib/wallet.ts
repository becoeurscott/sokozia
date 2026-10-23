import { adminClient } from "./insforge";

export type WalletTx = { id: string; amount: number; kind: string; label: string | null; created_at: string };

export async function getWallet(userId: string) {
  const { data } = await adminClient().database.from("wallets").select("balance, currency").eq("user_id", userId).limit(1);
  return { balance: Number(data?.[0]?.balance ?? 0), currency: (data?.[0]?.currency as string | undefined) ?? null };
}

/** Mouvement atomique. Retourne le nouveau solde, ou null si le solde serait négatif. */
export async function walletApply(userId: string, delta: number, kind: string, label: string, ref: string | null, currency: string) {
  const { data, error } = await adminClient().database.rpc("wallet_apply", {
    uid: userId, delta: Math.trunc(delta), tx_kind: kind, tx_ref: ref, tx_label: label, cur: currency,
  });
  if (error) throw new Error(error.message);
  return data === null || data === undefined ? null : Number(data);
}

export async function walletHistory(userId: string, limit = 30) {
  const { data } = await adminClient().database.from("wallet_tx").select("id, amount, kind, label, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as WalletTx[];
}
