"use client";

import * as React from "react";
import { api } from "@/lib/client/api";
import { useStudio } from "./StudioProvider";
import { Spinner } from "@/components/ui/Spinner";
import type { Style } from "@/lib/models";
import type { PackKind } from "@/lib/pricing";

export function BuyPackButton({ style, kind, label }: { style: Style; kind: PackKind; label: string }) {
  const studio = useStudio();
  const [busy, setBusy] = React.useState(false);

  async function buy() {
    setBusy(true);
    try {
      const { redirectUrl } = await api<{ redirectUrl: string }>("/api/orders", { method: "POST", json: { style, kind } });
      window.location.href = redirectUrl;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={() => (studio.user ? buy() : studio.openDialog("auth", { authMode: "signup", onAuthed: buy }))}
      disabled={busy}
      className="flex h-9 items-center gap-2 rounded-pill bg-brand px-3 text-sm font-semibold text-white hover:bg-[#d24f0a] disabled:opacity-50"
    >
      {busy && <Spinner />}
      {label}
    </button>
  );
}
