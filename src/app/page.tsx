import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HeroQ } from "@/components/HeroQ";
import { ThemeToggle } from "@/components/AppShell";
import { BRAND } from "@/lib/brand";
import { isDemoMode } from "@/lib/supabase/config";
import { Network, Layers3, Sparkles, Gauge } from "lucide-react";

const PILLARS = [
  { icon: Network, title: "One connected system", body: "Every grammar point and word exists once, tagged by level and topic, and linked to what comes before and after it. A structure you study in Grammar returns in your reading, your essays and your speaking." },
  { icon: Layers3, title: "Real depth at C1 and C2", body: "Advanced levels add new syntax, nuance and register control, not just longer lessons. You work from a secure B2 towards confident C1 and precise C2 English." },
  { icon: Sparkles, title: "Feedback that explains", body: "Every answer is checked and explained. AI practice feedback on your speaking and academic writing shows what went wrong, why, and which lesson fixes it, and your progress comes only from your real answers." },
  { icon: Gauge, title: "Your personal plan", body: "A study plan built from your self-assessment and your real results. Weaker areas get more time, stronger ones are maintained, and the plan adapts as you improve." },
];

const SKILLS6 = [
  { title: "Grammar", body: "Structured lessons from core concept to C2 nuance, with practice that links back to the exact rule." },
  { title: "Vocabulary", body: "A level-tagged word graph by theme, with spaced review and practice in context." },
  { title: "Reading", body: "Original articles with exam-style tasks; tap any word for its meaning and save it." },
  { title: "Listening", body: "Graded podcasts and talks, note-taking practice and a log of your listening." },
  { title: "Speaking", body: "Timed speaking tasks with feedback on fluency, vocabulary and grammar." },
  { title: "Academic Writing", body: "Visual data description and eight essay types, with criterion-by-criterion feedback." },
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
          <div className="mx-auto flex min-h-[calc(100dvh-14rem)] max-w-6xl items-center px-5 pb-16 pt-64 md:min-h-[40rem] md:pt-12">
            <div className="ml-auto w-full md:w-[52%]">
              <p className="eyebrow mb-4">For upper-intermediate and advanced learners</p>
              <h1 className="text-4xl font-extrabold leading-[1.08] md:text-[3.4rem]">
                Advanced English, <span className="text-primary">as one connected system.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                {BRAND.product} takes you from B2 to C2 with structured grammar, a level-tagged vocabulary graph, original reading,
                listening practice, and AI feedback on your speaking and academic writing, all connected in one personal study plan.
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

        <section className="border-t border-line bg-surface" aria-labelledby="h-six">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 id="h-six" className="text-2xl font-extrabold">Six skills, one learning path</h2>
            <p className="mt-2 max-w-3xl text-muted">The skills are not separate courses. Each day&apos;s theme connects them: the grammar you learn appears in the text you read, the words you save return in your review and your writing, and your speaking and essays show what to study next.</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SKILLS6.map((k) => <li key={k.title} className="rounded-xl border border-line bg-bg p-4"><p className="font-bold">{k.title}</p><p className="mt-1 text-sm leading-relaxed text-muted">{k.body}</p></li>)}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} {BRAND.company}</span>
      </footer>
    </div>
  );
}
