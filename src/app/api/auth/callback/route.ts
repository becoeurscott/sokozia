import { NextResponse, type NextRequest } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

// Retour de Google : on échange le code contre une session (cookies), puis direction le studio.
// Le profil Sokozia est créé automatiquement à la première visite (getSession).
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || request.url;
  const code = request.nextUrl.searchParams.get("insforge_code");
  const verifier = request.cookies.get("insforge_code_verifier")?.value;
  if (request.nextUrl.searchParams.get("error") || !code || !verifier)
    return NextResponse.redirect(new URL("/connexion?error=google", base));

  const next = request.cookies.get("sz_next")?.value;
  const response = NextResponse.redirect(new URL(next && /^\/[^/\\]/.test(next) ? next : "/tableau-de-bord", base));
  const auth = createAuthActions({ requestCookies: request.cookies, responseCookies: response.cookies });
  const { data, error } = await auth.exchangeOAuthCode(code, verifier);
  if (error || !data?.user) return NextResponse.redirect(new URL("/connexion?error=google", base));
  response.cookies.delete("insforge_code_verifier");
  response.cookies.delete("sz_next");
  return response;
}
