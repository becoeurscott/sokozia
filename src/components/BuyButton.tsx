"use client";

import { useState } from "react";

export default function BuyButton({ plan, styleId, duration, loggedIn }: { plan: string; styleId: string; duration: number; loggedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function buy() {
    if (!loggedIn) return (window.location.href = "/inscription");
    setBusy(true);
    const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, styleId, duration }) })
      .then((r) => r.json()).catch(() => ({ error: "Connexion perdue." }));
    if (r.url) window.location.href = r.url;
    else { setBusy(false); setError(r.error); }
  }
  return (
    <>
      <button onClick={buy} disabled={busy} className="btn w-full">{busy ? "Redirection…" : "Payer"}</button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </>
  );
}
