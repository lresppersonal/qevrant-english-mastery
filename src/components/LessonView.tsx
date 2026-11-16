"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Clock, GitBranch, Lock } from "lucide-react";
import type { Exercise, GrammarLesson } from "@/lib/content/schema";
import { Blocks, LevelBadge } from "./ui";
import { SaveButton } from "./SaveButton";
import { ExercisePlayer } from "./ExercisePlayer";
import { MasteryChip } from "./MasteryChip";
import { useLearner } from "./StoreProvider";

const LINK_LABEL = { prerequisite: "Builds on", extends: "Leads to", contrasts_with: "Compare with", practises: "Practised in", appears_in: "Appears in" } as const;

export function LessonView({ lesson, exercises }: { lesson: GrammarLesson; exercises: Exercise[] }) {
  const { store, ready } = useLearner();
  const seen = useRef(new Set<string>());
  const questionCount = exercises.reduce((n, e) => n + e.questions.length, 0);

  // Deep links: #section-id scrolls to that section (also used by "Review the rule" in practice and AI feedback).
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(location.hash.split("#").pop() ?? "");
      if (lesson.sections.some((s) => s.id === h)) {
        window.setTimeout(() => {
          const el = document.getElementById(h);
          el?.scrollIntoView({ block: "start" });
          el?.focus({ preventScroll: true });
        }, 50);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [lesson]);

  useEffect(() => {
    if (!ready) return;
    store.setLastPosition({ href: `/grammar/${lesson.slug}`, label: lesson.title }).catch(() => {});
  }, [ready, store, lesson]);

  // Record which sections were actually read (visible for a moment), once per visit.
  useEffect(() => {
    if (!ready) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.id;
        if (e.isIntersecting && !seen.current.has(id)) {
          seen.current.add(id);
          store.logEvent({ type: "lesson_section_viewed", contentType: "grammar_lesson", contentRef: `${lesson.slug}#${id}` }).catch(() => {});
        }
      }
    }, { threshold: 0.6 });
    lesson.sections.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ready, lesson, store]);

  return (
    <article>
      <Link href="/grammar" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Grammar map</Link>
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="chip !text-primary">Theory</span>
          <LevelBadge level={lesson.level} />
          <span className="chip"><Clock size={12} aria-hidden="true" /> {lesson.minutes} min</span>
          <MasteryChip target={lesson.slug} />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{lesson.title}</h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{lesson.summary}</p>
        {questionCount > 0 && (
          <Link href={`/grammar/${lesson.slug}/practice`} className="btn btn-primary mt-5">Practise this topic ({questionCount} questions) <ArrowRight size={16} aria-hidden="true" /></Link>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
        <div className="space-y-6">
          {lesson.sections.map((s) => (
            <section key={s.id} id={s.id} tabIndex={-1} className="card scroll-mt-24 p-5 outline-none sm:p-7" aria-labelledby={`h-${s.id}`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 id={`h-${s.id}`} className="text-xl font-bold">{s.title}</h2>
                <SaveButton compact itemType="lesson_section" itemRef={`${lesson.slug}#${s.id}`} label={`${lesson.title}: ${s.title}`} />
              </div>
              <Blocks blocks={s.blocks} />
            </section>
          ))}

          <section className="card p-5 sm:p-7" aria-labelledby="h-graph">
            <h2 id="h-graph" className="flex items-center gap-2 text-xl font-bold"><GitBranch size={20} aria-hidden="true" /> Where this fits</h2>
            <ul className="mt-4 space-y-2">
              {lesson.links.map((l) => {
                const href = l.type === "appears_in" ? `/reading/${l.to}` : `/grammar/${l.to}`;
                return (
                  <li key={l.to + l.type + l.label} className="flex flex-wrap items-center gap-3">
                    <span className="w-28 text-sm font-semibold text-muted">{LINK_LABEL[l.type]}</span>
                    <LevelBadge level={l.level} />
                    {l.published ? <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">{l.label}</Link>
                      : <span className="inline-flex items-center gap-1.5 text-muted"><Lock size={14} aria-hidden="true" />{l.label} <span className="text-xs">(planned)</span></span>}
                  </li>
                );
              })}
            </ul>
          </section>

          {questionCount > 0 && (
            <Link href={`/grammar/${lesson.slug}/practice`} className="btn btn-primary">Go to practice <ArrowRight size={16} aria-hidden="true" /></Link>
          )}
        </div>

        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="eyebrow mb-2">On this page</p>
            <ul className="space-y-1 border-l border-line text-sm">
              {lesson.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-muted hover:border-primary hover:text-ink">{s.title}</a></li>)}
            </ul>
          </div>
        </nav>
      </div>
    </article>
  );
}

/** Practice page: separate from theory, but every explanation links back to the exact rule. */
export function LessonPractice({ lesson, exercises }: { lesson: GrammarLesson; exercises: Exercise[] }) {
  const { store, ready } = useLearner();
  useEffect(() => {
    if (ready) store.setLastPosition({ href: `/grammar/${lesson.slug}/practice`, label: `Practice: ${lesson.title}` }).catch(() => {});
  }, [ready, store, lesson]);
  const formats = [...new Set(exercises.flatMap((e) => e.questions.map((q) => q.format).filter(Boolean)))];
  return (
    <article>
      <Link href="/grammar/practice" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Grammar practice</Link>
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className="chip !text-primary">Practice</span><LevelBadge level={lesson.level} /><MasteryChip target={lesson.slug} /></div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{lesson.title}</h1>
        {formats.length > 0 && <p className="mt-2 text-sm text-muted">Formats: {formats.join(" · ")}</p>}
        <Link href={`/grammar/${lesson.slug}`} className="btn btn-ghost mt-4"><ArrowLeft size={16} aria-hidden="true" /> Read the theory</Link>
      </header>
      {exercises.map((ex) => (
        <section key={ex.slug} className="mb-8">
          <h2 className="text-xl font-bold">{ex.title}</h2>
          <p className="mb-4 mt-1 text-muted">{ex.instructions}</p>
          <ExercisePlayer exercise={ex} />
        </section>
      ))}
    </article>
  );
}
