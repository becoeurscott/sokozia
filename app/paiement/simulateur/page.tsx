import { Suspense } from "react";
import { MockMomo } from "@/components/payment/MockMomo";

export const metadata = { title: "Simulateur Mobile Money · Sokozia" };

export default function SimulateurPage() {
  return (
    <Suspense>
      <MockMomo />
    </Suspense>
  );
}
