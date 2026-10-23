import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the InsForge access-token cookie fresh on every navigation.
 * No-op when InsForge is not configured (local dev store).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (process.env.NEXT_PUBLIC_INSFORGE_URL && process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) {
    const { updateSession } = await import("@insforge/sdk/ssr/middleware");
    await updateSession({ requestCookies: request.cookies, responseCookies: response.cookies });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|actors/|samples/|api/webhooks/).*)"],
};
