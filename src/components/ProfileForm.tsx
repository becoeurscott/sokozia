"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions";

export default function ProfileForm({ name, country, phone, countries }: {
  name: string; country: string; phone: string | null; countries: [string, string][];
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Nom ou nom de ta boutique</span>
        <input name="name" defaultValue={name} required className="input" /></label>
      <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Pays (définit ta devise)</span>
        <select name="country" defaultValue={country} className="input">{countries.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">Numéro Mobile Money (facultatif)</span>
        <input name="phone" type="tel" defaultValue={phone ?? ""} placeholder="ex : 237 6XX XX XX XX" className="input" /></label>
      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state?.email === "saved" && !pending && <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">Modifications enregistrées.</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
