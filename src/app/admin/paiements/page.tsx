import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { RecheckButton } from "@/components/admin/RowActions";
import { Badge, Card, Empty, ErrorBox, PAY_LABEL, PAY_TONE, PLAN_LABEL, Pager, SearchForm, Segmented, fmtDate, fmtNum, fmtXof } from "@/components/admin/ui";
import { listPayments } from "@/lib/admin";

const PAGE_SIZE = 40;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q ?? "", status = sp.status ?? "", user = sp.user ?? "";
  const page = Math.max(0, Number(sp.page) || 0);
  const qs = (p: Record<string, string | number>) => "/admin/paiements?" + new URLSearchParams(Object.entries({ q, status, user, ...p }).filter(([, v]) => String(v) !== "" && String(v) !== "0").map(([k, v]) => [k, String(v)])).toString();
  let res;
  try {
    res = await listPayments({ query: q, status, userId: /^[0-9a-f-]{36}$/i.test(user) ? user : undefined, page, pageSize: PAGE_SIZE });
  } catch (e) {
    return <><AdminTopBar title="Paiements" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref={qs({ page })} /></>;
  }
  return (
    <>
      <AdminTopBar title="Paiements" pill={`${fmtNum(res.total)} paiements · ${fmtXof(res.totals.completed)} encaissés`} subtitle="Paiements Mobile Money via pawaPay : offre, opérateur, numéro, statut et raison des refus" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchForm action="/admin/paiements" query={q} placeholder="E-mail, téléphone, opérateur, identifiant…" hidden={{ status, user }} />
        <Segmented active={status || "all"} items={[["all", "Tous"], ["completed", "Payés"], ["pending", "En attente"], ["failed", "Échoués"]].map(([k, l]) => ({ key: k, label: l, href: qs({ status: k === "all" ? "" : k, page: 0 }) }))} />
        {user && <Link href={qs({ user: "", page: 0 })} className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-white/70 hover:text-white">× Filtre utilisateur</Link>}
      </div>
      <Card className="overflow-hidden p-0 sm:p-0">
        {res.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead className="bg-[#121212] text-left text-[11px] uppercase tracking-wide text-white/45">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Compte</th><th className="px-4 py-3 font-medium">Offre</th>
                  <th className="px-4 py-3 text-right font-medium">Montant</th><th className="px-4 py-3 font-medium">Opérateur</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {res.items.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-white/70">{fmtDate(p.created_at, true)}</td>
                    <td className="px-4 py-2.5"><Link href={`/admin/utilisateurs/${p.user_id}`} className="hover:underline">{p.email ?? p.user_id.slice(0, 8)}</Link><span className="block text-[11px] text-white/45">{p.phone ?? "—"}</span></td>
                    <td className="px-4 py-2.5 text-white/70">{PLAN_LABEL[p.plan] ?? p.plan} · {p.style} {p.duration_s} s</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{fmtXof(p.amount, p.currency)}</td>
                    <td className="px-4 py-2.5 text-white/70">{p.correspondent?.replaceAll("_", " ") ?? "—"}</td>
                    <td className="px-4 py-2.5"><Badge tone={PAY_TONE[p.status]}>{PAY_LABEL[p.status] ?? p.status}</Badge>{p.reason && p.status === "failed" && <span className="mt-1 block text-[10px] text-white/45">{p.reason}</span>}</td>
                    <td className="px-4 py-2.5 text-right">{p.status !== "completed" ? <RecheckButton paymentId={p.id} /> : <span className="text-[11px] text-white/45">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Aucun paiement ne correspond.</Empty>}
      </Card>
      <Pager page={page} pageSize={PAGE_SIZE} total={res.total} href={(p) => qs({ page: p })} />
    </>
  );
}
