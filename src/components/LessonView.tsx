"use client";
import { BackLink } from "./NavMemory";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useCycleStages, stageHref, type CycleInfo } from "./LearningCycle";
import { allowed } from "@/lib/consent";
import { ArrowRight, ArrowLeft, Clock, GitBranch, Lock, ListTree, Rows3, Check, ChevronDown } from "lucide-react";
import type { Exercise, GrammarLesson } from "@/lib/content/schema";
import { Blocks, LevelBadge } from "./ui";
import { SaveButton } from "./SaveButton";
import { ExercisePlayer } from "./ExercisePlayer";
import { MasteryChip } from "./MasteryChip";
import { useLearner } from "./StoreProvider";
import { FROM, GRAMMAR_STAGES, grammarContext, parseNavContext, withNavContext, type GrammarStage, type NavContext } from "@/lib/nav-context";
import { RecogniseStage, QuickCheck, PractiseStage, ProduceStage, FeedbackStage, ReviewStage } from "./grammar/Stages";

const LINK_LABEL = { prerequisite: "Builds on", extends: "Leads to", contrasts_with: "Compare with", practises: "Practised in", appears_in: "Appears in" } as const;

import { buildParts, type Part } from "@/lib/grammar-parts";
export { buildParts };

export type ProduceTask = { href: string; title: string; kind: "writing" | "speaking" };
type Props = { lesson: GrammarLesson; exercises: Exercise[]; cycle?: CycleInfo | null; rules?: Record<string, string>; tasks?: ProduceTask[] };

/** The lesson page is one learning environment: the stage lives in the URL (?stage=…), so Back/Forward and reloads keep it. */
export function LessonView(props: Props) {
  return (
    <Suspense fallback={<Lesson {...props} stage="understand" parent={null} />}>
      <LessonFromUrl {...props} />
    </Suspense>
  );
}
function LessonFromUrl(props: Props) {
  const params = useSearchParams();
  const s = params.get("stage");
  const stage = (GRAMMAR_STAGES as readonly string[]).includes(s ?? "") ? (s as GrammarStage) : "understand";
  return <Lesson {...props} stage={stage} parent={parseNavContext(params.get(FROM))} />;
}

