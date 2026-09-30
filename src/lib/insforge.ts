import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { createAdminClient } from "@insforge/sdk";

export async function serverClient() {
  return createServerClient({ cookies: await cookies() });
}

// Clé admin : serveur uniquement.
export function adminClient() {
  return createAdminClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    apiKey: process.env.INSFORGE_API_KEY!,
  });
}

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  country: string;
  is_admin: boolean;
};

const PROFILE_COLS = "id, full_name, phone, country, is_admin";

export async function getSession() {
  const client = await serverClient();
  const { data } = await client.auth.getCurrentUser();
  const user = data?.user ?? null;
  if (!user) return { user: null, profile: null };
  const db = adminClient().database;
  const { data: rows } = await db.from("profiles").select(PROFILE_COLS).eq("id", user.id).limit(1);
  let profile = (rows?.[0] as Profile) ?? null;
  if (!profile) {
    // Profil créé à la première connexion (après vérification de l'e-mail).
    const name = (user as { profile?: { name?: string } }).profile?.name ?? "";
    const { data: created } = await db
      .from("profiles")
      .insert([{ id: user.id, full_name: name, accepted_terms_at: new Date().toISOString() }])
      .select(PROFILE_COLS);
    profile = (created?.[0] as Profile) ?? null;
  }
  return { user, profile };
}
