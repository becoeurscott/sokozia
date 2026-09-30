import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminClient, getSession } from "@/lib/insforge";
import { fmt, loadPricing, planPrice } from "@/lib/pricing";

async function requireAdmin() {
  const { profile } = await getSession();
  if (!profile?.is_admin) redirect("/");
}

async function saveStyle(form: FormData) {
  "use server";
  await requireAdmin();
  const params = String(form.get("apiframe_params") || "{}");
  await adminClient().database.from("styles").update({
    name_fr: String(form.get("name_fr")),
    description_fr: String(form.get("description_fr")),
    apiframe_model: String(form.get("apiframe_model")),
    apiframe_params: JSON.parse(params),
    cost_usd_per_s: Number(form.get("cost_usd_per_s")),
    durations: JSON.parse(String(form.get("durations") || "[15]")),
    params_key: String(form.get("params_key")),
    image_key: String(form.get("image_key")),
    active: form.get("active") === "on",
  }).eq("id", String(form.get("id")));
  revalidatePath("/", "layout");
}

async function saveSettings(form: FormData) {
  "use server";
  await requireAdmin();
  const db = adminClient().database;
  for (const key of ["multipliers", "monthly_videos", "fx"]) {
    await db.from("settings").update({ value: JSON.parse(String(form.get(key))) }).eq("key", key);
  }
  revalidatePath("/", "layout");
}

