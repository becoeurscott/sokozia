import { Wallet } from "lucide-react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { BudgetForm } from "@/components/admin/BudgetForm";
import { Ring } from "@/components/admin/charts";
import { Card, CardHeader, ErrorBox, fmtDate, fmtNum, fmtUsd } from "@/components/admin/ui";
import { getBudgetSettings, higgsfieldBudget, requireAdmin } from "@/lib/admin";

export default async function AdminHiggsfield() {
  let settings, b;
  try {
    await requireAdmin();
    settings = await getBudgetSettings();
    b = await higgsfieldBudget(settings);
  } catch (e) {
    return <><AdminTopBar title="Higgsfield" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref="/admin/higgsfield" /></>;
  }
  return (
    <>
      <AdminTopBar title="Higgsfield et coûts" subtitle="Le budget restant est calculé à partir des pubs et images créées depuis la dernière recharge" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader icon={<Wallet />} title="Budget Higgsfield" />
          <div className="flex items-center gap-5">
            <Ring pct={b.configured ? 100 - b.usedPct : 0} size={96} color={b.low ? "#ef4444" : "#22c55e"} />
            <div>
              <p className="text-[12px] text-white/45">Restant estimé</p>
              <p className={`text-3xl font-semibold tabular-nums ${b.low ? "text-red-400" : ""}`}>{b.configured ? fmtUsd(b.leftUsd) : "—"}</p>
              <p className="mt-1 text-[12px] text-white/70">{fmtUsd(b.spentUsd)} dépensés sur {fmtUsd(b.budgetUsd)} depuis le {fmtDate(settings.hfBudgetSince)}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-[12px]">
            {[["Pubs créées", `${fmtNum(b.videos)} · ${fmtUsd(b.videoUsd)}`], ["Images créées", `${fmtNum(b.images)} · ${fmtUsd(b.imagesUsd)}`], ["Autres dépenses", fmtUsd(settings.hfOtherSpendUsd)], ["Seuil d'alerte", fmtUsd(settings.hfAlertUsd)]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.03] p-3"><dt className="text-white/45">{k}</dt><dd className="mt-0.5 text-[14px] font-medium">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-white/45">
            Higgsfield ne donne pas de solde lisible par l&apos;app : ce montant est une estimation à partir du coût réel par seconde de chaque style (page « Styles et tarifs »).
            Compare-le de temps en temps avec le solde de ton compte Higgsfield. Ce compte est aussi utilisé par marketing-studio : ajoute ses dépenses dans « Autres dépenses ».
          </p>
        </Card>
        <Card>
          <CardHeader icon={<Wallet />} title="Réglages" />
          <BudgetForm initial={settings} />
        </Card>
      </div>
    </>
  );
}
