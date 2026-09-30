"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PaymentStatus({ id }: { id: string }) {
  const [status, setStatus] = useState("pending");
  useEffect(() => {
    let tries = 0;
    const check = async () => {
      const r = await fetch(`/api/pay/status?id=${id}`).then((r) => r.json()).catch(() => ({}));
      if (r.status && r.status !== "pending") return setStatus(r.status);
      if (++tries < 40) setTimeout(check, 4000); else setStatus("slow");
    };
    check();
  }, [id]);
  if (status === "completed")
    return (<><h1 className="mt-3 text-2xl font-bold">Paiement reçu !</h1><p className="mt-2 text-muted">Ta pub ou ton pack est activé. Si tu as payé depuis le studio, ta pub est déjà en création.</p><Link href="/studio" className="btn mt-6">Aller au studio</Link></>);
  if (status === "failed")
    return (<><h1 className="mt-3 text-2xl font-bold">Paiement non abouti</h1><p className="mt-2 text-muted">Aucun montant n&apos;a été débité. Tu peux réessayer.</p><Link href="/tarifs" className="btn mt-6">Réessayer</Link></>);
  if (status === "slow")
    return (<><h1 className="text-2xl font-bold">Paiement en attente</h1><p className="mt-2 text-muted">Ton opérateur n&apos;a pas encore confirmé. Ton achat sera activé automatiquement dès confirmation.</p><Link href="/studio" className="btn mt-6">Retour au studio</Link></>);
  return (<><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" /><h1 className="mt-4 text-2xl font-bold">Confirmation du paiement…</h1><p className="mt-2 text-muted">Valide la demande sur ton téléphone si ce n&apos;est pas déjà fait.</p></>);
}
