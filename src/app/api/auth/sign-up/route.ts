import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Email + password registration without email confirmation.
 * The account is created server-side with the Supabase admin API and marked as confirmed, so Supabase
 * never sends a confirmation email (which is what failed before). The browser then signs in normally,
 * so the session, cookies and row-level security work exactly as for any other login.
 * The service-role key stays on the server; it is never sent to the browser.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

// Basic abuse protection: at most 5 sign-ups per IP per 10 minutes (per server instance).
const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now); hits.set(ip, recent);
  return recent.length > 5;
};

export async function POST(req: Request) {
  if (!URL || !SERVICE) return NextResponse.json({ error: "Registration isn't configured on this server (missing Supabase service key).", code: "not_configured" }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again.", code: "rate_limited" }, { status: 429 });

  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8 || password.length > 72) return NextResponse.json({ error: "Use 8 to 72 characters for your password." }, { status: 400 });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return NextResponse.json({ error: "An account with this email already exists. Sign in instead, or reset your password.", code: "exists" }, { status: 409 });
    if (/password/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[sign-up]", error.message);
    return NextResponse.json({ error: "Your account couldn't be created. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
