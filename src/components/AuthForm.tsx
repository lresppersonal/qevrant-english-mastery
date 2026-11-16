"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isDemoMode } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? (mode === "sign-up" ? "/onboarding" : "/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "That link has expired. Please sign in again." : null);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
        if (!data.session) { setInfo("Check your inbox to confirm your email, then come back to sign in."); return; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === "sign-up" && (
        <label className="block text-sm font-medium">Name (optional)
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      )}
      <label className="block text-sm font-medium">Email
        <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">Password
        <input className="input mt-1" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} />
        {mode === "sign-up" && <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>}
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {info && <p role="status" className="text-sm text-success">{info}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !email || password.length < 8}>
        {busy ? "Please wait…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "sign-up" ? <>Already have an account? <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/sign-in">Sign in</Link></>
          : <>New here? <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/sign-up">Create an account</Link></>}
      </p>
    </form>
  );
}
