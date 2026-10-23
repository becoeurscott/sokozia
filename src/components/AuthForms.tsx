"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signInWithGoogle, signUp, verify, type State } from "@/app/actions";

const COUNTRIES = [
  ["CM", "Cameroun"], ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["BJ", "Bénin"],
  ["CG", "Congo-Brazzaville"], ["GA", "Gabon"], ["CD", "RD Congo"], ["RW", "Rwanda"],
];

function Err({ s }: { s: State }) {
  return s?.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p> : null;
}


function GoogleButton({ next, label }: { next?: string; label: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? "/studio"} />
      <button className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-card py-3 font-semibold transition hover:border-ink">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {label}
      </button>
    </form>
  );
}

function Divider() {
  return <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou avec ton e-mail<span className="h-px flex-1 bg-line" /></div>;
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
    <>
    <GoogleButton label="Continuer avec Google" />
    <p className="mt-2 text-center text-[11px] text-muted">En continuant avec Google, tu confirmes avoir 18 ans ou plus et accepter les <Link href="/cgu" target="_blank" className="underline">conditions générales</Link> et la <Link href="/confidentialite" target="_blank" className="underline">politique de confidentialité</Link>.</p>
    <Divider />
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
        <span>J&apos;ai 18 ans ou plus et j&apos;accepte les <Link href="/cgu" target="_blank" className="underline">conditions générales</Link> et la <Link href="/confidentialite" target="_blank" className="underline">politique de confidentialité</Link>. Je comprends que les vidéos créées appartiennent à Sokozia et que j&apos;en reçois une licence d&apos;utilisation.</span>
      </label>
      <Err s={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</button>
      <p className="text-center text-sm text-muted">Déjà un compte ? <Link href="/connexion" className="font-semibold text-brand">Connexion</Link></p>
    </form>
    </>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  if (state?.step === "verify" && state.email) return <VerifyForm email={state.email} />;
  return (
    <>
    <GoogleButton next={next} label="Se connecter avec Google" />
    <Divider />
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/studio"} />
      <input name="email" type="email" required placeholder="E-mail" className="input" />
      <input name="password" type="password" required placeholder="Mot de passe" className="input" />
      <Err s={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
      <p className="text-center text-sm text-muted">Pas encore de compte ? <Link href="/inscription" className="font-semibold text-brand">Inscription</Link></p>
    </form>
    </>
  );
}
