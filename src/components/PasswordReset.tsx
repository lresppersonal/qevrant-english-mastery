"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { isDemoMode } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

const strong = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "That reset link has expired or was already used. Request a new one." : null);
  if (isDemoMode) return <p className="text-muted">Demo mode has no accounts, so there is no password to reset.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
    setBusy(false);
    // Same message whether or not the address has an account, so nobody can probe for accounts.
    if (error && /fetch/i.test(error.message)) return setError("Network error. Check your connection and try again.");
    setSent(true);
  }

  if (sent) return <p role="status" className="text-success">If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires after one hour. Check your spam folder too.</p>;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block text-sm font-medium">Email
        <input className="input mt-1" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !email}>{busy ? "Sending…" : "Send reset link"}</button>
      <p className="text-center text-sm text-muted"><Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/sign-in">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (isDemoMode) return <p className="text-muted">Demo mode has no accounts.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!strong(pw)) return setError("Use at least 8 characters, including a letter and a number.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(/session/i.test(error.message) ? "Your reset link has expired. Request a new one." : error.message);
    router.replace("/dashboard"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium">New password
          <input className="input mt-1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby="pw-rule" />
        </label>
        <span id="pw-rule" className="mt-1 block text-xs text-muted">At least 8 characters, including a letter and a number.</span>
      </div>
      <label className="block text-sm font-medium">Repeat new password
        <input className="input mt-1" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !pw || !pw2}>{busy ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
