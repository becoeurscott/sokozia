import { NextResponse, type NextRequest } from "next/server";
import { readJson, route } from "@/lib/api";
import { signIn } from "@/lib/auth";

export const POST = route(async (req: NextRequest) => {
  const body = await readJson<{ email?: string; password?: string }>(req);
  const res = NextResponse.json({ ok: true });
  const result = await signIn(req, res.cookies, { email: String(body.email ?? ""), password: String(body.password ?? "") });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json({ user: result.user }, { headers: res.headers });
});
