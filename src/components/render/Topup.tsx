"use client";

import { useState } from "react";
import { CreditCard, Smartphone, X } from "lucide-react";

const PRESETS = [2000, 5000, 10000, 25000];
const nf = (n: number) => n.toLocaleString("fr-FR");

/** Recharge du portefeuille : montant puis moyen de paiement (Mobile Money → pawaPay, carte → Stripe). */
export function TopupSheet({ open, onClose, need, currencyLabel = "FCFA" }: { open: boolean; onClose: () => void; need?: number; currencyLabel?: string }) {
  const [amount, setAmount] = useState(need ? Math.max(1000, Math.ceil(need / 500) * 500) : 5000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!open) return null;
  async function pay(method: "mobile" | "card") {
    setBusy(true); setError(undefined);
    const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "topup", topup: amount, method }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    if (r.url) { window.location.href = r.url; return; }
    setBusy(false); setError(r.error ?? "Le paiement n'a pas pu démarrer.");
  }
  const opt = "flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left transition hover:border-brand disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-t-3xl bg-bg p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-bold">Recharger mon solde</p>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 hover:bg-black/5"><X size={18} /></button>
        </div>
        {need ? <p className="mb-3 rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">Il te manque {nf(need)} {currencyLabel} pour cette vidéo.</p> : null}
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setAmount(p)} className={`rounded-xl border py-2.5 text-sm font-semibold ${amount === p ? "border-brand bg-brand/10 text-brand" : "border-line bg-card"}`}>{nf(p)}</button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 focus-within:border-brand">
          <input inputMode="numeric" value={amount ? nf(amount) : ""} onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)} className="w-full bg-transparent text-lg font-bold outline-none" aria-label="Montant" />
          <span className="text-sm text-muted">{currencyLabel}</span>
        </label>
        <p className="mt-1 text-xs text-muted">De 1 000 à 1 000 000 {currencyLabel}. Ton solde n&apos;expire pas.</p>
        <div className="mt-4 space-y-3">
          <button disabled={busy || amount < 1000} onClick={() => pay("mobile")} className={opt}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Smartphone size={22} /></span>
            <span><b className="block">Mobile Money</b><span className="text-sm text-muted">Orange, MTN, Moov, Wave, Airtel, M-Pesa</span></span>
          </button>
          <button disabled={busy || amount < 1000} onClick={() => pay("card")} className={opt}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink/5 text-ink"><CreditCard size={22} /></span>
            <span><b className="block">Carte bancaire</b><span className="text-sm text-muted">Visa, Mastercard · paiement sécurisé</span></span>
          </button>
        </div>
        {busy && <p className="mt-4 text-center text-sm text-muted">Redirection vers le paiement…</p>}
        {error && <p className="mt-3 text-center text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
