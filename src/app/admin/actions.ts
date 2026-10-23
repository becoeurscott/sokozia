"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/insforge";
import { AdminError, audit, DEFAULT_BUDGET, getBudgetSettings, requireAdmin, type BudgetSettings } from "@/lib/admin";
import { settlePayment } from "@/lib/payments";

export type ActionResult = { ok: boolean; error?: string; message?: string };
const db = () => adminClient().database;
const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" });
const done = (message?: string): ActionResult => { revalidatePath("/admin", "layout"); return { ok: true, message }; };

/** Offre des pubs à un client (style + durée), avec une raison. */
export async function giftAds(userId: string, styleId: string, duration: number, count: number, reason: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const n = Math.trunc(Number(count));
    if (n < 1 || n > 50) throw new AdminError("Nombre de pubs invalide (1 à 50).", "INVALID");
    const why = reason.trim().slice(0, 200);
    if (why.length < 3) throw new AdminError("Indique une raison (3 caractères minimum).", "INVALID");
    const { data: st } = await db().from("styles").select("durations").eq("id", styleId).limit(1);
    if (!((st?.[0]?.durations as number[]) ?? []).map(Number).includes(Number(duration))) throw new AdminError("Ce style ne propose pas cette durée.", "INVALID");
    const { error } = await db().from("video_passes").insert([{ user_id: userId, style_id: styleId, duration_s: duration, plan: "gift", total: n, remaining: n }]);
    if (error) throw new AdminError(error.message);
    await audit(admin, { action: "ads.gift", targetType: "user", targetId: userId, after: { style: styleId, duration, count: n }, reason: why });
    return done(`${n} pub(s) ${styleId} ${duration} s offerte(s).`);
  } catch (e) { return fail(e); }
}

export async function setAdmin(userId: string, isAdmin: boolean): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (userId === admin.id && !isAdmin) throw new AdminError("Tu ne peux pas retirer tes propres droits admin.", "INVALID");
    const { error } = await db().from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
    if (error) throw new AdminError(error.message);
    await audit(admin, { action: "user.admin", targetType: "user", targetId: userId, before: { is_admin: !isAdmin }, after: { is_admin: isAdmin } });
    return done();
  } catch (e) { return fail(e); }
}

/** Rend une pub au client (mauvais résultat) : une pub du même style et de la même durée est recréditée. */
export async function refundVideo(videoId: string, reason: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const { data } = await db().from("videos").select("id, created_by, style_id, duration_s, refunded, status").eq("id", videoId).limit(1);
    const v = data?.[0] as { id: string; created_by: string; style_id: string; duration_s: number; refunded: boolean; status: string } | undefined;
    if (!v) throw new AdminError("Pub introuvable.", "NOT_FOUND");
    const why = reason.trim().slice(0, 160) || "Remboursement administrateur";
    const { data: claimed } = await db().from("videos").update({ refunded: true }).eq("id", videoId).eq("refunded", false).select("id");
    if (!claimed?.length) throw new AdminError("Cette pub a déjà été remboursée.", "INVALID");
    await db().from("video_passes").insert([{ user_id: v.created_by, style_id: v.style_id, duration_s: v.duration_s, plan: "refund", total: 1, remaining: 1 }]);
    await audit(admin, { action: "video.refund", targetType: "video", targetId: videoId, before: { refunded: false }, after: { refunded: true, style: v.style_id, duration: v.duration_s }, reason: why });
    return done("Pub rendue au client.");
  } catch (e) { return fail(e); }
}

/** Redemande le statut d'un paiement à pawaPay (et active l'achat s'il a abouti). */
export async function recheckPayment(paymentId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const { data } = await db().from("payments").select("status").eq("id", paymentId).limit(1);
    const before = data?.[0]?.status;
    if (!before) throw new AdminError("Paiement introuvable.", "NOT_FOUND");
    const after = await settlePayment(paymentId);
    await audit(admin, { action: "payment.recheck", targetType: "payment", targetId: paymentId, before: { status: before }, after: { status: after } });
    return done(after === before ? `Statut inchangé : ${after}.` : `Statut : ${before} → ${after}.`);
  } catch (e) { return fail(e); }
}

export async function saveBudget(patch: Partial<BudgetSettings>): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const cur = await getBudgetSettings();
    const next: BudgetSettings = { ...DEFAULT_BUDGET, ...cur };
    for (const k of Object.keys(DEFAULT_BUDGET) as (keyof BudgetSettings)[]) {
      if (!(k in patch)) continue;
      const v = patch[k];
      if (k === "hfBudgetSince") {
        if (typeof v !== "string" || Number.isNaN(Date.parse(v))) throw new AdminError("Date invalide.", "INVALID");
        next.hfBudgetSince = v.slice(0, 10);
      } else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) throw new AdminError("Les montants doivent être positifs.", "INVALID");
        (next as Record<string, unknown>)[k] = n;
      }
    }
    const { error } = await db().from("settings").update({ value: next }).eq("key", "admin_budget");
    if (error) throw new AdminError(error.message);
    await audit(admin, { action: "budget.update", targetType: "config", targetId: "admin_budget", before: cur, after: next });
    return done("Réglages enregistrés.");
  } catch (e) { return fail(e); }
}