export default async function Page() {
  await requireAdmin();
  const db = adminClient().database;
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: payments }, { data: users }, { data: vids30 }] = await Promise.all([
    db.from("payments").select("id, created_at, plan, style_id, duration_s, amount, currency, status, correspondent, phone").order("created_at", { ascending: false }).limit(200),
    db.from("profiles").select("id"),
    db.from("videos").select("status").gt("created_at", since30),
  ]);
  const paid = (payments ?? []).filter((p) => p.status === "completed");
  const revenue = paid.filter((p) => p.created_at > since30).reduce<Record<string, number>>((r, p) => ({ ...r, [p.currency]: (r[p.currency] ?? 0) + p.amount }), {});
  const vstat = (vids30 ?? []).reduce<Record<string, number>>((r, v) => ({ ...r, [v.status]: (r[v.status] ?? 0) + 1 }), {});
  const [{ data: styles }, { data: settings }, { data: videos }, pricing] = await Promise.all([
    db.from("styles").select("*").order("sort"),
    db.from("settings").select("key, value"),
    db.from("videos").select("id, status, video_url, style_id, prompt, created_at").order("created_at", { ascending: false }).limit(60),
    loadPricing(),
  ]);
  const s = Object.fromEntries((settings ?? []).map((r: { key: string; value: unknown }) => [r.key, JSON.stringify(r.value)]));

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <h1 className="text-3xl font-extrabold">Admin</h1>

      <section>
        <h2 className="mb-3 text-xl font-bold">Activité (30 derniers jours)</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="card"><p className="text-xs text-muted">Chiffre d&apos;affaires</p><p className="text-xl font-extrabold">{Object.entries(revenue).map(([c, a]) => fmt(a, c)).join(" · ") || "0"}</p></div>
          <div className="card"><p className="text-xs text-muted">Paiements réussis</p><p className="text-xl font-extrabold">{paid.filter((p) => p.created_at > since30).length}</p></div>
          <div className="card"><p className="text-xs text-muted">Comptes</p><p className="text-xl font-extrabold">{users?.length ?? 0}</p></div>
          <div className="card"><p className="text-xs text-muted">Pubs créées / échouées</p><p className="text-xl font-extrabold">{vstat.ready ?? 0} / {vstat.failed ?? 0}</p></div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs text-muted"><tr><th className="p-3">Date</th><th className="p-3">Offre</th><th className="p-3">Montant</th><th className="p-3">Opérateur</th><th className="p-3">Téléphone</th><th className="p-3">Statut</th></tr></thead>
            <tbody>
              {(payments ?? []).slice(0, 30).map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3">{p.plan} · {p.style_id} {p.duration_s} s</td>
                  <td className="p-3 whitespace-nowrap">{fmt(p.amount, p.currency)}</td>
                  <td className="p-3">{p.correspondent ?? "—"}</td>
                  <td className="p-3">{p.phone ?? "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "completed" ? "bg-accent/10 text-accent" : p.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{{ completed: "payé", failed: "échoué", pending: "en attente" }[p.status as string] ?? p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Styles (modèles cachés aux clients)</h2>
        <p className="mb-3 text-sm text-muted">Prix client = coût réel $/s × durée × multiplicateur, converti et arrondi. Mets le coût réel selon ta facture APIFrame.</p>
        <div className="space-y-3">
          {(styles ?? []).map((st) => (
            <form key={st.id} action={saveStyle} className="card grid gap-2 text-sm sm:grid-cols-4">
              <input type="hidden" name="id" value={st.id} />
              <label>Nom<input name="name_fr" defaultValue={st.name_fr} className="input" /></label>
              <label>Modèle APIFrame<input name="apiframe_model" defaultValue={st.apiframe_model} className="input" /></label>
              <label>Objet params<input name="params_key" defaultValue={st.params_key} className="input font-mono" /></label>
              <label>Champ image<input name="image_key" defaultValue={st.image_key} className="input font-mono" /></label>
              <label>Paramètres (JSON)<input name="apiframe_params" defaultValue={JSON.stringify(st.apiframe_params)} className="input font-mono" /></label>
              <label>Coût réel $ / seconde<input name="cost_usd_per_s" type="number" step="0.01" defaultValue={st.cost_usd_per_s} className="input" /></label>
              <label className="sm:col-span-2">Description<input name="description_fr" defaultValue={st.description_fr} className="input" /></label>
              <label>Durées (JSON)<input name="durations" defaultValue={JSON.stringify(st.durations)} className="input font-mono" /></label>
              <p className="text-muted sm:col-span-3">
                {(st.durations as number[]).map((d) => { const ps = { ...st, cost_usd_per_s: Number(st.cost_usd_per_s) }; return <span key={d} className="block">{d} s (coût {(ps.cost_usd_per_s * d).toFixed(2)} $) — 1 pub : {fmt(planPrice(pricing, "single", ps, d, "XAF"), "XAF")} · pack 5 : {fmt(planPrice(pricing, "pack5", ps, d, "XAF"), "XAF")} · mensuel : {fmt(planPrice(pricing, "monthly", ps, d, "XAF"), "XAF")}</span>; })}
              </p>
              <div className="flex items-center justify-end gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={st.active} /> Actif</label>
                <button className="btn !py-2">Enregistrer</button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Réglages de prix</h2>
        <form action={saveSettings} className="card grid gap-3 text-sm sm:grid-cols-2">
          <label>Multiplicateurs (unité / pack5 / mensuel)<input name="multipliers" defaultValue={s.multipliers} className="input font-mono" /></label>
          <label>Vidéos par abonnement mensuel<input name="monthly_videos" defaultValue={s.monthly_videos} className="input font-mono" /></label>
          <label>Taux de change (1 $ =)<input name="fx" defaultValue={s.fx} className="input font-mono" /></label>
          <div className="sm:col-span-2"><button className="btn">Enregistrer</button></div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Bibliothèque (toutes les vidéos — propriété Sokozia)</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(videos ?? []).map((v) => (
            <div key={v.id} className="card text-xs">
              {v.video_url ? <video src={v.video_url} controls preload="metadata" className="aspect-[9/16] w-full rounded-lg bg-black" /> : <p className="text-muted">{v.status}</p>}
              <p className="mt-2 line-clamp-3 text-muted">{v.prompt}</p>
              <p className="mt-1 font-semibold">{v.style_id} · {new Date(v.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
