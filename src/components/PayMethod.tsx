"use client";

import { CreditCard, Smartphone, X } from "lucide-react";

export type PayMethodKind = "mobile" | "card";

/** Choix du moyen de paiement avant la redirection (pawaPay ou Stripe). */
export function PayMethod({ open, busy, price, onPick, onClose }: { open: boolean; busy?: boolean; price?: string; onPick: (m: PayMethodKind) => void; onClose: () => void }) {
  if (!open) return null;
  const opt = "flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left transition hover:border-brand disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-[var(--color-bg,#fff)] p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">Comment veux-tu payer ?</p>
            {price && <p className="text-sm text-muted">Total : {price}</p>}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 hover:bg-black/5"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <button disabled={busy} onClick={() => onPick("mobile")} className={opt}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Smartphone size={22} /></span>
            <span><b className="block">Mobile Money</b><span className="text-sm text-muted">Orange, MTN, Moov, Wave, Airtel, M-Pesa</span></span>
          </button>
          <button disabled={busy} onClick={() => onPick("card")} className={opt}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink/5 text-ink"><CreditCard size={22} /></span>
            <span><b className="block">Carte bancaire</b><span className="text-sm text-muted">Visa, Mastercard · paiement sécurisé</span></span>
          </button>
        </div>
        {busy && <p className="mt-4 text-center text-sm text-muted">Redirection vers le paiement…</p>}
      </div>
    </div>
  );
}
