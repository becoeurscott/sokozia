import "server-only";
import { adminClient, getSession } from "./insforge";
import { loadPricing } from "./pricing";

/**
 * Données du back-office (serveur uniquement). Accès réservé aux comptes is_admin.
 * Chaque modification est tracée dans admin_audit.
 */

export class AdminError extends Error {
  constructor(message: string, public code: "FORBIDDEN" | "NOT_FOUND" | "INVALID" | "FAILED" = "FAILED") {
    super(message);
  }
}

export type AdminUserSession = { id: string; email: string; name: string };

export async function currentAdmin(): Promise<AdminUserSession | null> {
  const { user, profile } = await getSession();
  if (!user || !profile?.is_admin) return null;
  return { id: user.id, email: (user as { email?: string }).email ?? "", name: profile.full_name };
}

export async function requireAdmin() {
  const a = await currentAdmin();
  if (!a) throw new AdminError("Accès réservé aux administrateurs.", "FORBIDDEN");
  return a;
}

const db = () => adminClient().database;
const num = (v: unknown) => Number(v ?? 0);
const DAY = 86400000;

/* ---------- Réglages du budget Higgsfield ---------- */

export type BudgetSettings = { hfBudgetUsd: number; hfBudgetSince: string; hfOtherSpendUsd: number; hfAlertUsd: number; imageCostUsd: number; usdToXof: number };
export const DEFAULT_BUDGET: BudgetSettings = { hfBudgetUsd: 0, hfBudgetSince: "2026-10-06", hfOtherSpendUsd: 0, hfAlertUsd: 10, imageCostUsd: 0.12, usdToXof: 600 };

export async function getBudgetSettings(): Promise<BudgetSettings> {
  const { data } = await db().from("settings").select("value").eq("key", "admin_budget").limit(1);
  return { ...DEFAULT_BUDGET, ...((data?.[0]?.value as Partial<BudgetSettings>) ?? {}) };
}

/* ---------- Données brutes ---------- */

type Account = { id: string; email: string; email_verified: boolean; created_at: string };
type ProfileRow = { id: string; full_name: string; country: string; phone: string | null; is_admin: boolean };
export type VideoRow = { id: string; created_by: string; style_id: string; duration_s: number; status: string; video_url: string | null; refunded: boolean; created_at: string; conversation_id: string | null; error: string | null; pass_id: string | null };
export type PaymentRow = { id: string; user_id: string; plan: string; style_id: string | null; duration_s: number; videos: number | null; amount: number; currency: string; status: string; correspondent: string | null; phone: string | null; created_at: string; raw: unknown };

async function accounts(): Promise<Account[]> {
  const { data, error } = await db().rpc("admin_accounts", {});
  if (error) throw new AdminError(error.message);
  return (data ?? []) as Account[];
}

