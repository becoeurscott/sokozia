import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Mail, ShieldCheck } from "lucide-react";
import { adminClient, getSession } from "@/lib/insforge";
import { activePasses } from "@/lib/passes";
import { COUNTRIES, fmt, PLAN_LABELS, type Plan } from "@/lib/pricing";
import { LEGAL } from "@/content/legal";
import ProfileForm from "@/components/ProfileForm";
import { signOut } from "../actions";

export const metadata = { title: "Mon compte — Sokozia" };

const STATUS: Record<string, [string, string]> = {
  completed: ["Payé", "bg-accent/10 text-accent"],
  failed: ["Échoué", "bg-red-50 text-red-700"],
  pending: ["En attente", "bg-amber-50 text-amber-800"],
};

export default async function Page() {
  const { user, profile } = await getSession();
  if (!user || !profile) redirect("/connexion?next=/compte");
  const db = adminClient().database;
  const [passes, { data: payments }, { data: styles }] = await Promise.all([
    activePasses(profile.id),
    db.from("payments").select("id, created_at, plan, style_id, duration_s, amount, currency, status").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30),
    db.from("styles").select("id, name_fr"),
  ]);
  const styleName = Object.fromEntries((styles ?? []).map((s: { id: string; name_fr: string }) => [s.id, s.name_fr]));
  const u = user as { email?: string; providers?: string[]; createdAt?: string; created_at?: string };
  const google = (u.providers ?? []).includes("google");
  const since = u.createdAt ?? u.created_at;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Mon compte</h1>
          {since && <p className="text-sm text-muted">Membre depuis le {new Date(since).toLocaleDateString("fr-FR")}</p>}
        </div>
        <Link href="/tableau-de-bord" className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold">← Tableau de bord</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="card">
          <h2 className="mb-4 text-lg font-bold">Mes informations</h2>
          <ProfileForm name={profile.full_name} country={profile.country} phone={profile.phone}
            countries={Object.entries(COUNTRIES).map(([k, c]) => [k, `${c.name} (${c.currency === "XAF" || c.currency === "XOF" ? "FCFA" : c.currency})`])} />
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Connexion</h2>
            <p className="flex items-center gap-2 text-sm"><Mail size={16} className="text-muted" /> {u.email}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} /> {google ? "Connecté avec Google" : "Connexion par e-mail et mot de passe"}</p>
            <form action={signOut} className="mt-4">
              <button className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"><LogOut size={15} /> Se déconnecter</button>
            </form>
          </section>

          <section className="card">
            <h2 className="mb-3 text-lg font-bold">Mes pubs restantes</h2>
            {passes.length ? (
              <ul className="space-y-2 text-sm">
                {passes.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-xl bg-bg px-3 py-2">
                    <span>{styleName[p.style_id] ?? p.style_id} · {p.duration_s} s</span><b>{p.remaining}/{p.total}</b>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Aucun pack actif.</p>}
            <Link href="/tarifs" className="mt-3 block text-sm font-semibold text-brand">Acheter un pack →</Link>
          </section>
        </div>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Historique des paiements</h2>
        {payments?.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-muted"><tr><th className="px-5 py-2">Date</th><th className="px-2 py-2">Offre</th><th className="px-2 py-2">Montant</th><th className="px-5 py-2">Statut</th></tr></thead>
              <tbody>
                {payments.map((p) => {
                  const [label, cls] = STATUS[p.status] ?? [p.status, "bg-bg text-muted"];
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="whitespace-nowrap px-5 py-2.5">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="px-2 py-2.5">{PLAN_LABELS[p.plan as Plan] ?? p.plan} · {styleName[p.style_id] ?? p.style_id} {p.duration_s} s</td>
                      <td className="whitespace-nowrap px-2 py-2.5">{fmt(p.amount, p.currency)}</td>
                      <td className="px-5 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted">Aucun paiement pour l&apos;instant.</p>}
        <p className="mt-3 text-xs text-muted">Un problème avec un paiement ? Écris-nous à <a href={`mailto:${LEGAL.email}`} className="underline">{LEGAL.email}</a> avec la date et le numéro utilisé.</p>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Mes données</h2>
        <p className="text-sm text-muted">
          Consulte nos <Link href="/cgu" className="underline">conditions générales</Link> et notre <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
        </p>
        <a href={`mailto:${LEGAL.email}?subject=${encodeURIComponent("Suppression de mon compte Sokozia")}&body=${encodeURIComponent(`Bonjour, je souhaite supprimer mon compte associé à l'adresse ${u.email}.`)}`}
          className="mt-3 inline-block text-sm font-semibold text-red-700 underline">Demander la suppression de mon compte</a>
      </section>
    </div>
  );
}