/** Style : fournisseur, modèle, coût réel par seconde, durées, actif. */
export async function saveStyle(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const { data: before } = await db().from("styles").select("*").eq("id", id).limit(1);
  const patch = {
    name_fr: String(form.get("name_fr")),
    description_fr: String(form.get("description_fr")),
    quality_fr: String(form.get("quality_fr") ?? ""),
    provider: form.get("provider") === "apiframe" ? "apiframe" : "higgsfield",
    hf_endpoint: String(form.get("hf_endpoint") || "") || null,
    hf_params: JSON.parse(String(form.get("hf_params") || "{}")),
    cost_usd_per_s: Number(form.get("cost_usd_per_s")),
    durations: JSON.parse(String(form.get("durations") || "[15]")),
    active: form.get("active") === "on",
  };
  await db().from("styles").update(patch).eq("id", id);
  await audit(admin, { action: "style.update", targetType: "style", targetId: id, before: before?.[0] ?? null, after: patch });
  revalidatePath("/", "layout");
}

/** Multiplicateurs, pubs par abonnement, taux de change. */
export async function savePricing(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  for (const key of ["multipliers", "monthly_videos", "fx"]) {
    const value = JSON.parse(String(form.get(key)));
    const { data: before } = await db().from("settings").select("value").eq("key", key).limit(1);
    await db().from("settings").update({ value }).eq("key", key);
    if (JSON.stringify(before?.[0]?.value) !== JSON.stringify(value)) await audit(admin, { action: "pricing.update", targetType: "config", targetId: key, before: before?.[0]?.value, after: value });
  }
  revalidatePath("/", "layout");
}

const authApi = (path: string, init: RequestInit) => fetch(`${process.env.NEXT_PUBLIC_INSFORGE_URL}${path}`, {
  ...init, headers: { Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`, "Content-Type": "application/json" }, cache: "no-store",
});

/** Crée un compte client depuis l'admin (e-mail marqué vérifié, il peut se connecter tout de suite). */
export async function createUser(input: { email: string; password: string; name: string; phone: string; country: string }): Promise<ActionResult & { id?: string }> {
  try {
    const admin = await requireAdmin();
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AdminError("E-mail invalide.", "INVALID");
    if (input.password.length < 6) throw new AdminError("Mot de passe : 6 caractères minimum.", "INVALID");
    const r = await authApi("/api/auth/users", { method: "POST", body: JSON.stringify({ email, password: input.password, name: input.name.trim() }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new AdminError(body?.message ?? "Création impossible (e-mail déjà utilisé ?).");
    const list = await (await authApi(`/api/auth/users?search=${encodeURIComponent(email)}&limit=5`, { method: "GET" })).json();
    const id = (list?.data as { id: string; email: string }[] | undefined)?.find((u) => u.email === email)?.id;
    if (!id) throw new AdminError("Compte créé mais introuvable.");
    await db().rpc("admin_verify_user", { uid: id });
    const { error } = await db().from("profiles").upsert([{ id, full_name: input.name.trim(), phone: input.phone.trim() || null, country: input.country || "CI", accepted_terms_at: new Date().toISOString() }]);
    if (error) throw new AdminError(error.message);
    await audit(admin, { action: "user.create", targetType: "user", targetId: id, after: { email, name: input.name, country: input.country } });
    return { ...done("Compte créé."), id };
  } catch (e) { return fail(e); }
}

/** Modifie le nom, le téléphone et le pays d'un client. */
export async function updateUser(userId: string, input: { name: string; phone: string; country: string }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const { data: before } = await db().from("profiles").select("full_name, phone, country").eq("id", userId).limit(1);
    const after = { full_name: input.name.trim(), phone: input.phone.trim() || null, country: input.country };
    const { error } = await db().from("profiles").update(after).eq("id", userId);
    if (error) throw new AdminError(error.message);
    await audit(admin, { action: "user.update", targetType: "user", targetId: userId, before: before?.[0], after });
    return done("Profil mis à jour.");
  } catch (e) { return fail(e); }
}

/** Supprime un compte (ses projets et pubs restantes partent avec ; les vidéos restent à Sokozia). */
export async function deleteUser(userId: string, reason: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (userId === admin.id) throw new AdminError("Tu ne peux pas supprimer ton propre compte.", "INVALID");
    if (reason.trim().length < 3) throw new AdminError("Indique une raison.", "INVALID");
    const { data: before } = await db().from("profiles").select("full_name, phone, country").eq("id", userId).limit(1);
    const r = await authApi("/api/auth/users", { method: "DELETE", body: JSON.stringify({ userIds: [userId] }) });
    if (!r.ok) throw new AdminError("Suppression impossible.");
    await audit(admin, { action: "user.delete", targetType: "user", targetId: userId, before: before?.[0], reason: reason.trim().slice(0, 200) });
    return done("Compte supprimé.");
  } catch (e) { return fail(e); }
}

/** Ajoute (ou retire, montant négatif) du solde au portefeuille d'un client, avec une raison. */
export async function adjustWallet(userId: string, amount: number, reason: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const n = Math.trunc(Number(amount));
    if (!n || Math.abs(n) > 1000000) throw new AdminError("Montant invalide.", "INVALID");
    const why = reason.trim().slice(0, 200);
    if (why.length < 3) throw new AdminError("Indique une raison (3 caractères minimum).", "INVALID");
    const { data: prof } = await db().from("profiles").select("country").eq("id", userId).limit(1);
    const { currencyOf } = await import("@/lib/pricing");
    const { walletApply } = await import("@/lib/wallet");
    const left = await walletApply(userId, n, n > 0 ? "gift" : "adjust", n > 0 ? `Offert par Sokozia · ${why}` : `Ajustement · ${why}`, null, currencyOf(prof?.[0]?.country ?? "CI"));
    if (left === null) throw new AdminError("Le solde ne peut pas devenir négatif.", "INVALID");
    await audit(admin, { action: "wallet.adjust", targetType: "user", targetId: userId, after: { amount: n, balance: left }, reason: why });
    return done(`Solde mis à jour : ${left.toLocaleString("fr-FR")}.`);
  } catch (e) { return fail(e); }
}
