import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" aria-label="Home"><Logo /></Link>
      <h1 className="mt-10 text-3xl font-extrabold">Privacy notice (draft)</h1>
      <p className="mt-2 text-sm text-muted">Draft for legal review before launch.</p>
      <div className="mt-6 space-y-4 leading-relaxed">
        <h2 className="text-xl font-bold">What we store</h2>
        <p>{BRAND.full} stores your account (email and display name), study progress, exercise answers, saved words, review history, listening logs, weekly reports, preferences, essays and speaking transcripts in a database hosted in the European Union, so that your learning follows you between devices. Every row is protected so that only your signed-in account can read or change it.</p>
        <h2 className="text-xl font-bold">Signing in</h2>
        <p>Passwords are handled by our authentication provider (Supabase Auth) and stored only as salted hashes; we never see them. If you choose “Continue with Google”, you sign in on Google's own page and Google tells us only your email address and name. We never ask for, see or store your Google password.</p>
        <h2 className="text-xl font-bold">AI feedback</h2>
        <p>Essays and speaking transcripts are sent to an AI provider (Anthropic) only to generate your practice feedback. If server transcription is enabled, speaking audio is sent to a speech-to-text provider (OpenAI) only to create the transcript. Speaking audio is not stored unless you switch on “Keep my speaking recordings” in Settings. AI band figures are educational estimates, not official IELTS or Cambridge results.</p>
        <h2 className="text-xl font-bold">Your controls</h2>
        <p>In Settings you can export all your data, delete all essays, delete all speaking recordings and transcripts, delete single sessions, change your password, sign out, or delete your account. Deleting your account removes your personal data, including stored recordings, from our database and storage.</p>
        <h2 className="text-xl font-bold">External listening links</h2>
        <p>The Listening library links to other organisations' websites. When you open them, their own privacy policies apply.</p>
      </div>
    </main>
  );
}
