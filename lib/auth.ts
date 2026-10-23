import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { User } from "./types";
import { getDb, isInsForgeConfigured, newId, now } from "./db";

/* ------------------------------------------------------------------ */
/* Local (no InsForge) session: a signed cookie holding the user id.    */
/* ------------------------------------------------------------------ */

const LOCAL_COOKIE = "sokozia_session";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-me";
}

function sign(value: string): string {
  return createHash("sha256").update(value + "." + secret()).digest("base64url");
}

function hashPassword(password: string, salt = randomBytes(8).toString("hex")): string {
  return salt + ":" + createHash("sha256").update(salt + password + secret()).digest("hex");
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt] = stored.split(":");
  const a = Buffer.from(hashPassword(password, salt));
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function decodeSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const id = raw.slice(0, i);
  return sign(id) === raw.slice(i + 1) ? id : null;
}

interface LocalUserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: string;
}

type CookieJar = Pick<NextResponse["cookies"], "set" | "delete">;

export const AUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/** Current user for Server Components and route handlers (cookie based). */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  if (isInsForgeConfigured()) {
    const { createServerClient } = await import("@insforge/sdk/ssr");
    const client = createServerClient({ cookies: jar });
    const { data } = await client.auth.getCurrentUser();
    const u = data?.user;
    if (!u) return null;
    return { id: u.id, email: u.email, name: (u as { name?: string }).name ?? (u.profile as { name?: string } | undefined)?.name ?? null };
  }
  const id = decodeSession(jar.get(LOCAL_COOKIE)?.value);
  if (!id) return null;
  const db = await getDb();
  const row = await db.get<LocalUserRow & { id: string }>("local_users", id);
  return row ? { id: row.id, email: row.email, name: row.name } : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export class AuthError extends Error {
  status = 401;
  constructor() {
    super("Connecte-toi pour continuer.");
  }
}

export interface AuthResult {
  user: User | null;
  error: string | null;
  needsVerification?: boolean;
}

/**
 * Sign up / sign in / sign out, writing the session cookies onto the
 * response (route handlers only).
 */
export async function signUp(req: NextRequest, res: CookieJar, input: { email: string; password: string; name?: string }): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (isInsForgeConfigured()) {
    const { createAuthActions } = await import("@insforge/sdk/ssr");
    const auth = createAuthActions({ requestCookies: req.cookies, responseCookies: res });
    const { data, error } = await auth.signUp({ email, password: input.password, name: input.name, redirectTo: `${appUrl()}/login?verified=1` });
    if (error) return { user: null, error: friendly(error.message) };
    const u = data?.user;
    return {
      user: u ? { id: u.id, email: u.email, name: input.name ?? null } : null,
      error: null,
      needsVerification: Boolean((data as { requireEmailVerification?: boolean } | null)?.requireEmailVerification),
    };
  }
  const db = await getDb();
  const existing = await db.find<LocalUserRow>("local_users", { email });
  if (existing) return { user: null, error: "Un compte existe déjà avec cet email." };
  const row = await db.insert<LocalUserRow>("local_users", {
    id: newId(),
    email,
    name: input.name ?? null,
    password_hash: hashPassword(input.password),
    created_at: now(),
  });
  res.set(LOCAL_COOKIE, encodeSession(row.id), AUTH_COOKIE_OPTS);
  return { user: { id: row.id, email: row.email, name: row.name }, error: null };
}

export async function signIn(req: NextRequest, res: CookieJar, input: { email: string; password: string }): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  if (isInsForgeConfigured()) {
    const { createAuthActions } = await import("@insforge/sdk/ssr");
    const auth = createAuthActions({ requestCookies: req.cookies, responseCookies: res });
    const { data, error } = await auth.signInWithPassword({ email, password: input.password });
    if (error) return { user: null, error: friendly(error.message) };
    const u = data?.user;
    return { user: u ? { id: u.id, email: u.email, name: (u as { name?: string }).name ?? null } : null, error: null };
  }
  const db = await getDb();
  const row = await db.find<LocalUserRow>("local_users", { email });
  if (!row || !verifyPassword(input.password, row.password_hash)) return { user: null, error: "Email ou mot de passe incorrect." };
  res.set(LOCAL_COOKIE, encodeSession(row.id), AUTH_COOKIE_OPTS);
  return { user: { id: row.id, email: row.email, name: row.name }, error: null };
}

export async function signOut(req: NextRequest, res: CookieJar): Promise<void> {
  if (isInsForgeConfigured()) {
    const { createAuthActions } = await import("@insforge/sdk/ssr");
    const auth = createAuthActions({ requestCookies: req.cookies, responseCookies: res });
    await auth.signOut();
    return;
  }
  res.delete(LOCAL_COOKIE);
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function friendly(msg: string | undefined): string {
  if (!msg) return "Une erreur est survenue.";
  if (/already|exists/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/invalid|incorrect|credential|password/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/verify|verification/i.test(msg)) return "Vérifie ton email avant de te connecter.";
  return msg;
}
