"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";
import { adminClient, getSession } from "@/lib/insforge";

export type State = { error?: string; email?: string; step?: "verify" } | undefined;

const fr = (msg?: string) => {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("already")) return "Un compte existe déjà avec cet e-mail. Connecte-toi.";
  if (m.includes("verif")) return "Ton e-mail n'est pas encore vérifié. Entre le code reçu.";
  if (m.includes("invalid") || m.includes("credential")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("otp") || m.includes("code")) return "Code incorrect ou expiré.";
  return "Une erreur est survenue. Réessaie.";
};

export async function signUp(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();
  if (!form.get("terms")) return { error: "Tu dois accepter les conditions d'utilisation." };
  if (password.length < 6) return { error: "Le mot de passe doit faire au moins 6 caractères." };
  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signUp({ email, password, name });
  if (error) return { error: fr(error.message) };
  (await cookies()).set("sz_signup", JSON.stringify({ country: form.get("country"), phone: form.get("phone"), name }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600,
  });
  if (data && "accessToken" in data && data.accessToken) await finishProfile();
  else return { step: "verify", email };
  redirect("/studio");
}

export async function verify(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "");
  const otp = String(form.get("otp") ?? "").trim();
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.verifyEmail({ email, otp });
  if (error) return { step: "verify", email, error: fr(error.message) };
  await finishProfile();
  redirect("/studio");
}

async function finishProfile() {
  const store = await cookies();
  const raw = store.get("sz_signup")?.value;
  const { user } = await getSession();
  if (!user || !raw) return;
  const extra = JSON.parse(raw) as { country?: string; phone?: string; name?: string };
  await adminClient().database.from("profiles").update({
    country: extra.country || "CM",
    phone: extra.phone || null,
    full_name: extra.name ?? "",
    accepted_terms_at: new Date().toISOString(),
  }).eq("id", user.id);
  store.delete("sz_signup");
}

export async function signIn(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) {
    const msg = fr(error.message);
    return msg.includes("vérifié") ? { step: "verify", email, error: msg } : { error: msg };
  }
  const next = String(form.get("next") ?? "");
  redirect(/^\/[^/\\]/.test(next) ? next : "/studio");
}

export async function signOut() {
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  redirect("/");
}
