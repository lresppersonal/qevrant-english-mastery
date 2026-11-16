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
        <p>{BRAND.full} stores your account, study progress, saved words, essays and speaking transcripts in a database hosted in the European Union, so that your learning follows you between devices.</p>
        <p>Essays and speaking transcripts are sent to an AI provider only to generate your practice feedback. Speaking audio is not stored unless you switch on “Keep my speaking recordings” in Settings.</p>
        <p>You can export all your data or delete your account at any time from Settings. Deleting your account removes your personal data from our database.</p>
      </div>
    </main>
  );
}
