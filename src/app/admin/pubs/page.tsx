import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { RefundButton } from "@/components/admin/RowActions";
import { Badge, Card, Empty, ErrorBox, Pager, STATUS_LABEL, STATUS_TONE, SearchForm, Segmented, fmtDate, fmtNum, fmtUsd } from "@/components/admin/ui";
import { listVideos } from "@/lib/admin";

const PAGE_SIZE = 30;

export default async function AdminVideos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q ?? "", status = sp.status ?? "", user = sp.user ?? "";
  const page = Math.max(0, Number(sp.page) || 0);
  const qs = (p: Record<string, string | number>) => "/admin/pubs?" + new URLSearchParams(Object.entries({ q, status, user, ...p }).filter(([, v]) => String(v) !== "" && String(v) !== "0").map(([k, v]) => [k, String(v)])).toString();
  let res;
  try {
    res = await listVideos({ query: q, status, userId: /^[0-9a-f-]{36}$/i.test(user) ? user : undefined, page, pageSize: PAGE_SIZE });
  } catch (e) {
    return <><AdminTopBar title="Pubs créées" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref={qs({ page })} /></>;
  }
  return (
    <>
      <AdminTopBar title="Pubs créées" pill={`${fmtNum(res.total)} résultats`} subtitle="Chaque pub générée, son style, son coût Higgsfield et son statut" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchForm action="/admin/pubs" query={q} placeholder="E-mail, style, identifiant…" hidden={{ status, user }} />
        <Segmented active={status || "all"} items={[["all", "Toutes"], ["ready", "Prêtes"], ["running", "En cours"], ["failed", "Échecs"]].map(([k, l]) => ({ key: k, label: l, href: qs({ status: k === "all" ? "" : k, page: 0 }) }))} />
        {user && <Link href={qs({ user: "", page: 0 })} className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-white/70 hover:text-white">× Filtre utilisateur</Link>}
      </div>
      <Card className="overflow-hidden p-0 sm:p-0">
        {res.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="bg-[#121212] text-left text-[11px] uppercase tracking-wide text-white/45">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium">Pub</th><th className="px-4 py-3 font-medium">Compte</th><th className="px-4 py-3 font-medium">Style</th>
                  <th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 text-right font-medium">Coût</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {res.items.map((v) => (
                  <tr key={v.id} className="border-b border-white/[0.04] align-middle hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5">
                      {v.video_url ? <a href={v.video_url} target="_blank" rel="noreferrer" className="block h-16 w-9 overflow-hidden rounded-lg bg-white/[0.05]"><video src={v.video_url} muted playsInline preload="metadata" className="size-full object-cover" /></a>
                        : <span className="grid h-16 w-9 place-items-center rounded-lg bg-white/[0.04] text-[10px] text-white/45">▶</span>}
                    </td>
                    <td className="px-4 py-2.5"><Link href={`/admin/utilisateurs/${v.created_by}`} className="hover:underline">{v.email ?? v.created_by.slice(0, 8)}</Link><span className="block font-mono text-[10px] text-white/45">{v.id.slice(0, 8)}</span></td>
                    <td className="px-4 py-2.5 text-white/70">{v.style}<span className="block text-[11px] text-white/45">{v.duration_s} s</span></td>
                    <td className="px-4 py-2.5"><Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status] ?? v.status}</Badge>{v.refunded && <span className="ml-1"><Badge tone="yellow">Rendue</Badge></span>}
                      {v.error && <span className="mt-1 block max-w-[220px] truncate text-[10px] text-red-400" title={v.error}>{v.error}</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtUsd(v.costUsd)}</td>
                    <td className="px-4 py-2.5 text-white/70">{fmtDate(v.created_at, true)}</td>
                    <td className="px-4 py-2.5 text-right">{v.status === "ready" && !v.refunded ? <RefundButton videoId={v.id} /> : <span className="text-[11px] text-white/45">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Aucune pub ne correspond.</Empty>}
      </Card>
      <Pager page={page} pageSize={PAGE_SIZE} total={res.total} href={(p) => qs({ page: p })} />
    </>
  );
}
