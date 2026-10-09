"use client";

import { useState } from "react";
import { PayMethod, type PayMethodKind } from "./PayMethod";

export default function BuyButton({ plan, styleId, duration, loggedIn, price }: { plan: string; styleId: string; duration: number; loggedIn: boolean; price?: string }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  async function pay(method: PayMethodKind) {
    setBusy(true); setError(undefined);
    const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, styleId, duration, method }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    if (r.url) window.location.href = r.url;
    else { setBusy(false); setOpen(false); setError(r.error); }
  }
  return (
    <>
      <button onClick={() => (loggedIn ? setOpen(true) : (window.location.href = "/inscription"))} disabled={busy} className="btn w-full">{busy ? "Redirection…" : "Payer"}</button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <PayMethod open={open} busy={busy} price={price} onPick={pay} onClose={() => !busy && setOpen(false)} />
    </>
  );
}
