import { AlertTriangle, BarChart3, CheckCircle2, Clapperboard, Flame, Smartphone, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { MiniBlocks, PillBars, Ring, ShareBars, type BarPoint } from "@/components/admin/charts";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { Badge, Card, CardHeader, Delta, ErrorBox, KpiCard, STATUS_LABEL, STATUS_TONE, Segmented, fmtDate, fmtNum, fmtUsd, fmtXof, trend } from "@/components/admin/ui";
import { getOverview, higgsfieldBudget, type DailyPoint } from "@/lib/admin";

const RANGES = [{ days: 7, label: "1 sem" }, { days: 30, label: "1 mois" }, { days: 90, label: "3 mois" }, { days: 180, label: "6 mois" }, { days: 365, label: "1 an" }];
const COLORS = ["#f97316", "#facc15", "#22c55e", "#a855f7", "#3b82f6", "#ef4444"];

/** Jours jusqu'à 30 j, semaines jusqu'à 180 j, mois au-delà (les sommes restent exactes). */
function bucket(daily: DailyPoint[], days: number) {
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { ...o, timeZone: "UTC" }).format(d);
  if (days <= 30) return daily.map((d) => ({ ...d, label: fmt(new Date(d.day), { day: "numeric", month: "short" }) }));
  const groups = new Map<string, DailyPoint & { label: string }>();
  for (const d of daily) {
    const t = new Date(d.day);
    const monday = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - ((t.getUTCDay() + 6) % 7)));
    const [key, label] = days <= 180 ? [monday.toISOString(), fmt(monday, { day: "numeric", month: "short" })] : [`${t.getUTCFullYear()}-${t.getUTCMonth()}`, fmt(t, { month: "short" })];
    const g = groups.get(key) ?? { day: key, label, revenue: 0, videos: 0, failed: 0, users: 0 };
    g.revenue += d.revenue; g.videos += d.videos; g.failed += d.failed; g.users += d.users;
    groups.set(key, g);
  }
  return [...groups.values()];
}

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.some((r) => String(r.days) === sp.days) ? Number(sp.days) : 30;
  let o, budget;
  try {
    o = await getOverview(days);
    budget = await higgsfieldBudget(o.budget);
  } catch (e) {
    return <><AdminTopBar title="Vue d’ensemble" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref={`/admin?days=${days}`} /></>;
  }

  const series = bucket(o.daily, days);
  const bars: BarPoint[] = series.map((d) => ({ label: d.label, value: d.revenue, secondary: d.videos }));
  const spark = (k: keyof DailyPoint) => series.slice(-8).map((d) => Number(d[k]));
  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? "";
  const failRate = o.videos.total ? (o.videos.failed / o.videos.total) * 100 : 0;
  const marginXof = o.revenue.cur - o.spend.cur * o.budget.usdToXof;

  const alerts: { tone: "red" | "orange" | "green"; text: React.ReactNode; href?: string }[] = [];
  if (!budget.configured) alerts.push({ tone: "orange", text: <>Le budget Higgsfield n&apos;est pas renseigné : impossible de savoir ce qu&apos;il reste.</>, href: "/admin/higgsfield" });
  else if (budget.leftUsd <= 0) alerts.push({ tone: "red", text: <>Budget Higgsfield <b>épuisé</b> ({fmtUsd(budget.leftUsd)}). Les pubs vont échouer.</>, href: "/admin/higgsfield" });
  else if (budget.low) alerts.push({ tone: "red", text: <>Il ne reste que <b>{fmtUsd(budget.leftUsd)}</b> sur Higgsfield. Pense à recharger.</>, href: "/admin/higgsfield" });
  if (o.videos.total >= 5 && failRate >= 10) alerts.push({ tone: "red", text: <><b>{fmtNum(failRate, 1)} %</b> des pubs ont échoué sur la période ({o.videos.failed}).</>, href: "/admin/pubs?status=failed" });
  if (o.videos.running > 0) alerts.push({ tone: "orange", text: <><b>{o.videos.running}</b> pub(s) en cours de création.</>, href: "/admin/pubs?status=running" });
  if (o.byPayStatus.pending > 0) alerts.push({ tone: "orange", text: <><b>{o.byPayStatus.pending}</b> paiement(s) en attente de confirmation.</>, href: "/admin/paiements?status=pending" });
  if (o.users.new > 0) alerts.push({ tone: "green", text: <><b>{o.users.new}</b> nouveau(x) compte(s) sur la période.</>, href: "/admin/utilisateurs" });
  if (!alerts.length) alerts.push({ tone: "green", text: <>Tout est normal sur la période.</> });

  return (
    <>
      <AdminTopBar title="Vue d’ensemble" subtitle="Comptes, ventes, pubs créées et dépenses Higgsfield"
        pill={`${fmtDate(o.from)} → ${fmtDate(o.to)}`}
        actions={<Segmented active={String(days)} items={RANGES.map((r) => ({ key: String(r.days), label: r.label, href: `/admin?days=${r.days}` }))} />} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users />} title="Utilisateurs" value={fmtNum(o.users.total)} sub={`+${fmtNum(o.users.new)} sur ${rangeLabel} · ${fmtNum(o.users.active)} actifs`}
          graphic={<MiniBlocks values={spark("users")} color="#3b82f6" />} footer={<><span>Nouveaux vs période préc.</span><Delta value={trend(o.users.new, o.users.newPrev)} /></>} />
        <KpiCard icon={<Smartphone />} title="Chiffre d’affaires" value={fmtXof(o.revenue.cur)} sub={`${fmtNum(o.revenue.payments)} paiement(s) Mobile Money`}
          graphic={<MiniBlocks values={spark("revenue")} color="#22c55e" />} footer={<><span>vs période préc.</span><Delta value={trend(o.revenue.cur, o.revenue.prev)} /></>} />
        <KpiCard icon={<Clapperboard />} title="Pubs créées" value={fmtNum(o.videos.ready)} sub={`${fmtNum(o.videos.failed)} échec(s) · ${fmtNum(o.spend.images)} images`}
          graphic={<MiniBlocks values={spark("videos")} color="#a855f7" />} footer={<><span>vs période préc.</span><Delta value={trend(o.videos.ready, o.videos.readyPrev)} /></>} />
        <KpiCard icon={<Wallet />} title="Budget Higgsfield restant" value={budget.configured ? fmtUsd(budget.leftUsd) : "À configurer"}
          sub={budget.configured ? `${fmtUsd(budget.spentUsd)} dépensés sur ${fmtUsd(budget.budgetUsd)}` : "Renseigne le montant rechargé"}
          graphic={budget.configured ? <Ring pct={100 - budget.usedPct} color={budget.low ? "#ef4444" : "#22c55e"} /> : undefined}
          footer={<><span>Depuis le {fmtDate(o.budget.hfBudgetSince)}</span><Link href="/admin/higgsfield" className="text-[#f08a3c] hover:underline">Modifier</Link></>} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={<BarChart3 />} title="Ventes et pubs" action={<span className="text-[12px] text-white/45">{fmtXof(o.revenue.cur)} · {fmtNum(o.videos.ready)} pubs · {rangeLabel}</span>} />
          <PillBars data={bars} primaryLabel="Ventes (FCFA)" secondaryLabel="Pubs créées" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[["Ventes", fmtXof(o.revenue.cur)], ["Coût Higgsfield", fmtUsd(o.spend.cur)], ["Marge estimée", fmtXof(marginXof)]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-white/[0.03] p-2.5"><p className="text-[14px] font-semibold tabular-nums">{v}</p><p className="text-[11px] text-white/45">{l}</p></div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader icon={<Clapperboard />} title="Dernières pubs" action={<Link href="/admin/pubs" className="text-[12px] text-white/70 hover:text-white">Tout voir</Link>} />
          {o.latestVideos.length ? (
            <ul className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
              {o.latestVideos.map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/pubs?q=${v.id}`} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06]">
                    <span className="h-12 w-8 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
                      {v.video_url ? <video src={v.video_url} muted playsInline preload="metadata" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[10px] text-white/45">▶</span>}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px]">{v.email ?? "—"}</span>
                      <span className="block truncate text-[11px] text-white/45">{v.style} · {v.duration_s} s · {fmtDate(v.created_at, true)}</span>
                    </span>
                    <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status] ?? v.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="py-10 text-center text-[13px] text-white/45">Aucune pub pour l&apos;instant.</p>}
        </Card>

        <Card className="relative flex flex-col overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#f08a3c]/20 blur-3xl" />
          <CardHeader icon={<AlertTriangle />} title="Alertes" />
          <ul className="relative flex-1 space-y-3">
            {alerts.map((a, i) => {
              const body = (
                <span className="flex items-start gap-3">
                  <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${a.tone === "red" ? "bg-red-500/15 text-red-400" : a.tone === "orange" ? "bg-[#f08a3c]/15 text-[#f08a3c]" : "bg-emerald-500/15 text-emerald-400"}`}>
                    {a.tone === "green" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                  </span>
                  <span className="text-[13px] leading-snug text-white/70 [&_b]:text-white">{a.text}</span>
                </span>
              );
              return <li key={i}>{a.href ? <Link href={a.href} className="block rounded-lg hover:bg-white/[0.03]">{body}</Link> : body}</li>;
            })}
          </ul>
          <Link href="/admin/higgsfield" className="relative mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f08a3c] to-[#ef4444] text-[13px] font-medium text-white hover:opacity-90">
            <Wallet className="size-4" /> Mettre à jour le budget Higgsfield
          </Link>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<Flame />} title="Pubs et coût par style" action={<span className="text-[12px] text-white/45">{rangeLabel}</span>} />
          {o.byStyle.length ? <ShareBars items={o.byStyle.map((s, i) => ({ label: s.name, value: s.videos, hint: `${fmtUsd(s.usd)}`, color: COLORS[i % 6] }))} unit=" pubs" />
            : <p className="py-6 text-center text-[13px] text-white/45">Aucune pub sur la période.</p>}
        </Card>
        <Card>
          <CardHeader icon={<Smartphone />} title="Ventes par opérateur" />
          {o.byOperator.length ? <ShareBars items={o.byOperator.map((x, i) => ({ label: x.op.replaceAll("_", " "), value: x.amount, color: COLORS[(i + 2) % 6] }))} unit=" FCFA" />
            : <p className="py-6 text-center text-[13px] text-white/45">Aucune vente sur la période.</p>}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[["Payés", o.byPayStatus.completed], ["Échoués", o.byPayStatus.failed], ["En attente", o.byPayStatus.pending]].map(([l, v]) => (
              <Link key={l as string} href={`/admin/paiements?status=${({ Payés: "completed", Échoués: "failed", "En attente": "pending" } as Record<string, string>)[l as string]}`} className="rounded-xl bg-white/[0.03] p-2.5 hover:bg-white/[0.06]">
                <p className="text-[15px] font-semibold tabular-nums">{fmtNum(v as number)}</p><p className="text-[11px] text-white/45">{l}</p>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader icon={<UserPlus />} title="Derniers inscrits" action={<Link href="/admin/utilisateurs" className="text-[12px] text-white/70 hover:text-white">Tout voir</Link>} />
          <ul className="space-y-1.5">
            {o.latestUsers.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/utilisateurs/${u.id}`} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[12px] font-semibold">{(u.name || u.email).slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px]">{u.name || u.email}</span>
                    <span className="block truncate text-[11px] text-white/45">{fmtDate(u.created_at)} · {u.country}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
