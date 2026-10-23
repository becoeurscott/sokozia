"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Clock } from "lucide-react";
import { api } from "@/lib/client/api";
import type { Order } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { formatFcfa } from "@/lib/models";

/**
 * Landing after the Mobile Money page. Polls the order until it settles,
 * then sends the user back to the thread (single video) or the studio.
 */
export function PaymentReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("order");
  const [order, setOrder] = React.useState<Order | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tries, setTries] = React.useState(0);

  React.useEffect(() => {
    if (!orderId) return;
    let stop = false;
    const tick = async () => {
      try {
        const { order } = await api<{ order: Order }>(`/api/orders/${orderId}`);
        if (stop) return;
        setOrder(order);
        if (order.status === "pending") setTries((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [orderId]);

  React.useEffect(() => {
    if (order?.status !== "completed") return;
    const t = setTimeout(() => router.replace(order.thread_id ? `/studio/c/${order.thread_id}` : "/studio/modeles"), 1500);
    return () => clearTimeout(t);
  }, [order, router]);

  const dest = order?.thread_id ? `/studio/c/${order.thread_id}` : "/studio";

  return (
    <main className="welcome-glow flex min-h-dvh flex-col items-center justify-center px-4">
      <Logo size="lg" className="mb-8" />
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center shadow-[0_30px_80px_-40px_rgba(29,26,22,.35)]">
        {!orderId || error ? (
          <>
            <X className="mx-auto h-10 w-10 text-red-600" />
            <h1 className="mt-3 text-xl font-extrabold">Commande introuvable</h1>
            <p className="mt-1 text-sm text-muted">{error ?? "Le lien de retour est incomplet."}</p>
            <Button href="/studio" className="mt-6">
              Retour au studio
            </Button>
          </>
        ) : !order || order.status === "pending" ? (
          <>
            <Spinner className="mx-auto h-8 w-8 text-brand" />
            <h1 className="mt-3 text-xl font-extrabold">On vérifie ton paiement…</h1>
            <p className="mt-1 text-sm text-muted">Confirme sur ton téléphone si ce n&apos;est pas déjà fait. {order ? formatFcfa(order.amount) : ""}</p>
            {tries > 8 && (
              <p className="mt-4 rounded-xl bg-bg p-3 text-xs text-muted">
                <Clock className="mr-1 inline h-3 w-3" />
                Ça prend plus de temps que prévu. Tu peux revenir au studio : ta vidéo partira dès confirmation.
              </p>
            )}
            <Button href={dest} variant="outline" className="mt-6">
              Retour au studio
            </Button>
          </>
        ) : order.status === "completed" ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
              <Check className="h-6 w-6" />
            </span>
            <h1 className="mt-3 text-xl font-extrabold">Paiement confirmé</h1>
            <p className="mt-1 text-sm text-muted">{order.kind === "single" ? "Ta vidéo est en cours de création." : "Tes crédits sont disponibles."}</p>
            <Button href={order.thread_id ? `/studio/c/${order.thread_id}` : "/studio/modeles"} className="mt-6">
              Continuer
            </Button>
          </>
        ) : (
          <>
            <X className="mx-auto h-10 w-10 text-red-600" />
            <h1 className="mt-3 text-xl font-extrabold">Paiement non abouti</h1>
            <p className="mt-1 text-sm text-muted">{order.failure ?? "Le paiement a échoué ou a expiré. Rien n'a été débité."}</p>
            <Button href={dest} className="mt-6">
              Réessayer
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
