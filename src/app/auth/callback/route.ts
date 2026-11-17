import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Landing page for every link that comes back from Supabase Auth: email confirmation,
 * Google sign-in (OAuth, PKCE) and password-recovery links. Exchanges the one-time code
 * for a session cookie, then sends the learner on to `next`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/sign-in?error=oauth", url.origin));
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const sb = await supabaseServer();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL(safeNext === "/reset-password" ? "/forgot-password?error=link" : "/sign-in?error=link", url.origin));
}
