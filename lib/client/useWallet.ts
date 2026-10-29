"use client";

import * as React from "react";
import { api } from "./api";
import type { HistoryItem } from "../wallet";

const EVENT = "sokozia:wallet";

/** Tells every component showing the balance to reload it (after a payment). */
export function refreshWallet() {
  window.dispatchEvent(new Event(EVENT));
}

/**
 * The signed-in user's balance (FCFA), and the history when asked for.
 * `balance` is null while loading or when signed out.
 */
export function useWallet(enabled = true) {
  const [balance, setBalance] = React.useState<number | null>(null);
  const [history, setHistory] = React.useState<HistoryItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api<{ balance: number; history: HistoryItem[] }>("/api/wallet");
      setBalance(res.balance);
      setHistory(res.history);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [enabled]);

  React.useEffect(() => {
    void load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, [load]);

  return { balance, history, error, reload: load };
}
