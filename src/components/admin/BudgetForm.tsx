"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveBudget } from "@/app/admin/actions";
import type { BudgetSettings } from "@/lib/admin";

const FIELDS: { key: keyof BudgetSettings; label: string; hint: string; type: "number" | "date"; step?: string }[] = [
  { key: "hfBudgetUsd", label: "Montant rechargé sur Higgsfield ($)", hint: "Total chargé sur le compte API depuis la date ci-dessous.", type: "number", step: "0.01" },
  { key: "hfBudgetSince", label: "Date de la recharge", hint: "Les dépenses sont comptées à partir de ce jour.", type: "date" },
  { key: "imageCostUsd", label: "Coût d'une image ($)", hint: "Fiche produit, lieux, aperçu… (Marketing Studio 1K ≈ 0,12 $).", type: "number", step: "0.01" },
  { key: "hfOtherSpendUsd", label: "Autres dépenses Higgsfield ($)", hint: "Tests ou générations faites hors de l'app.", type: "number", step: "0.01" },
  { key: "hfAlertUsd", label: "Alerte quand il reste moins de ($)", hint: "Affiche une alerte rouge sur la vue d'ensemble.", type: "number", step: "1" },
  { key: "usdToXof", label: "1 $ = … FCFA", hint: "Pour calculer la marge en FCFA.", type: "number", step: "1" },
];

export function BudgetForm({ initial }: { initial: BudgetSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])));
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = FIELDS.filter((f) => values[f.key] !== String(initial[f.key]));
  const save = () => start(async () => {
    const patch = Object.fromEntries(changed.map((f) => [f.key, f.type === "number" ? Number(values[f.key]) : values[f.key]])) as Partial<BudgetSettings>;
    const r = await saveBudget(patch);
    setNotice(r.ok ? { ok: true, text: r.message ?? "Enregistré." } : { ok: false, text: r.error ?? "Échec." });
    if (r.ok) router.refresh();
  });
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[12px] font-medium text-white/70">{f.label}</span>
            <input type={f.type} step={f.step} min={f.type === "number" ? 0 : undefined} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0b0b] px-3 text-[13px] text-white outline-none [color-scheme:dark] focus:border-white/25" />
            <span className="mt-1 block text-[11px] text-white/45">{f.hint}</span>
          </label>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed.length} className="h-10 rounded-xl bg-white px-5 text-[13px] font-medium text-black disabled:opacity-40">{pending ? "Enregistrement…" : "Enregistrer"}</button>
        {changed.length > 0 && <span className="text-[12px] text-white/45">{changed.length} modification(s) non enregistrée(s)</span>}
      </div>
      {notice && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-[12px] ${notice.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{notice.text}</p>}
    </div>
  );
}
