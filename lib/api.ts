import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { AuthError, getCurrentUser } from "./auth";
import type { User } from "./types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function badRequest(msg: string): never {
  throw new HttpError(400, msg);
}

export function notFound(msg = "Introuvable."): never {
  throw new HttpError(404, msg);
}

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/** Wraps a route handler with uniform JSON error responses. */
export function route<Ctx = unknown>(fn: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error("[api]", e);
      const message = e instanceof Error ? e.message : "Erreur serveur.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError();
  return u;
}

export async function readJson<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Corps JSON invalide.");
  }
}

export async function params<T>(ctx: { params: Promise<T> | T }): Promise<T> {
  return await ctx.params;
}
