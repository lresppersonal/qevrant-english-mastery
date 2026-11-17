"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowRight, ArrowLeft, Clock, GitBranch, Lock, ListTree, Rows3 } from "lucide-react";
import type { Exercise, GrammarLesson } from "@/lib/content/schema";
import { Blocks, LevelBadge } from "./ui";
import { SaveButton } from "./SaveButton";
import { ExercisePlayer } from "./ExercisePlayer";
import { MasteryChip } from "./MasteryChip";
import { useLearner } from "./StoreProvider";

const LINK_LABEL = { prerequisite: "Builds on", extends: "Leads to", contrasts_with: "Compare with", practises: "Practised in", appears_in: "Appears in" } as const;

type Part = { key: string; title: string; hint: string; sections: GrammarLesson["sections"] };

/** Textbook layout: every lesson is shown as parts A–H. Parts with no content are skipped. */
const PARTS: { key: string; title: string; hint: string; kinds: string[] }[] = [
  { key: "A", title: "Overview", hint: "What it is and why it matters", kinds: ["overview"] },
  { key: "B", title: "Formation", hint: "Affirmative, negative, questions, short answers", kinds: ["form"] },
  { key: "C", title: "Main uses", hint: "The core rules with examples", kinds: ["uses"] },
  { key: "D", title: "Time expressions", hint: "Signal words and typical markers", kinds: ["time"] },
  { key: "E", title: "Comparison", hint: "Contrasts with similar forms", kinds: ["contrasts"] },
  { key: "F", title: "Common mistakes", hint: "Errors learners make and how to fix them", kinds: ["errors"] },
  { key: "G", title: "Advanced usage", hint: "Nuance, style and formal register", kinds: ["advanced", "register", "pronunciation"] },
  { key: "H", title: "Review & practice", hint: "Rule summary and exercises", kinds: ["summary"] },
];

export function buildParts(lesson: GrammarLesson, hasPractice: boolean): Part[] {
  return PARTS.map((p) => ({ key: p.key, title: p.title, hint: p.hint, sections: lesson.sections.filter((s) => p.kinds.includes(s.kind)) }))
    .filter((p) => p.sections.length > 0 || (p.key === "H" && hasPractice));
}

