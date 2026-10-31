import "server-only";
import { AuthError } from "./auth";
import { HttpError, requireUser } from "./api";
import type { User } from "./types";
import { getDb, isInsForgeConfigured } from "./db";
import { getBalance } from "./services/wallet";

/**
 * Admins are listed by email in ADMIN_EMAILS (comma separated). Nobody is
 * admin when the variable is empty.
 */
export function isAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(user.email.toLowerCase());
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new HttpError(403, "Réservé aux administrateurs.");
  return user;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string | null;
  balance: number;
}

interface AuthUserRow {
  id: string;
  email: string;
  createdAt?: string;
  profile?: { name?: string } | null;
}

/** Customers whose email (or name) matches, with their balance. */
export async function searchUsers(query: string, limit = 20): Promise<AdminUser[]> {
  let found: Omit<AdminUser, "balance">[];
  if (isInsForgeConfigured()) {
    // Admin users endpoint of InsForge auth (shared with the earlier app).
    const url = new URL("/api/auth/users", process.env.NEXT_PUBLIC_INSFORGE_URL);
    url.searchParams.set("limit", String(limit));
    if (query) url.searchParams.set("search", query);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.INSFORGE_API_KEY}` }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) throw new AuthError();
    if (!res.ok) throw new Error(`Recherche impossible (${res.status}).`);
    const { data } = (await res.json()) as { data: AuthUserRow[] };
    found = data.map((u) => ({ id: u.id, email: u.email, name: u.profile?.name ?? null, createdAt: u.createdAt ?? null }));
  } else {
    const db = await getDb();
    const rows = await db.list<{ id: string; email: string; name: string | null; created_at: string }>("local_users", {}, { orderBy: "created_at", ascending: false, limit: 200 });
    const q = query.toLowerCase();
    found = rows
      .filter((u) => !q || u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q))
      .slice(0, limit)
      .map((u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at }));
  }
  const balances = await Promise.all(found.map((u) => getBalance(u.id)));
  return found.map((u, i) => ({ ...u, balance: balances[i] }));
}
