"use client";

import * as React from "react";
import { Search, Check, Wallet } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatFcfa, videoPrice } from "@/lib/models";
import type { HistoryItem } from "@/lib/wallet";
import { Spinner } from "@/components/ui/Spinner";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string | null;
  balance: number;
}

/** Credit presets, in 15 s videos. */
const PRESETS = [1, 2, 5, 10];

/** Find a customer by email and add FCFA to their balance. */
export function AdminCredit() {
  const [q, setQ] = React.useState("");
  const [users, setUsers] = React.useState<AdminUser[] | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<AdminUser | null>(null);
  const [history, setHistory] = React.useState<HistoryItem[] | null>(null);
  const [amount, setAmount] = React.useState(videoPrice(15));
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  // Search as the admin types, a little after the last key.
  React.useEffect(() => {
    let stop = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { users } = await api<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q.trim())}`);
        if (!stop) setUsers(users);
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!stop) setSearching(false);
      }
    }, 300);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [q]);

  async function open(u: AdminUser) {
    setSelected(u);
    setHistory(null);
    setError(null);
    try {
      const r = await api<{ balance: number; history: HistoryItem[] }>(`/api/admin/users/${u.id}`);
      setSelected({ ...u, balance: r.balance });
      setHistory(r.history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function credit() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { balance } = await api<{ balance: number }>("/api/admin/credit", { method: "POST", json: { userId: selected.id, amount, note } });
      setDone(`${formatFcfa(amount)} ajoutés à ${selected.email}.`);
      setNote("");
      setUsers((list) => list?.map((u) => (u.id === selected.id ? { ...u, balance } : u)) ?? null);
      await open({ ...selected, balance });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const per15 = videoPrice(15);
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1.2fr]">
      <section className="rounded-2xl border border-line bg-card p-4">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-bg px-3 focus-within:border-brand">
          <Search className="h-4 w-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email ou nom du client" className="w-full bg-transparent text-sm outline-none" autoFocus />
          {searching && <Spinner />}
        </label>
        <ul className="mt-3 max-h-[420px] divide-y divide-line overflow-y-auto scrollbar-thin">
          {users?.length === 0 && <li className="py-6 text-center text-sm text-muted">Aucun client trouvé.</li>}
          {users?.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => {
                  setDone(null);
                  open(u);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-hover ${selected?.id === u.id ? "bg-brand-soft" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{u.email}</span>
                  {u.name && <span className="block truncate text-xs text-muted">{u.name}</span>}
                </span>
                <span className="shrink-0 text-sm font-semibold text-ink/80">{formatFcfa(u.balance)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        {!selected ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-muted">
            <Wallet className="mb-2 h-6 w-6 text-brand" />
            Choisis un client dans la liste.
          </div>
        ) : (
          <div className="fade-up">
            <div className="text-sm text-muted">Client</div>
            <div className="truncate font-bold">{selected.email}</div>
            <div className="mt-3 text-sm text-muted">Solde actuel</div>
            <div className="text-3xl font-extrabold">{formatFcfa(selected.balance)}</div>

            <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Crédit à ajouter</div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setAmount(n * per15)}
                  className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold transition ${amount === n * per15 ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-hover"}`}
                >
                  {n} vidéo{n > 1 ? "s" : ""}
                  <span className="block font-normal text-muted">{formatFcfa(n * per15)}</span>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              Montant
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="h-10 w-36 rounded-lg border border-line bg-bg px-3 outline-none focus:border-brand"
              />
              FCFA
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder="Motif (optionnel), ex. geste commercial"
              className="mt-3 h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-brand"
            />
            <button
              onClick={credit}
              disabled={busy || amount <= 0}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {busy ? <Spinner /> : <Check className="h-4 w-4" />} Ajouter {formatFcfa(amount)}
            </button>
            {done && <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm font-semibold text-accent">{done}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Derniers mouvements</div>
            {history === null ? (
              <Spinner className="mt-3 h-5 w-5" />
            ) : history.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Aucun mouvement.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line text-sm">
                {history.slice(0, 10).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{h.label}</span>
                      <span className="text-xs text-muted">
                        {new Date(h.date).toLocaleDateString("fr-FR")} · {h.method}
                      </span>
                    </span>
                    <span className={`shrink-0 font-semibold ${h.method === "Solde" && h.amount > 0 ? "text-accent" : ""}`}>
                      {h.method === "Solde" && h.amount > 0 ? "+" : ""}
                      {formatFcfa(h.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
