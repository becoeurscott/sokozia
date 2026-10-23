import { NextResponse, type NextRequest } from "next/server";
import { route } from "@/lib/api";
import { signOut } from "@/lib/auth";

export const POST = route(async (req: NextRequest) => {
  const res = NextResponse.json({ ok: true });
  await signOut(req, res.cookies);
  return res;
});
