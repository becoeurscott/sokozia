import { NextResponse } from "next/server";

/**
 * InsForge SSR refresh endpoint (the browser client calls it when the
 * access-token cookie is missing or about to expire).
 */
export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_INSFORGE_URL) return NextResponse.json({ ok: true });
  const { refreshAuth } = await import("@insforge/sdk/ssr");
  const result = await refreshAuth({ request });
  return result.response;
}