function Lesson({ lesson, cycle, tasks = [], stage, parent }: Props & { stage: GrammarStage; parent: NavContext | null }) {
  const { store, ready } = useLearner();
  const router = useRouter();
  const info: CycleInfo = cycle ?? { slug: lesson.slug, sections: lesson.sections.length, readings: [], questionIds: [] };
  const { stages } = useCycleStages(info);
  const navRef = useRef<HTMLDivElement>(null);
  // Every stage the learner has opened stays mounted (hidden when not active), so answers in progress are kept.
  const [visited, setVisited] = useState<Set<GrammarStage>>(() => new Set([stage]));
  const pendingSection = useRef<string | null>(null);
  useEffect(() => { setVisited((v) => (v.has(stage) ? v : new Set([...v, stage]))); }, [stage]);

  // Links from this lesson to other pages carry "this lesson, this stage" as their way back.
  const linkCtx = grammarContext(lesson.slug, stage, parent);

  const goStage = (s: GrammarStage, section?: string) => {
    pendingSection.current = section ?? null;
    if (s === stage) { if (section) jumpToSection(section); return; }
    router.push(withNavContext(stageHref(lesson.slug, s), parent), { scroll: false });
  };
  const jumpToSection = (id: string) => { window.location.hash = id; };

  // On a stage change: bring the stage bar into view if the learner had scrolled past it; honour a pending section jump.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = navRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    if (pendingSection.current && stage === "understand") { const id = pendingSection.current; pendingSection.current = null; window.setTimeout(() => jumpToSection(id), 60); }
    // Arrived on Understand with a #section (e.g. "Review the rule" from Practise): let the theory open that part
    else if (stage === "understand" && location.hash.split("#").pop()) window.setTimeout(() => window.dispatchEvent(new HashChangeEvent("hashchange")), 60);
  }, [stage]);

  useEffect(() => {
    if (!ready) return;
    store.setLastPosition({ href: stageHref(lesson.slug, stage), label: lesson.title }).catch(() => {});
  }, [ready, store, lesson, stage]);

  const idx = GRAMMAR_STAGES.indexOf(stage);
  const next = GRAMMAR_STAGES[idx + 1];

  return (
    <article>
      <BackLink href="/grammar" label="Grammar map" />
      <header className="mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <LevelBadge level={lesson.level} />
          <span className="chip"><Clock size={12} aria-hidden="true" /> {lesson.minutes} min</span>
          <MasteryChip target={lesson.slug} />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{lesson.title}</h1>
        <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-muted">{lesson.summary}</p>
      </header>

      <div ref={navRef} className="scroll-mt-20">
        <nav aria-label="Learning stages for this topic" className="mb-7" data-testid="stage-nav">
          <ol className="scroll-row !gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
            {stages.map((s, i) => {
              const current = s.key === stage;
              return (
                <li key={s.key} className="min-w-[6.75rem] flex-1">
                  <Link href={withNavContext(s.href, parent)} scroll={false} aria-current={current ? "step" : undefined}
                    onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); goStage(s.key); }}
                    className={clsx("relative flex min-h-12 items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-[background,color,box-shadow] duration-200",
                      current ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink")}>
                    <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs transition-colors duration-300",
                      current ? "bg-primary-fg/20" : s.done ? "bg-success text-white" : "bg-surface-2")} aria-hidden="true">
                      {s.done && !current ? <Check size={13} /> : i + 1}
                    </span>
                    <span className="truncate">{s.label}</span>
                    <span className="sr-only">{s.done ? " (done)" : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {GRAMMAR_STAGES.filter((k) => visited.has(k)).map((k) => (
        <div key={k} hidden={k !== stage} className={k === stage ? "stage-enter" : undefined} data-stage={k}>
          {k === "understand" && <Theory lesson={lesson} linkCtx={linkCtx} onContinue={() => goStage("recognise")} />}
          {k === "recognise" && <RecogniseStage lesson={lesson} readings={info.readings} linkCtx={linkCtx} onNext={() => goStage("practise")} />}
          {k === "practise" && <PractiseStage lesson={lesson} onTheory={() => goStage("understand")} />}
          {k === "produce" && <ProduceStage lesson={lesson} tasks={tasks} linkCtx={linkCtx} onNext={() => goStage("feedback")} />}
          {k === "feedback" && <FeedbackStage lesson={lesson} onReview={() => goStage("review")} onUnderstand={(section) => goStage("understand", section)} />}
          {k === "review" && <ReviewStage lesson={lesson} />}
        </div>
      ))}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {idx > 0 ? <button type="button" className="btn btn-ghost" onClick={() => goStage(GRAMMAR_STAGES[idx - 1])}><ArrowLeft size={16} aria-hidden="true" /> {stages[idx - 1].label}</button> : <span />}
        {next && stage !== "understand" && <button type="button" className="btn btn-primary" onClick={() => goStage(next)} data-testid="next-stage">Next stage: {stages[idx + 1].label} <ArrowRight size={16} aria-hidden="true" /></button>}
      </div>
    </article>
  );
}

/** Understand: the theory, one part at a time (or all), with a compact index on the right. */
function Theory({ lesson, linkCtx, onContinue }: { lesson: GrammarLesson; linkCtx: NavContext; onContinue: () => void }) {
  const { store, ready } = useLearner();
  const seen = useRef(new Set<string>());
  const parts = buildParts(lesson);
  const [active, setActive] = useState(parts[0]?.key ?? "A");
  const showAll = true; // the full theory is one page, read in order A–H
  const [menuOpen, setMenuOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, parts.findIndex((p) => p.key === active));
  const part = parts[idx];
  // Parts are lettered in sequence for this lesson (a lesson without, say, a separate examples part has no gap).
  const letter = (key: string) => String.fromCharCode(65 + Math.max(0, parts.findIndex((p) => p.key === key)));


  const go = (key: string, focusId?: string) => {
    setActive(key);
    setMenuOpen(false);
    window.setTimeout(() => {
      const el = (focusId && document.getElementById(focusId)) || (showAll ? document.getElementById(`part-${key}`) : topRef.current);
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

  // Record which sections were actually read (visible for a moment), once per visit.
  useEffect(() => {
    if (!ready) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = e.target.id;
        const read = e.isIntersecting && (e.intersectionRatio >= 0.4 || e.intersectionRect.height >= window.innerHeight * 0.45);
        if (read && !seen.current.has(id)) {
          seen.current.add(id);
          store.logEvent({ type: "lesson_section_viewed", contentType: "grammar_lesson", contentRef: `${lesson.slug}#${id}` }).catch(() => {});
        }
      }
    }, { threshold: [0, 0.15, 0.25, 0.4] });
    lesson.sections.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ready, lesson, store, active, showAll]);

  const renderPart = (p: Part) => (
    <div key={p.key} className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Part {letter(p.key)}</p>
        <h2 id={`part-${p.key}`} className="scroll-mt-24 text-2xl font-extrabold">{p.title}</h2>
        <p className="text-sm text-muted">{p.hint}</p>
      </div>
      {p.sections.map((s, n) => (
        <section key={s.id} id={s.id} tabIndex={-1} className={clsx("card scroll-mt-28 p-5 outline-none sm:p-7", s.kind === "core" && "border-primary/40 shadow-[inset_4px_0_0_var(--primary)]")} aria-labelledby={`h-${s.id}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 id={`h-${s.id}`} className="text-xl font-bold">{p.sections.length > 1 && <span className="mr-2 text-primary">{letter(p.key)}{n + 1}</span>}{s.title}</h3>
            <SaveButton compact itemType="lesson_section" itemRef={`${lesson.slug}#${s.id}`} label={`${lesson.title}: ${s.title}`} />
          </div>
          <Blocks blocks={s.blocks} />
        </section>
      ))}
      {p.key === "H" && <QuickCheck lesson={lesson} />}
      {p.key === "H" && lesson.links.length > 0 && <WhereThisFits lesson={lesson} linkCtx={linkCtx} />}
    </div>
  );

  const index = (
    <ol className="space-y-0.5">
      {parts.map((p) => {
        const current = !showAll && p.key === active;
        return (
          <li key={p.key}>
            <button type="button" onClick={() => go(p.key)} aria-current={current ? "step" : undefined}
              className={clsx("flex w-full items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] transition-colors duration-150",
                current ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:bg-surface-2 hover:text-ink")}>
              <span className="w-3.5 shrink-0 font-display text-xs">{letter(p.key)}</span><span>{p.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
  const viewToggle = null;


  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12.5rem] xl:gap-10" data-testid="theory">
      <div className="min-w-0">
        {/* Small screens: the index folds into one compact line above the lesson */}
        <div className="mb-5 xl:hidden">
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="lesson-index-compact"
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-sm">
            <span className="truncate"><span className="text-muted">Contents · </span><span className="font-semibold">{showAll ? "All parts" : `${letter(part?.key ?? "A")}. ${part?.title}`}</span></span>
            <ChevronDown size={17} className={clsx("shrink-0 text-muted transition-transform duration-200", menuOpen && "rotate-180")} aria-hidden="true" />
          </button>
          {menuOpen && <nav id="lesson-index-compact" aria-label="Lesson parts" className="fade-up mt-2 rounded-xl border border-line bg-surface p-2">{index}{viewToggle}</nav>}
        </div>
        <div ref={topRef} className="scroll-mt-24" />
        <div className="space-y-12">{parts.map(renderPart)}</div>
        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary-soft p-5 text-center sm:p-6">
          <p className="font-semibold">Finished the theory?</p>
          <p className="mt-1 text-sm text-muted">Next, find the structure in a real passage.</p>
          <button type="button" className="btn btn-primary mt-4" onClick={onContinue} data-testid="continue-recognise">Continue to Recognise <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
      {/* Wide screens: a quiet, sticky reference index on the right */}
      <aside className="hidden xl:block" aria-label="Lesson parts">
        <nav aria-label="Lesson parts" className="sticky top-24" data-testid="lesson-index">
          <p className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wider text-muted">In this lesson</p>
          {index}
          {viewToggle}
        </nav>
      </aside>
    </div>
  );
}

function WhereThisFits({ lesson, linkCtx }: { lesson: GrammarLesson; linkCtx: NavContext }) {
  return (
    <section className="card p-5 sm:p-7" aria-labelledby="h-graph">
      <h3 id="h-graph" className="flex items-center gap-2 text-xl font-bold"><GitBranch size={20} aria-hidden="true" /> Where this fits</h3>
      <ul className="mt-4 space-y-2">
        {lesson.links.map((l) => {
          const href = withNavContext(l.type === "appears_in" ? `/reading/${l.to}` : `/grammar/${l.to}`, linkCtx);
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
  );
}

/** Practice page: separate from theory, but every explanation links back to the exact rule. */
export function LessonPractice({ lesson, exercises, rules }: { lesson: GrammarLesson; exercises: Exercise[]; rules?: Record<string, string> }) {
  const { store, ready } = useLearner();
  useEffect(() => {
    if (ready) store.setLastPosition({ href: `/grammar/${lesson.slug}/practice`, label: `Practice: ${lesson.title}` }).catch(() => {});
  }, [ready, store, lesson]);
  const formats = [...new Set(exercises.flatMap((e) => e.questions.map((q) => q.format).filter(Boolean)))];
  return (
    <article>
      <BackLink href="/grammar/practice" label="Grammar practice" />
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
          <ExercisePlayer exercise={ex} rules={rules} />
        </section>
      ))}
    </article>
  );
}