async function profiles(): Promise<Map<string, ProfileRow>> {
  const { data } = await db().from("profiles").select("id, full_name, country, phone, is_admin").limit(10000);
  return new Map(((data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
}

async function stylesCost() {
  const { data } = await db().from("styles").select("id, name_fr, cost_usd_per_s");
  return new Map(((data ?? []) as { id: string; name_fr: string; cost_usd_per_s: number }[]).map((s) => [s.id, { name: s.name_fr, cps: num(s.cost_usd_per_s) }]));
}

/** Coût Higgsfield estimé d'une pub (vidéo seulement ; les images sont comptées à part). */
export const videoCostUsd = (v: { style_id: string; duration_s: number }, costs: Map<string, { cps: number }>) => (costs.get(v.style_id)?.cps ?? 0) * (v.duration_s ?? 0);

/* ---------- Vue d'ensemble ---------- */

export type DailyPoint = { day: string; revenue: number; videos: number; failed: number; users: number };

export async function getOverview(days: number) {
  await requireAdmin();
  const now = Date.now();
  const from = new Date(now - days * DAY), prevFrom = new Date(now - 2 * days * DAY);
  const [accs, profs, costs, budget, { data: vids }, { data: pays }, { data: imgs }, { data: convs }] = await Promise.all([
    accounts(), profiles(), stylesCost(), getBudgetSettings(),
    db().from("videos").select("id, created_by, style_id, duration_s, status, video_url, refunded, created_at, conversation_id, error, pass_id").gte("created_at", prevFrom.toISOString()).limit(10000),
    db().from("payments").select("id, user_id, plan, style_id, duration_s, videos, amount, currency, status, correspondent, phone, created_at").gte("created_at", prevFrom.toISOString()).limit(10000),
    db().from("project_images").select("status, created_at").gte("created_at", prevFrom.toISOString()).limit(20000),
    db().from("conversations").select("user_id, created_at").gte("created_at", prevFrom.toISOString()).limit(20000),
  ]);
  const V = (vids ?? []) as VideoRow[], P = (pays ?? []) as PaymentRow[];
  const inCur = (iso: string) => new Date(iso) >= from, inPrev = (iso: string) => new Date(iso) >= prevFrom && new Date(iso) < from;
  const paid = (p: PaymentRow) => p.status === "completed";
  const revenue = (list: PaymentRow[]) => list.filter(paid).reduce((s, p) => s + p.amount, 0);
  const curV = V.filter((v) => inCur(v.created_at)), curP = P.filter((p) => inCur(p.created_at));
  const readyV = curV.filter((v) => v.status === "ready");
  const imgCount = ((imgs ?? []) as { status: string; created_at: string }[]).filter((i) => inCur(i.created_at) && i.status !== "failed").length;
  const spendCur = readyV.reduce((s, v) => s + videoCostUsd(v, costs), 0) + imgCount * budget.imageCostUsd;
  const prevReady = V.filter((v) => inPrev(v.created_at) && v.status === "ready");
  const spendPrev = prevReady.reduce((s, v) => s + videoCostUsd(v, costs), 0);
  const active = new Set(((convs ?? []) as { user_id: string; created_at: string }[]).filter((c) => inCur(c.created_at)).map((c) => c.user_id));
  const activePrev = new Set(((convs ?? []) as { user_id: string; created_at: string }[]).filter((c) => inPrev(c.created_at)).map((c) => c.user_id));

  // Série jour par jour.
  const daily: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d0 = new Date(new Date(now - i * DAY).toDateString()), d1 = new Date(d0.getTime() + DAY);
    const inDay = (iso: string) => { const t = new Date(iso); return t >= d0 && t < d1; };
    daily.push({
      day: d0.toISOString(),
      revenue: P.filter((p) => paid(p) && inDay(p.created_at)).reduce((s, p) => s + p.amount, 0),
      videos: V.filter((v) => v.status === "ready" && inDay(v.created_at)).length,
      failed: V.filter((v) => v.status === "failed" && inDay(v.created_at)).length,
      users: accs.filter((a) => inDay(a.created_at)).length,
    });
  }

  const byStyle = new Map<string, { videos: number; usd: number }>();
  for (const v of readyV) { const e = byStyle.get(v.style_id) ?? { videos: 0, usd: 0 }; e.videos++; e.usd += videoCostUsd(v, costs); byStyle.set(v.style_id, e); }
  const byOperator = new Map<string, number>();
  for (const p of curP.filter(paid)) byOperator.set(p.correspondent ?? "Autre", (byOperator.get(p.correspondent ?? "Autre") ?? 0) + p.amount);
  const byPayStatus = { completed: curP.filter((p) => p.status === "completed").length, failed: curP.filter((p) => p.status === "failed").length, pending: curP.filter((p) => p.status === "pending").length };

  const latestVideos = [...V].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8)
    .map((v) => ({ ...v, email: accs.find((a) => a.id === v.created_by)?.email ?? null, style: costs.get(v.style_id)?.name ?? v.style_id }));
  const latestUsers = [...accs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
    .map((a) => ({ ...a, name: profs.get(a.id)?.full_name ?? "", country: profs.get(a.id)?.country ?? "" }));

  return {
    from: from.toISOString(), to: new Date(now).toISOString(), days, budget,
    users: { total: accs.length, new: accs.filter((a) => inCur(a.created_at)).length, newPrev: accs.filter((a) => inPrev(a.created_at)).length, active: active.size, activePrev: activePrev.size },
    revenue: { cur: revenue(curP), prev: revenue(P.filter((p) => inPrev(p.created_at))), currency: "FCFA", payments: curP.filter(paid).length },
    videos: { ready: readyV.length, readyPrev: prevReady.length, failed: curV.filter((v) => v.status === "failed").length, running: V.filter((v) => ["pending", "processing"].includes(v.status)).length, total: curV.length },
    spend: { cur: spendCur, prev: spendPrev, images: imgCount },
    daily, byStyle: [...byStyle.entries()].map(([id, x]) => ({ id, name: costs.get(id)?.name ?? id, ...x })),
    byOperator: [...byOperator.entries()].map(([op, amount]) => ({ op, amount })), byPayStatus,
    latestVideos, latestUsers,
  };
}

/** Budget Higgsfield : dépensé depuis la dernière recharge, restant, alerte. */
export async function higgsfieldBudget(b: BudgetSettings) {
  const since = new Date(b.hfBudgetSince).toISOString();
  const [costs, { data: vids }, { data: imgs }] = await Promise.all([
    stylesCost(),
    db().from("videos").select("style_id, duration_s, status, refunded").gte("created_at", since).limit(20000),
    db().from("project_images").select("status").gte("created_at", since).neq("status", "failed").limit(50000),
  ]);
  const ready = ((vids ?? []) as VideoRow[]).filter((v) => v.status === "ready");
  const videoUsd = ready.reduce((s, v) => s + videoCostUsd(v, costs), 0);
  const imagesUsd = (imgs?.length ?? 0) * b.imageCostUsd;
  const spentUsd = videoUsd + imagesUsd + b.hfOtherSpendUsd;
  const leftUsd = b.hfBudgetUsd - spentUsd;
  return {
    spentUsd, videoUsd, imagesUsd, images: imgs?.length ?? 0, videos: ready.length, budgetUsd: b.hfBudgetUsd, leftUsd,
    usedPct: b.hfBudgetUsd > 0 ? Math.min(100, (spentUsd / b.hfBudgetUsd) * 100) : 0,
    low: b.hfBudgetUsd > 0 && leftUsd < b.hfAlertUsd, configured: b.hfBudgetUsd > 0,
  };
}

/* ---------- Utilisateurs ---------- */

export type AdminUserRow = { id: string; email: string; name: string; country: string; phone: string | null; is_admin: boolean; email_verified: boolean; created_at: string; videos: number; adsLeft: number; paid: number; last: string | null };

export async function listUsers(q: { query?: string; page?: number; pageSize?: number }) {
  await requireAdmin();
  const [accs, profs, { data: vids }, { data: pays }, { data: passes }] = await Promise.all([
    accounts(), profiles(),
    db().from("videos").select("created_by, status, created_at").limit(50000),
    db().from("payments").select("user_id, amount, status").eq("status", "completed").limit(50000),
    db().from("video_passes").select("user_id, remaining, expires_at").gt("remaining", 0).limit(50000),
  ]);
  const now = Date.now();
  const rows: AdminUserRow[] = accs.map((a) => {
    const p = profs.get(a.id);
    const mine = ((vids ?? []) as { created_by: string; status: string; created_at: string }[]).filter((v) => v.created_by === a.id);
    return {
      id: a.id, email: a.email, name: p?.full_name ?? "", country: p?.country ?? "", phone: p?.phone ?? null, is_admin: !!p?.is_admin,
      email_verified: a.email_verified, created_at: a.created_at,
      videos: mine.filter((v) => v.status === "ready").length,
      adsLeft: ((passes ?? []) as { user_id: string; remaining: number; expires_at: string | null }[]).filter((x) => x.user_id === a.id && (!x.expires_at || new Date(x.expires_at).getTime() > now)).reduce((s, x) => s + x.remaining, 0),
      paid: ((pays ?? []) as { user_id: string; amount: number }[]).filter((x) => x.user_id === a.id).reduce((s, x) => s + x.amount, 0),
      last: mine.map((v) => v.created_at).sort().pop() ?? null,
    };
  });
  const s = (q.query ?? "").trim().toLowerCase();
  const filtered = rows.filter((r) => !s || r.email.toLowerCase().includes(s) || r.name.toLowerCase().includes(s) || r.id.startsWith(s) || (r.phone ?? "").includes(s))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const size = Math.min(q.pageSize ?? 25, 100), page = q.page ?? 0;
  return { total: filtered.length, items: filtered.slice(page * size, page * size + size) };
}

export async function getUser(id: string) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { items } = await listUsers({ query: id, pageSize: 1 });
  const u = items.find((x) => x.id === id);
  if (!u) return null;
  const [{ data: vids }, { data: pays }, { data: passes }, { data: convs }, costs] = await Promise.all([
    db().from("videos").select("id, created_by, style_id, duration_s, status, video_url, refunded, created_at, conversation_id, error, pass_id").eq("created_by", id).order("created_at", { ascending: false }).limit(60),
    db().from("payments").select("id, user_id, plan, style_id, duration_s, videos, amount, currency, status, correspondent, phone, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(60),
    db().from("video_passes").select("id, style_id, duration_s, plan, total, remaining, expires_at, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(60),
    db().from("conversations").select("id, title, step, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(60),
    stylesCost(),
  ]);
  const V = (vids ?? []) as VideoRow[];
  return {
    ...u, costs,
    videosList: V, payments: (pays ?? []) as PaymentRow[],
    passes: (passes ?? []) as { id: string; style_id: string; duration_s: number; plan: string; total: number; remaining: number; expires_at: string | null; created_at: string }[],
    projects: (convs ?? []) as { id: string; title: string; step: string; created_at: string }[],
    spentUsd: V.filter((v) => v.status === "ready").reduce((s, v) => s + videoCostUsd(v, costs), 0),
  };
}

/* ---------- Pubs (générations) ---------- */

export async function listVideos(q: { status?: string; query?: string; userId?: string; page?: number; pageSize?: number }) {
  await requireAdmin();
  let query = db().from("videos").select("id, created_by, style_id, duration_s, status, video_url, refunded, created_at, conversation_id, error, pass_id").order("created_at", { ascending: false }).limit(2000);
  if (q.userId) query = query.eq("created_by", q.userId);
  if (q.status === "running") query = query.in("status", ["pending", "processing"]);
  else if (q.status) query = query.eq("status", q.status);
  const [{ data }, accs, costs] = await Promise.all([query, accounts(), stylesCost()]);
  const email = new Map(accs.map((a) => [a.id, a.email]));
  const s = (q.query ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as VideoRow[]).map((v) => ({ ...v, email: email.get(v.created_by) ?? null, style: costs.get(v.style_id)?.name ?? v.style_id, costUsd: videoCostUsd(v, costs) }))
    .filter((v) => !s || v.id.startsWith(s) || (v.email ?? "").toLowerCase().includes(s) || v.style.toLowerCase().includes(s));
  const size = Math.min(q.pageSize ?? 30, 100), page = q.page ?? 0;
  return { total: rows.length, items: rows.slice(page * size, page * size + size) };
}

/* ---------- Paiements ---------- */

export async function listPayments(q: { status?: string; query?: string; userId?: string; page?: number; pageSize?: number }) {
  await requireAdmin();
  let query = db().from("payments").select("id, user_id, plan, style_id, duration_s, videos, amount, currency, status, correspondent, phone, created_at, raw").order("created_at", { ascending: false }).limit(5000);
  if (q.userId) query = query.eq("user_id", q.userId);
  if (q.status) query = query.eq("status", q.status);
  const [{ data }, accs, pricing] = await Promise.all([query, accounts(), loadPricing()]);
  const email = new Map(accs.map((a) => [a.id, a.email]));
  const sname = new Map(pricing.styles.map((st) => [st.id, st.name_fr]));
  const s = (q.query ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as PaymentRow[]).map((p) => {
    const raw = p.raw as { data?: { failureReason?: { failureCode?: string } }; expired?: boolean; error?: string } | null;
    return { ...p, email: email.get(p.user_id) ?? null, style: p.style_id ? sname.get(p.style_id) ?? p.style_id : "—", reason: raw?.expired ? "Page expirée" : raw?.data?.failureReason?.failureCode ?? raw?.error ?? null };
  }).filter((p) => !s || p.id.startsWith(s) || (p.email ?? "").toLowerCase().includes(s) || (p.phone ?? "").includes(s) || (p.correspondent ?? "").toLowerCase().includes(s));
  const size = Math.min(q.pageSize ?? 40, 100), page = q.page ?? 0;
  const totals = { completed: rows.filter((p) => p.status === "completed").reduce((t, p) => t + p.amount, 0) };
  return { total: rows.length, totals, items: rows.slice(page * size, page * size + size) };
}

/* ---------- Journal ---------- */

export type AuditRow = { id: string; actor_email: string; action: string; target_type: string; target_id: string | null; before: unknown; after: unknown; reason: string; created_at: string };

export async function listAudit(q: { targetId?: string; limit?: number } = {}) {
  await requireAdmin();
  let query = db().from("admin_audit").select("*").order("created_at", { ascending: false }).limit(Math.min(q.limit ?? 50, 300));
  if (q.targetId) query = query.eq("target_id", q.targetId);
  const { data, error } = await query;
  if (error) throw new AdminError(error.message);
  return (data ?? []) as AuditRow[];
}

export async function audit(actor: AdminUserSession, e: { action: string; targetType: string; targetId?: string | null; before?: unknown; after?: unknown; reason?: string }) {
  await db().from("admin_audit").insert([{ actor_email: actor.email, action: e.action, target_type: e.targetType, target_id: e.targetId ?? null, before: e.before ?? null, after: e.after ?? null, reason: e.reason ?? "" }]);
}
