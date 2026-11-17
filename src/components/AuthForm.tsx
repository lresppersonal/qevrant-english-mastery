"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isDemoMode } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  // Only internal paths: "//host" or "https://…" would turn sign-in into an open redirect.
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : (mode === "sign-up" ? "/onboarding" : "/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const errParam = params.get("error");
  const [error, setError] = useState<string | null>(errParam === "oauth" ? "Google sign-in was cancelled or failed. Please try again." : errParam ? "That link has expired or was already used. Please sign in again." : null);
  const expired = params.get("expired") === "1";
  const [confirm, setConfirm] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  if (isDemoMode) {
    return (
      <div className="space-y-4">
        <p className="text-muted">
          This copy of the app is running in <strong className="text-ink">Demo mode</strong>: no database is connected, so there are no accounts.
          Your progress is kept in this browser only.
        </p>
        <Link href={mode === "sign-up" ? "/onboarding" : "/dashboard"} className="btn btn-primary w-full">Continue in Demo mode</Link>
      </div>
    );
  }

  const pwProblem = mode === "sign-up" && password && !(password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password))
    ? "Use at least 8 characters, including a letter and a number." : null;

  async function google() {
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(mode === "sign-up" ? "/onboarding" : next)}` },
    });
    // On success the browser is redirected to Google; we only get here on an error.
    if (error) { setError(error.message.includes("not enabled") ? "Google sign-in isn't switched on for this site yet. Use email and password, or see the setup guide." : error.message); setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwProblem) { setError(pwProblem); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (mode === "sign-up" && password !== confirm) { setError("The two passwords don't match."); return; }
    setBusy(true);
    setError(null);
    const sb = supabaseBrowser();
    try {
      if (mode === "sign-up") {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { display_name: name || null }, emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding` },
        });
        if (error) throw error;
        // With email confirmation on, Supabase answers an existing address with a user that has no identities.
        if (data.user && data.user.identities?.length === 0) { setError("An account with this email already exists. Sign in instead, or reset your password."); return; }
        if (!data.session) { setInfo("Check your inbox and click the confirmation link. After that you can sign in with your email and password."); return; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message;
      setError(/Invalid login credentials/i.test(msg) ? "Email or password is incorrect."
        : /Email not confirmed/i.test(msg) ? "Please confirm your email first: open the link we sent you, then sign in."
        : /already registered/i.test(msg) ? "An account with this email already exists. Sign in instead, or reset your password."
        : /rate limit/i.test(msg) ? "Too many attempts. Please wait a minute and try again."
        : /fetch/i.test(msg) ? "Network error. Check your connection and try again." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {GOOGLE_ENABLED && (
        <>
          <button type="button" onClick={google} disabled={busy} className="btn btn-ghost w-full border border-line">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <p className="text-center text-xs text-muted">You sign in on Google's own page. English Mastery never sees or stores your Google password.</p>
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
        </>
      )}
      {mode === "sign-up" && (
        <label className="block text-sm font-medium">Name (optional)
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      )}
      <label className="block text-sm font-medium">Email
        <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <div>
        <label className="block text-sm font-medium">Password
          <input className="input mt-1" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} aria-describedby={mode === "sign-up" ? "pw-rule" : undefined} />
        </label>
        {mode === "sign-up" && <span id="pw-rule" className={pwProblem ? "mt-1 block text-xs text-danger" : "mt-1 block text-xs text-muted"}>At least 8 characters, including a letter and a number.</span>}
      </div>
      {mode === "sign-up" && (
        <div>
          <label className="block text-sm font-medium">Confirm password
            <input className="input mt-1" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={!!confirm && confirm !== password} aria-describedby="pw-match" />
          </label>
          {confirm && confirm !== password && <span id="pw-match" className="mt-1 block text-xs text-danger">The passwords don't match yet.</span>}
        </div>
      )}
      {mode === "sign-in" && <p className="-mt-2 text-right text-sm"><Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">Forgot your password?</Link></p>}
      {expired && !error && <p role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-sm">Your session has ended. Please sign in again; your progress is saved in your account.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {info && <p role="status" className="text-sm text-success">{info}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !email || password.length < 8 || (mode === "sign-up" && !confirm)}>
        {busy ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "sign-up" ? <>Already have an account? <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/sign-in">Sign in</Link></>
          : <>New here? <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/sign-up">Create an account</Link></>}
      </p>
    </form>
  );
}
