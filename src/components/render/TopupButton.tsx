"use client";

import { useState } from "react";
import { TopupSheet } from "./Topup";

export function TopupButton({ label = "Recharger", currency, className = "btn" }: { label?: string; currency: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>{label}</button>
      <TopupSheet open={open} currencyLabel={currency} onClose={() => setOpen(false)} />
    </>
  );
}
