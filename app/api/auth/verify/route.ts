import { NextResponse, type NextRequest } from "next/server";
import { readJson, route } from "@/lib/api";
import { verifyEmail } from "@/lib/auth";

/** Sign-up step 2: the code from the verification email. */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson<{ email?: string; code?: string }>(req);
  const email = String(body.email ?? "").trim();
  const code = String(body.code ?? "").replace(/\s/g, "");
  if (!email || !/^\d{4,8}$/.test(code)) return NextResponse.json({ error: "Entre le code reçu par email." }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  const result = await verifyEmail(req, res.cookies, { email, code });
  if (result.error || !result.user) return NextResponse.json({ error: result.error ?? "Code incorrect ou expiré." }, { status: 400 });
  return NextResponse.json({ user: result.user }, { headers: res.headers });
});
