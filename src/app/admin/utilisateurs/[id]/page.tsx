import { ArrowLeft, Clapperboard, FolderOpen, ScrollText, Smartphone, Ticket, UserCog } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { UserActions } from "@/components/admin/UserActions";
import { Badge, Card, CardHeader, Empty, ErrorBox, PAY_LABEL, PAY_TONE, PLAN_LABEL, STATUS_LABEL, STATUS_TONE, fmtDate, fmtNum, fmtUsd, fmtXof } from "@/components/admin/ui";
import { getUser, listAudit } from "@/lib/admin";
import { loadPricing } from "@/lib/pricing";

const STEP: Record<string, string> = { product: "Produit", creator: "Créateur", format: "Format", location: "Lieu", style: "Style", preview: "Aperçu", video: "Vidéo", done: "Terminé" };

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    const user = await getUser(id);
    if (!user) notFound();
    const [auditRows, pricing] = await Promise.all([listAudit({ targetId: id, limit: 20 }), loadPricing()]);
    data = { user, auditRows, pricing };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return <><AdminTopBar title="Utilisateur" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref={`/admin/utilisateurs/${id}`} /></>;
  }
  const { user, auditRows, pricing } = data;
  const sname = (sid: string) => user.costs.get(sid)?.name ?? sid;
  const stats: [string, string][] = [
    ["Pubs créées", fmtNum(user.videos)], ["Pubs restantes", fmtNum(user.adsLeft)], ["Total payé", user.paid ? fmtXof(user.paid) : "0"],
    ["Coût Higgsfield", fmtUsd(user.spentUsd)], ["Projets", fmtNum(user.projects.length)], ["Paiements", fmtNum(user.payments.length)],
  ];

  return (
    <>
      <AdminTopBar back={<Link href="/admin/utilisateurs" className="mb-2 inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white"><ArrowLeft className="size-3.5" /> Utilisateurs</Link>}
        title={user.name || user.email} pill={user.is_admin ? "Admin" : user.country}
        subtitle={`${user.email}${user.phone ? ` · ${user.phone}` : ""} · inscrit le ${fmtDate(user.created_at)}${user.email_verified ? " · e-mail vérifié" : " · e-mail non vérifié"}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(([l, v]) => <Card key={l} className="p-3 sm:p-3.5"><p className="text-[11px] text-white/45">{l}</p><p className="mt-1 truncate text-[17px] font-semibold tabular-nums">{v}</p></Card>)}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader icon={<UserCog />} title="Actions" />
          <UserActions userId={user.id} isAdmin={user.is_admin} styles={pricing.styles.map((s) => ({ id: s.id, name: s.name_fr, durations: s.durations }))} />
        </Card>
        <Card>
          <CardHeader icon={<Ticket />} title="Pubs achetées, offertes et rendues" />
          {user.passes.length ? (
            <ul className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
              {user.passes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                  <Badge tone={p.plan === "gift" ? "blue" : p.plan === "refund" ? "yellow" : "green"}>{PLAN_LABEL[p.plan] ?? p.plan}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">{sname(p.style_id)} · {p.duration_s} s{p.expires_at ? ` · expire le ${fmtDate(p.expires_at)}` : ""}</span>
                  <span className="text-[13px] font-medium tabular-nums">{p.remaining}/{p.total}</span>
                  <span className="hidden w-24 text-right text-[11px] text-white/45 sm:block">{fmtDate(p.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Aucune pub achetée ou offerte.</Empty>}
        </Card>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={<Clapperboard />} title="Pubs" action={<Link href={`/admin/pubs?user=${user.id}`} className="text-[12px] text-white/70 hover:text-white">Tout voir</Link>} />
          {user.videosList.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {user.videosList.slice(0, 15).map((v) => (
                <a key={v.id} href={v.video_url ?? "#"} target="_blank" className="relative aspect-[9/16] overflow-hidden rounded-xl bg-white/[0.04]">
                  {v.video_url ? <video src={v.video_url} muted playsInline preload="metadata" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[11px] text-white/45">{STATUS_LABEL[v.status]}</span>}
                  <span className="absolute inset-x-1 bottom-1"><Badge tone={STATUS_TONE[v.status]}>{sname(v.style_id)} {v.duration_s} s</Badge></span>
                </a>
              ))}
            </div>
          ) : <Empty>Aucune pub.</Empty>}
        </Card>
        <Card>
          <CardHeader icon={<Smartphone />} title="Paiements" action={<Link href={`/admin/paiements?user=${user.id}`} className="text-[12px] text-white/70 hover:text-white">Tout voir</Link>} />
          {user.payments.length ? (
            <ul className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
              {user.payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                  <Badge tone={PAY_TONE[p.status]}>{PAY_LABEL[p.status] ?? p.status}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-white/70">{PLAN_LABEL[p.plan] ?? p.plan} · {sname(p.style_id ?? "")} {p.duration_s} s</span>
                  <span className="text-[13px] font-medium tabular-nums">{fmtXof(p.amount, p.currency)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Aucun paiement.</Empty>}
        </Card>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader icon={<FolderOpen />} title="Projets" />
          {user.projects.length ? (
            <ul className="space-y-1">
              {user.projects.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] hover:bg-white/[0.03]">
                  <span className="min-w-0 flex-1 truncate">{c.title}</span><Badge tone={c.step === "done" ? "green" : "gray"}>{STEP[c.step] ?? c.step}</Badge>
                  <span className="w-24 text-right text-[11px] text-white/45">{fmtDate(c.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>Aucun projet.</Empty>}
        </Card>
        <Card>
          <CardHeader icon={<ScrollText />} title="Actions admin sur ce compte" />
          {auditRows.length ? (
            <ul className="space-y-2">
              {auditRows.map((a) => (
                <li key={a.id} className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px]">
                  <p><span className="font-medium">{a.action}</span> <span className="text-white/45">par {a.actor_email} · {fmtDate(a.created_at, true)}</span></p>
                  <p className="mt-0.5 break-all text-white/70">{JSON.stringify(a.after)}{a.reason ? ` · « ${a.reason} »` : ""}</p>
                </li>
              ))}
            </ul>
          ) : <Empty>Aucune action admin.</Empty>}
        </Card>
      </div>
    </>
  );
}