export function LessonView({ lesson, exercises }: { lesson: GrammarLesson; exercises: Exercise[] }) {
  const { store, ready } = useLearner();
  const seen = useRef(new Set<string>());
  const questionCount = exercises.reduce((n, e) => n + e.questions.length, 0);
  const parts = buildParts(lesson, questionCount > 0);
  const [active, setActive] = useState(parts[0]?.key ?? "A");
  const [showAll, setShowAll] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, parts.findIndex((p) => p.key === active));
  const part = parts[idx];

  useEffect(() => { try { setShowAll(localStorage.getItem("em-lesson-view") === "all"); } catch { /* storage unavailable */ } }, []);
  const toggleAll = () => { const v = !showAll; setShowAll(v); try { localStorage.setItem("em-lesson-view", v ? "all" : "parts"); } catch { /* ignore */ } };

  const go = (key: string, focusId?: string) => {
    setActive(key);
    window.setTimeout(() => {
      const el = (focusId && document.getElementById(focusId)) || topRef.current;
      el?.scrollIntoView({ block: "start" });
      if (focusId) (el as HTMLElement | null)?.focus({ preventScroll: true });
    }, 30);
  };

  // Deep links: #section-id (used by "Review the rule" in practice and AI feedback) or #part-C.
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(location.hash.split("#").pop() ?? "");
      const pk = h.match(/^part-([A-H])$/)?.[1];
      if (pk && parts.some((p) => p.key === pk)) return go(pk);
      const owner = parts.find((p) => p.sections.some((s) => s.id === h));
      if (owner) go(owner.key, h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }, { threshold: 0.4 });
    lesson.sections.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ready, lesson, store, active, showAll]);

  const renderPart = (p: Part) => (
    <div key={p.key} className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-fg" aria-hidden="true">{p.key}</span>
        <div>
          <h2 id={`part-${p.key}`} className="text-2xl font-extrabold">{p.title}</h2>
          <p className="text-sm text-muted">{p.hint}</p>
        </div>
      </div>
      {p.sections.length > 1 && (
        <nav aria-label={`Subsections of ${p.title}`} className="flex flex-wrap gap-2">
          {p.sections.map((s, n) => <a key={s.id} href={`#${s.id}`} className="chip hover:border-primary hover:text-primary">{p.key}{n + 1}. {s.title}</a>)}
        </nav>
      )}
      {p.sections.map((s, n) => (
        <section key={s.id} id={s.id} tabIndex={-1} className="card scroll-mt-28 p-5 outline-none sm:p-7" aria-labelledby={`h-${s.id}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 id={`h-${s.id}`} className="text-xl font-bold"><span className="mr-2 text-primary">{p.key}{p.sections.length > 1 ? n + 1 : ""}</span>{s.title}</h3>
            <SaveButton compact itemType="lesson_section" itemRef={`${lesson.slug}#${s.id}`} label={`${lesson.title}: ${s.title}`} />
          </div>
          <Blocks blocks={s.blocks} />
        </section>
      ))}
      {p.key === "A" && lesson.links.length > 0 && (
        <section className="card p-5 sm:p-7" aria-labelledby="h-graph">
          <h3 id="h-graph" className="flex items-center gap-2 text-xl font-bold"><GitBranch size={20} aria-hidden="true" /> Where this fits</h3>
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
      )}
      {p.key === "H" && exercises.length > 0 && (
        <section className="card p-5 sm:p-7" aria-labelledby="h-practice">
          <h3 id="h-practice" className="mb-1 text-xl font-bold">Practice</h3>
          <p className="mb-4 text-muted">{exercises[0].instructions}</p>
          <ExercisePlayer exercise={exercises[0]} />
          <Link href={`/grammar/${lesson.slug}/practice`} className="btn btn-ghost mt-4">Open practice on its own page <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      )}
    </div>
  );

  return (
    <article>
      <Link href="/grammar" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Grammar map</Link>
      <header className="mb-5">
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

      <div ref={topRef} className="scroll-mt-20" />
      <nav aria-label="Lesson parts" className="mb-6 rounded-2xl border border-line bg-surface p-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {parts.map((p) => (
            <button key={p.key} type="button" onClick={() => (showAll ? document.getElementById(`part-${p.key}`)?.scrollIntoView({ block: "start" }) : go(p.key))}
              aria-current={!showAll && p.key === active ? "step" : undefined}
              className={clsx("flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
                !showAll && p.key === active ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>
              <span className="font-display">{p.key}</span><span className="hidden sm:inline">{p.title}</span>
            </button>
          ))}
          <button type="button" onClick={toggleAll} className="ml-auto flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:text-ink" aria-pressed={showAll}>
            {showAll ? <><Rows3 size={15} aria-hidden="true" /> One part at a time</> : <><ListTree size={15} aria-hidden="true" /> Show all parts</>}
          </button>
        </div>
      </nav>

      {showAll ? <div className="space-y-12">{parts.map(renderPart)}</div> : part && (
        <>
          {renderPart(part)}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            {idx > 0 ? <button type="button" className="btn btn-ghost" onClick={() => go(parts[idx - 1].key)}><ArrowLeft size={16} aria-hidden="true" /> {parts[idx - 1].key}. {parts[idx - 1].title}</button> : <span />}
            {idx < parts.length - 1 && <button type="button" className="btn btn-primary" onClick={() => go(parts[idx + 1].key)}>{parts[idx + 1].key}. {parts[idx + 1].title} <ArrowRight size={16} aria-hidden="true" /></button>}
          </div>
        </>
      )}
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
