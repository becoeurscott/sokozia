"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { recheckPayment, refundVideo } from "@/app/admin/actions";

const btn = "rounded-lg border border-white/10 px-2.5 py-1.5 text-[12px] text-white/70 hover:border-white/25 hover:text-white disabled:opacity-40";

export function RefundButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () => {
    const reason = prompt("Rendre cette pub au client (il pourra en recréer une du même style et de la même durée). Raison :", "Résultat de mauvaise qualité");
    if (reason === null) return;
    start(async () => { const r = await refundVideo(videoId, reason); if (!r.ok) alert(r.error ?? "Échec."); router.refresh(); });
  };
  return <button type="button" onClick={run} disabled={pending} className={btn}>{pending ? "…" : "Rendre la pub"}</button>;
}

export function RecheckButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () => start(async () => { const r = await recheckPayment(paymentId); alert(r.ok ? r.message : r.error); router.refresh(); });
  return <button type="button" onClick={run} disabled={pending} className={btn}>{pending ? "…" : "Revérifier"}</button>;
}
