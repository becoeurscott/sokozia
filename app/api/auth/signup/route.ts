import { NextResponse, type NextRequest } from "next/server";
import { readJson, route } from "@/lib/api";
import { signUp } from "@/lib/auth";

export const POST = route(async (req: NextRequest) => {
  const body = await readJson<{ email?: string; password?: string; name?: string }>(req);
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  const result = await signUp(req, res.cookies, { email, password, name: body.name?.trim() || undefined });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ user: result.user, needsVerification: result.needsVerification ?? false }, { headers: res.headers });
});
