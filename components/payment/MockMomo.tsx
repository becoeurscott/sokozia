"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Smartphone } from "lucide-react";
import { api } from "@/lib/client/api";
import type { Order } from "@/lib/types";
import { formatFcfa } from "@/lib/models";
import { Spinner } from "@/components/ui/Spinner";

/** Stand-in for the pawaPay hosted page while MOCK_PROVIDERS=1. */
export function MockMomo() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const returnUrl = params.get("return") || "/studio";
  const [order, setOrder] = React.useState<Order | null>(null);
  const [phone, setPhone] = React.useState("237 6 53 45 67 89");
  const [provider, setProvider] = React.useState("MTN MoMo");
  const [busy, setBusy] = React.useState<null | "completed" | "failed">(null);

  React.useEffect(() => {
    if (orderId) api<{ order: Order }>(`/api/orders/${orderId}`).then((d) => setOrder(d.order)).catch(() => null);
  }, [orderId]);

  async function finish(outcome: "completed" | "failed") {
    if (!orderId) return;
    setBusy(outcome);
    await new Promise((r) => setTimeout(r, 1200));
    await api(`/api/orders/${orderId}/simulate`, { method: "POST", json: { outcome } });
    window.location.href = returnUrl;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#1b1b1f] px-4 text-white">
      <div className="w-full max-w-sm rounded-3xl bg-[#26262c] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between text-xs text-white/60">
          <span>Simulateur de paiement</span>
          <span className="rounded-pill bg-yellow-400/20 px-2 py-0.5 font-semibold text-yellow-300">MODE TEST</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold">Sokozia</div>
            <div className="text-sm text-white/60">{order ? formatFcfa(order.amount) : "…"}</div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <label className="block text-xs text-white/60">
            Opérateur
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-white/10 px-3 text-white outline-none">
              {["MTN MoMo", "Orange Money", "Moov", "Wave", "Airtel", "M-Pesa"].map((p) => (
                <option key={p} className="text-black">
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/60">
            Numéro
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-white/10 px-3 text-white outline-none" />
          </label>
        </div>
        <button onClick={() => finish("completed")} disabled={!!busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-brand font-semibold disabled:opacity-60">
          {busy === "completed" && <Spinner />} Confirmer le paiement
        </button>
        <button onClick={() => finish("failed")} disabled={!!busy} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-pill text-sm text-white/60 hover:text-white disabled:opacity-60">
          {busy === "failed" && <Spinner />} Refuser (tester un échec)
        </button>
        <p className="mt-4 text-center text-[11px] text-white/40">En production, cette page est remplacée par la page de paiement pawaPay.</p>
      </div>
    </main>
  );
}
