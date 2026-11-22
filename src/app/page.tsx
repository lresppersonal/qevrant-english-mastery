import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HeroQ } from "@/components/HeroQ";
import { ThemeToggle } from "@/components/AppShell";
import { BRAND } from "@/lib/brand";
import { isDemoMode } from "@/lib/supabase/config";
import { Network, Layers3, Sparkles, Gauge } from "lucide-react";

const PILLARS = [
  { icon: Network, title: "One connected system", body: "Grammar, words, texts and tasks linked by level and topic." },
  { icon: Layers3, title: "Real depth at C1 and C2", body: "Nuance, register and new structures, not just longer lessons." },
  { icon: Sparkles, title: "Feedback that explains", body: "Every answer is checked, with the reason behind it." },
  { icon: Gauge, title: "Your own plan", body: "A study plan built from your self-assessment and real results." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="safe-top mx-auto flex max-w-6xl items-center justify-between px-5 pb-5">
        <Link href="/dashboard" aria-label="QEVRANT: open your dashboard" className="rounded-lg"><Logo /></Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isDemoMode ? (
            <Link href="/dashboard" className="btn btn-primary">Open the app</Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn btn-ghost">Sign in</Link>
              <Link href="/sign-up" className="btn btn-primary hidden sm:inline-flex">Create account</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <HeroQ />
          <div className="mx-auto flex min-h-[calc(100dvh-14rem)] max-w-6xl items-center px-5 pb-16 pt-56 md:min-h-[38rem] md:pt-12">
            <div className="ml-auto w-full md:w-[52%]">
              <p className="eyebrow mb-4">For upper-intermediate and advanced learners</p>
              <h1 className="text-4xl font-extrabold leading-[1.08] md:text-[3.4rem]">
                Advanced English, <span className="text-primary">as one connected system.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Grammar, vocabulary, reading, listening, speaking and academic writing, from B2 to C2, in one personal plan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={isDemoMode ? "/onboarding" : "/sign-up"} className="btn btn-primary !px-6 !py-3 text-base">Start learning</Link>
                <Link href="/topics" className="btn btn-ghost !px-6 !py-3 text-base">Explore the topics</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
            {PILLARS.map((p) => (
              <div key={p.title} className="lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <p.icon className="text-primary" size={22} aria-hidden="true" />
                <h2 className="mt-3 text-base font-bold">{p.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} {BRAND.company}</span>
      </footer>
    </div>
  );
}
