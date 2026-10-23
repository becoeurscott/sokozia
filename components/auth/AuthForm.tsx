"use client";

import * as React from "react";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { User } from "@/lib/types";

export function AuthForm({
  mode,
  onModeChange,
  onSuccess,
}: {
  mode: "login" | "signup";
  onModeChange: (m: "login" | "signup") => void;
  onSuccess: (user: User) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await api<{ user: User | null; needsVerification: boolean }>("/api/auth/signup", { method: "POST", json: { email, password, name } });
        if (r.needsVerification || !r.user) {
          setInfo("Compte créé ! Vérifie ta boîte mail puis connecte-toi.");
          onModeChange("login");
          return;
        }
        onSuccess(r.user);
      } else {
        const r = await api<{ user: User }>("/api/auth/login", { method: "POST", json: { email, password } });
        onSuccess(r.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const field = "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && <input className={field} placeholder="Ton prénom (optionnel)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />}
      <input className={field} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input
        className={field}
        type="password"
        required
        minLength={8}
        placeholder={mode === "signup" ? "Mot de passe (8 caractères min.)" : "Mot de passe"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
      />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {info && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{info}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Spinner />}
        {mode === "signup" ? "Créer mon compte" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            Déjà un compte ?{" "}
            <button type="button" className="font-semibold text-brand hover:underline" onClick={() => onModeChange("login")}>
              Se connecter
            </button>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <button type="button" className="font-semibold text-brand hover:underline" onClick={() => onModeChange("signup")}>
              S&apos;inscrire gratuitement
            </button>
          </>
        )}
      </p>
    </form>
  );
}
