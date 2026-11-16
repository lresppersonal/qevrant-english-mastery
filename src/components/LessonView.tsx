"use client";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Clock, GitBranch, Lock } from "lucide-react";
import type { Exercise, GrammarLesson } from "@/lib/content/schema";
import { Blocks, LevelBadge } from "./ui";
import { SaveButton } from "./SaveButton";
import { ExercisePlayer } from "./ExercisePlayer";
import { MasteryChip } from "./MasteryChip";
import { useLearner } from "./StoreProvider";

/** Works for normal URLs and for the single-file demo's #/route URLs. */
function setSectionHash(name: string | null) {
  const route = location.hash.startsWith("#/") ? `#${location.hash.slice(1).split("#")[0]}` : "";
  history.replaceState(null, "", route ? (name ? `${route}#${name}` : route) : (name ? `#${name}` : location.pathname));
}

const LINK_LABEL = { prerequisite: "Builds on", extends: "Leads to", contrasts_with: "Compare with", practises: "Practised in", appears_in: "Appears in" } as const;

export function LessonView({ lesson, exercises }: { lesson: GrammarLesson; exercises: Exercise[] }) {
  const [tab, setTab] = useState<"theory" | "practice">("theory");
  const { store, ready } = useLearner();
  const seen = useRef(new Set<string>());

  // Deep links: #section-id opens Theory at that section, #practice opens Practice.
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(location.hash.split("#").pop() ?? "");
      if (h === "practice") { setTab("practice"); return; }
      if (lesson.sections.some((s) => s.id === h)) {
        setTab("theory");
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
    if (!ready || tab !== "theory") return;
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
  }, [ready, tab, lesson, store]);

  return (
    <article>
      <Link href="/grammar" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Grammar map</Link>
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <LevelBadge level={lesson.level} />
          <span className="chip"><Clock size={12} aria-hidden="true" /> {lesson.minutes} min</span>
          <MasteryChip target={lesson.slug} />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{lesson.title}</h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{lesson.summary}</p>
      </header>

      <Tabs.Root value={tab} onValueChange={(v) => { setTab(v as typeof tab); setSectionHash(v === "practice" ? "practice" : null); }}>
        <Tabs.List aria-label="Lesson parts" className="mb-6 inline-flex rounded-xl border border-line bg-surface p-1">
          {(["theory", "practice"] as const).map((t) => (
            <Tabs.Trigger key={t} value={t} className="rounded-lg px-5 py-2 text-sm font-semibold capitalize text-muted data-[state=active]:bg-primary data-[state=active]:text-primary-fg">
              {t}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="theory" forceMount className="outline-none data-[state=inactive]:hidden">
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
                      <li key={l.to + l.type} className="flex flex-wrap items-center gap-3">
                        <span className="w-28 text-sm font-semibold text-muted">{LINK_LABEL[l.type]}</span>
                        <LevelBadge level={l.level} />
                        {l.published ? <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">{l.label}</Link>
                          : <span className="inline-flex items-center gap-1.5 text-muted"><Lock size={14} aria-hidden="true" />{l.label} <span className="text-xs">(planned)</span></span>}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <button onClick={() => { setTab("practice"); setSectionHash("practice"); window.scrollTo({ top: 0 }); }} className="btn btn-primary">
                Go to practice <ArrowRight size={16} aria-hidden="true" />
              </button>
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
        </Tabs.Content>

        <Tabs.Content value="practice" forceMount className="outline-none data-[state=inactive]:hidden">
          {exercises.map((ex) => (
            <section key={ex.slug} className="mb-8">
              <h2 className="text-xl font-bold">{ex.title}</h2>
              <p className="mb-4 mt-1 text-muted">{ex.instructions}</p>
              <ExercisePlayer exercise={ex} />
            </section>
          ))}
        </Tabs.Content>
      </Tabs.Root>
    </article>
  );
}
