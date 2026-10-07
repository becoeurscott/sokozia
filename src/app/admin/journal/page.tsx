import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { Card, Empty, ErrorBox, fmtDate } from "@/components/admin/ui";
import { listAudit } from "@/lib/admin";

const LABEL: Record<string, string> = {
  "ads.gift": "Pubs offertes", "user.admin": "Droits admin modifiés", "video.refund": "Pub rendue au client", "payment.recheck": "Paiement revérifié",
  "budget.update": "Budget Higgsfield modifié", "style.update": "Style modifié", "pricing.update": "Tarifs modifiés",
};

export default async function AdminAudit() {
  let rows;
  try { rows = await listAudit({ limit: 300 }); } catch (e) {
    return <><AdminTopBar title="Journal" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref="/admin/journal" /></>;
  }
  return (
    <>
      <AdminTopBar title="Journal des actions" pill={`${rows.length} dernières`} subtitle="Toutes les modifications faites depuis le back-office, avec l'avant / après" />
      <Card className="overflow-hidden p-0 sm:p-0">
        {rows.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((a) => (
              <li key={a.id} className="px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p><span className="font-medium">{LABEL[a.action] ?? a.action}</span> <span className="text-white/45">· {a.target_type} {a.target_id?.slice(0, 8)}</span></p>
                  <p className="text-[11px] text-white/45">{a.actor_email} · {fmtDate(a.created_at, true)}</p>
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-white/70">{JSON.stringify(a.before)} → {JSON.stringify(a.after)}</p>
                {a.reason && <p className="mt-0.5 text-[12px] text-white/45">« {a.reason} »</p>}
              </li>
            ))}
          </ul>
        ) : <Empty>Aucune action pour l&apos;instant.</Empty>}
      </Card>
    </>
  );
}
