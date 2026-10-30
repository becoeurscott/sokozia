"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Smartphone, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client/api";
import { useWallet } from "@/lib/client/useWallet";
import { formatEur, formatFcfa, videoPrice } from "@/lib/models";
import { COUNTRY_CURRENCY, PAY_COUNTRIES, localAmount } from "@/lib/pricing";
import { TOPUP_PACKS, topupCardCents, topupFcfa, type HistoryItem, type TopupUnits } from "@/lib/wallet";
import { savedCountry } from "@/components/studio/BriefCard";
import { Spinner } from "@/components/ui/Spinner";

const STATUS: Record<HistoryItem["status"], string> = { pending: "En attente", completed: "Payé", failed: "Échoué", expired: "Expiré" };

/** Balance, top-up packs and the full transaction history. */
export function WalletPanel() {
  const { balance, history, error } = useWallet();
  const [units, setUnits] = React.useState<TopupUnits>(5);
  const [method, setMethod] = React.useState<"mobile" | "card">("mobile");
  const [country, setCountry] = React.useState("CMR");
  const [busy, setBusy] = React.useState(false);
  const [topupError, setTopupError] = React.useState<string | null>(null);
  React.useEffect(() => setCountry(savedCountry()), []);

  const fcfa = topupFcfa(units);
  const local = localAmount(country, fcfa);
  const charged = method === "card" ? formatEur(topupCardCents(units)) : local.currency === "XAF" || local.currency === "XOF" ? formatFcfa(fcfa) : `${local.amount.toLocaleString("fr-FR")} ${local.currency}`;

  async function topup() {
    setBusy(true);
    setTopupError(null);
    try {
      const { redirectUrl } = await api<{ redirectUrl: string }>("/api/wallet/topup", { method: "POST", json: { units, method, country } });
      window.location.href = redirectUrl;
    } catch (e) {
      setTopupError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  }

  const per15 = videoPrice(15);
  return (
    <>
      <section id="portefeuille" className="mt-10 scroll-mt-6">
        <h2 className="text-lg font-bold">Mon portefeuille</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Wallet className="h-4 w-4 text-brand" /> Solde disponible
            </div>
            <div className="mt-2 text-3xl font-extrabold">{balance === null ? <Spinner className="h-6 w-6" /> : formatFcfa(balance)}</div>
            {balance !== null && (
              <p className="mt-1 text-sm text-muted">
                {balance >= per15 ? `Environ ${Math.floor(balance / per15)} vidéo${Math.floor(balance / per15) > 1 ? "s" : ""} de 15 s.` : "Recharge pour payer tes vidéos en un clic."}
              </p>
            )}
            <p className="mt-3 text-xs text-muted">Au moment de créer une vidéo, choisis « Mon solde » : elle part tout de suite, sans repasser par le paiement.</p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="text-sm font-semibold">Recharger</div>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Montant de la recharge">
              {TOPUP_PACKS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={units === n}
                  onClick={() => setUnits(n)}
                  className={`rounded-xl border p-2.5 text-left transition ${units === n ? "border-brand bg-brand-soft/60" : "border-line hover:bg-hover"}`}
                >
                  <div className="text-sm font-bold">{n} vidéos</div>
                  <div className="text-xs text-muted">{formatFcfa(topupFcfa(n))}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 inline-flex rounded-pill border border-line bg-bg p-0.5" role="radiogroup" aria-label="Moyen de paiement">
              {(
                [
                  ["mobile", "Mobile Money", Smartphone],
                  ["card", "Carte bancaire", CreditCard],
                ] as const
              ).map(([m, label, Icon]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={`flex h-8 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold transition ${method === m ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            {method === "mobile" ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                Pays
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-8 rounded-lg border border-line bg-card px-2 text-sm text-ink outline-none focus:border-brand" aria-label="Pays du compte Mobile Money">
                  {PAY_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_CURRENCY[c].flag} {COUNTRY_CURRENCY[c].label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-2 text-xs text-muted">Visa, Mastercard · payé en euros, sécurisé par Stripe</p>
            )}
            <button
              onClick={topup}
              disabled={busy}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {busy && <Spinner />} Payer {charged} · +{formatFcfa(fcfa)} sur mon solde
            </button>
            {topupError && <p className="mt-2 text-sm text-red-600">{topupError}</p>}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Historique des transactions</h2>
        <p className="mt-1 text-sm text-muted">Recharges, vidéos payées avec ton solde ou directement, et paiements en attente ou échoués.</p>
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : history === null ? (
          <Spinner className="mt-4 h-6 w-6" />
        ) : history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune transaction pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {history.map((h) => {
              const credit = h.amount > 0;
              const done = h.status === "completed";
              return (
                <li key={h.id} className="flex items-start gap-3 p-3 text-sm">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${credit ? "bg-accent-soft text-accent" : "bg-bg text-ink/70"}`}>
                    {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {h.threadId ? (
                        <Link href={`/studio/c/${h.threadId}`} className="hover:underline">
                          {h.label}
                        </Link>
                      ) : (
                        h.label
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(h.date).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} · {h.method}
                      {h.charged ? ` · ${h.charged}` : ""}
                    </div>
                    {!done && (
                      <div className="mt-1">
                        <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold ${h.status === "pending" ? "bg-brand-soft text-brand" : "bg-red-50 text-red-700"}`}>{STATUS[h.status]}</span>
                        {h.failure && <span className="ml-2 text-xs text-muted">{h.failure}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${!done ? "text-muted line-through decoration-1" : credit ? "text-accent" : ""}`}>
                      {credit ? "+" : "−"}
                      {formatFcfa(Math.abs(h.amount))}
                    </div>
                    {h.balanceAfter !== null && h.balanceAfter !== undefined && <div className="text-xs text-muted">Solde {formatFcfa(h.balanceAfter)}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
