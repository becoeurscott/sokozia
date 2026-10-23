import { Suspense } from "react";
import { PaymentReturn } from "@/components/payment/PaymentReturn";

export const metadata = { title: "Paiement · Sokozia" };

export default function RetourPage() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  );
}
