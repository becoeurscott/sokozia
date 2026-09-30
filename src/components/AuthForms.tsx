"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, verify, type State } from "@/app/actions";

const COUNTRIES = [
  ["CM", "Cameroun"], ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["BJ", "Bénin"],
  ["BF", "Burkina Faso"], ["CG", "Congo-Brazzaville"], ["GA", "Gabon"], ["CD", "RD Congo"], ["RW", "Rwanda"],
];

function Err({ s }: { s: State }) {
  return s?.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p> : null;
}

function VerifyForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verify, undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="text-muted">On t&apos;a envoyé un code à <b>{email}</b>. Entre-le ici :</p>
      <input type="hidden" name="email" value={email} />
      <input name="otp" inputMode="numeric" autoComplete="one-time-code" required placeholder="Code à 6 chiffres" className="input text-center text-2xl tracking-[0.4em]" />
      <Err s={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Vérification…" : "Valider"}</button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.step === "verify" && state.email) return <VerifyForm email={state.email} />;
  return (
    <form action={action} className="space-y-4">
      <input name="name" required placeholder="Ton nom ou nom de ta boutique" className="input" />
      <input name="email" type="email" required placeholder="E-mail" className="input" />
      <input name="password" type="password" required minLength={6} placeholder="Mot de passe (6 caractères min.)" className="input" />
      <select name="country" className="input" defaultValue="CM">
        {COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <input name="phone" type="tel" placeholder="Numéro Mobile Money (ex : 237 6XX XX XX XX)" className="input" />
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[var(--brand)]" />
        <span>J&apos;accepte les <Link href="/cgu" target="_blank" className="underline">conditions d&apos;utilisation</Link>, y compris que les vidéos créées appartiennent à Sokozia.</span>
      </label>
      <Err s={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</button>
      <p className="text-center text-sm text-muted">Déjà un compte ? <Link href="/connexion" className="font-semibold text-brand">Connexion</Link></p>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  if (state?.step === "verify" && state.email) return <VerifyForm email={state.email} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/studio"} />
      <input name="email" type="email" required placeholder="E-mail" className="input" />
      <input name="password" type="password" required placeholder="Mot de passe" className="input" />
      <Err s={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
      <p className="text-center text-sm text-muted">Pas encore de compte ? <Link href="/inscription" className="font-semibold text-brand">Inscription</Link></p>
    </form>
  );
}
