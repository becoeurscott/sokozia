import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activeCredits } from "@/lib/services/credits";
import type { Order } from "@/lib/types";
import { STYLES, formatFcfa } from "@/lib/models";
import { PACKS } from "@/lib/pricing";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte · Sokozia" };

const STATUS: Record<Order["status"], string> = { pending: "En attente", completed: "Payé", failed: "Échoué", expired: "Expiré" };

export default async function ComptePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/compte");
  const db = await getDb();
  const [credits, orders] = await Promise.all([activeCredits(user.id), db.list<Order>("orders", { user_id: user.id }, { orderBy: "created_at", ascending: false, limit: 50 })]);

  return (
    <main className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-bg/85">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/studio" />
          <Button href="/studio" variant="outline" size="sm">
            ← Retour au studio
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Mon compte</h1>
        <p className="mt-1 text-muted">
          {user.name ? `${user.name} · ` : ""}
          {user.email}
        </p>

        <h2 className="mt-10 text-lg font-bold">Mes crédits</h2>
        {credits.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Aucun crédit actif.{" "}
            <Link href="/studio/modeles" className="font-semibold text-brand hover:underline">
              Voir les packs
            </Link>
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {credits.map((c) => (
              <div key={c.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="text-sm text-muted">{STYLES[c.style].name}</div>
                <div className="text-2xl font-extrabold">
                  {c.remaining} <span className="text-sm font-medium text-muted">/ {c.total} vidéos</span>
                </div>
                {c.expires_at && <div className="text-xs text-muted">Expire le {new Date(c.expires_at).toLocaleDateString("fr-FR")}</div>}
              </div>
            ))}
          </div>
        )}

        <h2 className="mt-10 text-lg font-bold">Mes paiements</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Aucun paiement pour l&apos;instant.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card">
            <table className="w-full text-sm">
              <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Formule</th>
                  <th className="p-3">Montant</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-3 text-muted">{new Date(o.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3">
                      {PACKS[o.kind].name} · {STYLES[o.style].name}
                      {o.duration ? ` · ${o.duration} s` : ""}
                    </td>
                    <td className="p-3 font-semibold">{formatFcfa(o.amount)}</td>
                    <td className="p-3">
                      <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${o.status === "completed" ? "bg-accent-soft text-accent" : o.status === "pending" ? "bg-brand-soft text-brand" : "bg-red-50 text-red-700"}`}>{STATUS[o.status]}</span>
                      {o.status === "pending" && o.redirect_url && (
                        <a href={o.redirect_url} className="ml-2 text-xs font-semibold text-brand hover:underline">
                          Payer
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
