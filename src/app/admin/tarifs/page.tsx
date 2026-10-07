import { BadgeDollarSign, SlidersHorizontal } from "lucide-react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { Badge, Card, CardHeader, ErrorBox, fmtUsd, fmtXof } from "@/components/admin/ui";
import { getBudgetSettings, requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/insforge";
import { hfEstimate } from "@/lib/higgsfield";
import { loadPricing, planVideos, videoPrice, type Plan } from "@/lib/pricing";
import { savePricing, saveStyle } from "../actions";

export const dynamic = "force-dynamic";
const PLANS: Plan[] = ["single", "pack5", "monthly"];
const field = "h-9 w-full rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-2.5 text-[12px] text-white outline-none focus:border-white/25";

type StyleFull = { id: string; name_fr: string; description_fr: string; quality_fr: string; provider: string; hf_endpoint: string | null; hf_params: Record<string, unknown>; cost_usd_per_s: number; durations: number[]; active: boolean; sort: number };

export default async function AdminPricing() {
  let pricing, budget, styles: StyleFull[], settings: Record<string, string>;
  try {
    await requireAdmin();
    [pricing, budget] = await Promise.all([loadPricing(), getBudgetSettings()]);
    const db = adminClient().database;
    const [{ data: st }, { data: se }] = await Promise.all([db.from("styles").select("*").order("sort"), db.from("settings").select("key, value").in("key", ["multipliers", "monthly_videos", "fx"])]);
    styles = (st ?? []) as StyleFull[];
    settings = Object.fromEntries((se ?? []).map((r: { key: string; value: unknown }) => [r.key, JSON.stringify(r.value)]));
  } catch (e) {
    return <><AdminTopBar title="Styles et tarifs" /><ErrorBox message={e instanceof Error ? e.message : "erreur"} retryHref="/admin/tarifs" /></>;
  }

  // Prix réel demandé à Higgsfield (estimation gratuite, rien n'est généré).
  const live = await Promise.all(styles.filter((s) => s.active).flatMap((s) => (s.durations as number[]).map(async (d) => {
    if (s.provider !== "higgsfield" || !s.hf_endpoint) return { id: s.id, d, usd: null as number | null };
    const ref = "https://h8fj6hqu.insforge.site/creators/creator_maya/sheet.jpg";
    const r = await hfEstimate(s.hf_endpoint, { prompt: "estimate", duration: d, aspect_ratio: "9:16", ...(s.hf_params ?? {}), ...(s.hf_endpoint.includes("reference") ? { image_urls: [ref] } : s.hf_endpoint.includes("image-to-video") ? { image_url: ref } : {}) }).catch(() => null);
    return { id: s.id, d, usd: r && r.ok && Number.isFinite(r.usd) ? r.usd : null };
  })));

  return (
    <>
      <AdminTopBar title="Styles et tarifs" pill={`×${pricing.multipliers.single} unité · ×${pricing.multipliers.pack5} pack · ×${pricing.multipliers.monthly} mensuel`}
        subtitle="Coût réel Higgsfield (estimé en direct, gratuit) comparé aux prix de vente et à la marge" />

      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="px-4 pt-4 sm:px-5"><CardHeader icon={<BadgeDollarSign />} title="Marges par style et durée (FCFA)" /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead className="bg-[#121212] text-left text-[11px] uppercase tracking-wide text-white/45">
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 font-medium">Style</th><th className="px-4 py-3 text-right font-medium">Coût réglé</th><th className="px-4 py-3 text-right font-medium">Prix Higgsfield en direct</th>
                {PLANS.map((p) => <th key={p} className="px-4 py-3 text-right font-medium">{({ single: "1 pub", pack5: "Pack 5 (par pub)", monthly: "Mensuel (par pub)" } as Record<Plan, string>)[p]}</th>)}
              </tr>
            </thead>
            <tbody>
              {pricing.styles.flatMap((s) => s.durations.map((d) => {
                const cost = s.cost_usd_per_s * d;
                const l = live.find((x) => x.id === s.id && x.d === d)?.usd ?? null;
                const drift = l !== null && Math.abs(l - cost) / Math.max(cost, 0.01) > 0.15;
                return (
                  <tr key={`${s.id}-${d}`} className="border-b border-white/[0.04]">
                    <td className="px-4 py-2.5 font-medium">{s.name_fr} <span className="text-white/45">· {d} s</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtUsd(cost)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{l === null ? <span className="text-white/45">au token</span> : <>{fmtUsd(l)} {drift && <Badge tone="red">écart</Badge>}</>}</td>
                    {PLANS.map((p) => {
                      const price = videoPrice(pricing, p, s, d, "XAF");
                      const realCost = (l ?? cost) * budget.usdToXof;
                      const m = price > 0 ? ((price - realCost) / price) * 100 : 0;
                      return <td key={p} className="px-4 py-2.5 text-right tabular-nums">{fmtXof(price)}<span className={`block text-[11px] ${m < 30 ? "text-red-400" : "text-emerald-400"}`}>marge {Math.round(m)} %</span></td>;
                    })}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[11px] text-white/45">« au token » : Higgsfield facture ce modèle au volume de vidéo, sans prix fixe estimable ; le coût réglé est utilisé. Un badge « écart » signale que le coût réglé diffère de plus de 15 % du prix réel : corrige-le ci-dessous. Abonnement : {planVideos(pricing, "monthly")} pubs.</p>
      </Card>

      <div className="mt-3 space-y-3">
        {styles.map((st) => (
          <Card key={st.id}>
            <form action={saveStyle} className="grid gap-2 text-[12px] sm:grid-cols-4">
              <input type="hidden" name="id" value={st.id} />
              <label className="text-white/70">Nom<input name="name_fr" defaultValue={st.name_fr} className={field} /></label>
              <label className="text-white/70">Fournisseur<select name="provider" defaultValue={st.provider} className={field}><option value="higgsfield">Higgsfield</option><option value="apiframe">APIFrame</option></select></label>
              <label className="text-white/70 sm:col-span-2">Modèle (endpoint Higgsfield)<input name="hf_endpoint" defaultValue={st.hf_endpoint ?? ""} className={`${field} font-mono`} /></label>
              <label className="text-white/70 sm:col-span-2">Description<input name="description_fr" defaultValue={st.description_fr} className={field} /></label>
              <label className="text-white/70 sm:col-span-2">Qualité (affichée au client)<input name="quality_fr" defaultValue={st.quality_fr} className={field} /></label>
              <label className="text-white/70">Paramètres (JSON)<input name="hf_params" defaultValue={JSON.stringify(st.hf_params ?? {})} className={`${field} font-mono`} /></label>
              <label className="text-white/70">Coût réel $ / seconde<input name="cost_usd_per_s" type="number" step="0.001" defaultValue={st.cost_usd_per_s} className={field} /></label>
              <label className="text-white/70">Durées (JSON)<input name="durations" defaultValue={JSON.stringify(st.durations)} className={`${field} font-mono`} /></label>
              <div className="flex items-end justify-end gap-3">
                <label className="flex items-center gap-2 text-white/70"><input type="checkbox" name="active" defaultChecked={st.active} /> Actif</label>
                <button className="h-9 rounded-lg bg-white px-4 text-[12px] font-medium text-black">Enregistrer</button>
              </div>
            </form>
          </Card>
        ))}
      </div>

      <Card className="mt-3">
        <CardHeader icon={<SlidersHorizontal />} title="Réglages de prix" />
        <form action={savePricing} className="grid gap-3 text-[12px] sm:grid-cols-2">
          <label className="text-white/70">Multiplicateurs (unité / pack5 / mensuel)<input name="multipliers" defaultValue={settings.multipliers} className={`${field} font-mono`} /></label>
          <label className="text-white/70">Pubs par abonnement mensuel<input name="monthly_videos" defaultValue={settings.monthly_videos} className={`${field} font-mono`} /></label>
          <label className="text-white/70 sm:col-span-2">Taux de change (1 $ = …)<input name="fx" defaultValue={settings.fx} className={`${field} font-mono`} /></label>
          <div className="sm:col-span-2"><button className="h-9 rounded-lg bg-white px-4 text-[12px] font-medium text-black">Enregistrer</button></div>
        </form>
      </Card>
    </>
  );
}
