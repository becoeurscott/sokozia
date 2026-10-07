"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createUser, deleteUser, giftAds, setAdmin, updateUser } from "@/app/admin/actions";

const input = "h-10 w-full rounded-xl border border-white/[0.08] bg-[#0b0b0b] px-3 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-white/25";

type Countries = { code: string; name: string }[];
type Who = { name: string; phone: string; country: string };

export function UserActions({ userId, isAdmin, styles, who, countries }: { userId: string; isAdmin: boolean; styles: { id: string; name: string; durations: number[] }[]; who: Who; countries: Countries }) {
  const [form, setForm] = useState<Who>(who);
  const save = () => start(async () => {
    const r = await updateUser(userId, form);
    setNotice(r.ok ? { ok: true, text: r.message ?? "Fait." } : { ok: false, text: r.error ?? "Échec." });
    if (r.ok) router.refresh();
  });
  const remove = () => {
    const why = prompt("Supprimer définitivement ce compte ? Ses projets, pubs restantes et paiements seront effacés (les vidéos restent à Sokozia).\n\nRaison :");
    if (!why) return;
    start(async () => {
      const r = await deleteUser(userId, why);
      if (r.ok) { router.push("/admin/utilisateurs"); router.refresh(); }
      else setNotice({ ok: false, text: r.error ?? "Échec." });
    });
  };
  const router = useRouter();
  const [pending, start] = useTransition();
  const [styleId, setStyleId] = useState(styles[0]?.id ?? "");
  const style = styles.find((s) => s.id === styleId);
  const [duration, setDuration] = useState(style?.durations[0] ?? 15);
  const [count, setCount] = useState("1");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const valid = Number(count) >= 1 && reason.trim().length >= 3;

  const gift = () => start(async () => {
    const r = await giftAds(userId, styleId, duration, Number(count), reason);
    setNotice(r.ok ? { ok: true, text: r.message ?? "Fait." } : { ok: false, text: r.error ?? "Échec." });
    if (r.ok) { setReason(""); router.refresh(); }
  });
  const toggleAdmin = () => {
    if (!confirm(isAdmin ? "Retirer les droits admin de ce compte ?" : "Donner les droits admin à ce compte ? Il pourra tout voir et tout modifier.")) return;
    start(async () => {
      const r = await setAdmin(userId, !isAdmin);
      setNotice(r.ok ? { ok: true, text: "Droits mis à jour." } : { ok: false, text: r.error ?? "Échec." });
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] font-medium text-white/70">Offrir des pubs (geste commercial, test, compensation)</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <select className={input} value={styleId} onChange={(e) => { setStyleId(e.target.value); setDuration(styles.find((s) => s.id === e.target.value)?.durations[0] ?? 15); }} aria-label="Style">
            {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={input} value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Durée">
            {(style?.durations ?? []).map((d) => <option key={d} value={d}>{d} s</option>)}
          </select>
          <input className={input} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} placeholder="Nombre" aria-label="Nombre de pubs" />
        </div>
        <input className={`${input} mt-2`} placeholder="Raison (gardée dans le journal)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        <button type="button" disabled={!valid || pending} onClick={gift} className="mt-2 h-9 w-full rounded-xl bg-emerald-400 text-[13px] font-medium text-black disabled:opacity-40">+ Offrir {count || 0} pub(s)</button>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-medium text-white/70">Modifier le profil</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={input} placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nom" />
          <input className={input} placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-label="Téléphone" />
          <select className={input} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} aria-label="Pays">
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <button type="button" disabled={pending} onClick={save} className="mt-2 h-9 w-full rounded-xl border border-white/10 text-[13px] hover:border-white/25 disabled:opacity-40">Enregistrer</button>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-medium text-white/70">Droits</p>
        <button type="button" disabled={pending} onClick={toggleAdmin} className="h-9 rounded-xl border border-white/10 px-4 text-[13px] hover:border-white/25 disabled:opacity-40">
          {isAdmin ? "Retirer les droits admin" : "Donner les droits admin"}
        </button>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-medium text-white/70">Zone dangereuse</p>
        <button type="button" disabled={pending} onClick={remove} className="h-9 rounded-xl border border-red-500/30 px-4 text-[13px] text-red-400 hover:bg-red-500/10 disabled:opacity-40">Supprimer le compte</button>
      </div>
      {notice && <p role="status" className={`rounded-lg px-3 py-2 text-[12px] ${notice.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{notice.text}</p>}
    </div>
  );
}

export function NewUser({ countries }: { countries: Countries }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", password: "", name: "", phone: "", country: countries[0]?.code ?? "CI" });
  const [err, setErr] = useState("");
  const submit = () => start(async () => {
    const r = await createUser(f);
    if (r.ok && r.id) router.push(`/admin/utilisateurs/${r.id}`);
    else setErr(r.error ?? "Échec.");
  });
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="h-9 rounded-xl bg-white px-4 text-[13px] font-medium text-black">+ Nouvel utilisateur</button>;
  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#111] p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} placeholder="Mot de passe (6+ caractères)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <input className={input} placeholder="Nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} placeholder="Téléphone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <select className={input} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>
      {err && <p className="mt-2 text-[12px] text-red-400">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pending} onClick={submit} className="h-9 rounded-xl bg-white px-4 text-[13px] font-medium text-black disabled:opacity-40">{pending ? "Création…" : "Créer le compte"}</button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-xl border border-white/10 px-4 text-[13px]">Annuler</button>
      </div>
    </div>
  );
}
