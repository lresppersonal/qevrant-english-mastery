import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/AppShell";
import { BRAND } from "@/lib/brand";
import { isDemoMode } from "@/lib/supabase/config";
import { Network, Layers3, Sparkles, Gauge } from "lucide-react";

const PILLARS = [
  { icon: Network, title: "A map, not a feed", body: "Every grammar point and word exists once, tagged by level and topic, and linked to what comes before and after it." },
  { icon: Layers3, title: "Real depth at C1 and C2", body: "Advanced levels add new syntax, nuance and register control, not just longer lessons." },
  { icon: Sparkles, title: "AI practice feedback", body: "Detailed analysis of your speaking and academic essays, linked back to the exact grammar you need." },
  { icon: Gauge, title: "Honest measurement", body: "Progress and revision come only from your real answers. No decorative points, no fake band scores." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
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
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:pt-20">
          <p className="eyebrow mb-4">For upper-intermediate and advanced learners</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] md:text-6xl">
            Advanced English, <span className="text-accent-text">as one connected system.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {BRAND.product} takes you from B2 to C2 with structured grammar, a level-tagged vocabulary graph, original reading,
            and AI feedback on your speaking and academic writing. IELTS Academic is one pathway through it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={isDemoMode ? "/onboarding" : "/sign-up"} className="btn btn-primary !px-6 !py-3 text-base">Start learning</Link>
            <Link href={isDemoMode ? "/topics/education" : "/sign-in"} className="btn btn-ghost !px-6 !py-3 text-base">
              {isDemoMode ? "Explore the Education topic" : "I already have an account"}
            </Link>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <p.icon className="text-accent-text" size={24} aria-hidden="true" />
                <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
                <p className="mt-2 text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} {BRAND.company}</span>
        <span>IELTS is a registered trademark of its owners. {BRAND.product} is not affiliated with or endorsed by them.</span>
      </footer>
    </div>
  );
}
