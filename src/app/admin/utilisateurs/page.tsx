import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { Badge, Card, Empty, ErrorBox, Pager, SearchForm, fmtDate, fmtNum, fmtXof } from "@/components/admin/ui";
import { listUsers } from "@/lib/admin";
import { COUNTRIES } from "@/lib/pricing";
import { NewUser } from "@/components/admin/UserActions";

const PAGE_SIZE = 25;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Math.max(0, Number(sp.page) || 0);
  const qs = (p: Record<string, string | number>) => "/admin/utilisateurs?" + new URLSearchParams(Object.entries({ q, ...p }).filter(([, v]) => String(v) !== "" && String(v) !== "0").map(([k, v]) => [k, String(v)])).toString();
  let res;
  try {
    res = await listUsers({ query: q, page, pageSize: PAGE_SIZE });
  } catch (e) {
    return <><AdminTopBar title="Utilisateurs" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref={qs({ page })} /></>;
  }
  return (
    <>
      <AdminTopBar title="Utilisateurs" pill={`${fmtNum(res.total)} comptes`} subtitle="Comptes, pubs créées, pubs restantes et paiements" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchForm action="/admin/utilisateurs" query={q} placeholder="E-mail, nom, téléphone ou identifiant…" />
        <NewUser countries={Object.entries(COUNTRIES).map(([code, c]) => ({ code, name: c.name }))} />
      </div>
      <Card className="overflow-hidden p-0 sm:p-0">
        {res.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-[13px]">
              <thead className="bg-[#121212] text-left text-[11px] uppercase tracking-wide text-white/45">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium">Compte</th><th className="px-4 py-3 font-medium">Pays</th>
                  <th className="px-4 py-3 text-right font-medium">Pubs créées</th><th className="px-4 py-3 text-right font-medium">Pubs restantes</th>
                  <th className="px-4 py-3 text-right font-medium">Payé</th><th className="px-4 py-3 font-medium">Dernière pub</th><th className="px-4 py-3 font-medium">Inscription</th>
                </tr>
              </thead>
              <tbody>
                {res.items.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/utilisateurs/${u.id}`} className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[12px] font-semibold">{(u.name || u.email).slice(0, 1).toUpperCase()}</span>
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate font-medium">{u.name || "—"} {u.is_admin && <Badge tone="orange">Admin</Badge>}</span>
                          <span className="block truncate text-[12px] text-white/45">{u.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/70">{u.country}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtNum(u.videos)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{fmtNum(u.adsLeft)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.paid ? fmtXof(u.paid) : "—"}</td>
                    <td className="px-4 py-3 text-white/70">{fmtDate(u.last, true)}</td>
                    <td className="px-4 py-3 text-white/70">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>{q ? "Aucun compte ne correspond." : "Aucun compte pour l’instant."}</Empty>}
      </Card>
      <Pager page={page} pageSize={PAGE_SIZE} total={res.total} href={(p) => qs({ page: p })} />
    </>
  );
}
