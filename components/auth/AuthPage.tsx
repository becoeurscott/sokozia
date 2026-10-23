"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AuthForm } from "./AuthForm";

export function AuthPage({ mode: initial }: { mode: "login" | "signup" }) {
  const [mode, setMode] = React.useState(initial);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/studio";
  const verified = params.get("verified") === "1";

  return (
    <main className="welcome-glow flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo size="lg" className="mb-8" />
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-[0_30px_80px_-40px_rgba(29,26,22,.35)]">
        <h1 className="text-2xl font-extrabold">{mode === "signup" ? "Crée ton compte gratuit" : "Connexion"}</h1>
        <p className="mb-5 mt-1 text-sm text-muted">{verified ? "Email vérifié ! Connecte-toi pour continuer." : mode === "signup" ? "Tu payes seulement les vidéos que tu crées." : "Retrouve tes vidéos et tes crédits."}</p>
        <AuthForm
          mode={mode}
          onModeChange={setMode}
          onSuccess={() => {
            router.push(next);
            router.refresh();
          }}
        />
      </div>
    </main>
  );
}
