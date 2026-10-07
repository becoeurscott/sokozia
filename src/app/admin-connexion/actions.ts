"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function adminSignIn(_: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const auth = createAuthActions({ cookies: await cookies() });
  const { error } = await auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  // Les droits sont vérifiés par /admin (ADMIN_EMAILS ou droits donnés depuis le back-office).
  redirect("/admin");
}
