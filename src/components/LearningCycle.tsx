"use client";
import Link from "next/link";
import clsx from "clsx";
import { BookOpen, Eye, Dumbbell, PenLine, MessageSquareText, Repeat, Check } from "lucide-react";
import { mastery } from "@/lib/progress";
import { useLearnerData } from "./useLearnerData";
import type { GrammarStage } from "@/lib/nav-context";

export interface CycleInfo { slug: string; sections: number; readings: { slug: string; title: string }[]; questionIds: string[] }

export type CycleStage = { key: GrammarStage; label: string; icon: typeof BookOpen; href: string; done: boolean; hint: string };

/** URL of one stage of a grammar lesson (all stages live inside the lesson page). */
export const stageHref = (lesson: string, stage: GrammarStage) => (stage === "understand" ? `/grammar/${lesson}` : `/grammar/${lesson}?stage=${stage}`);

/**
 * The six stages of one grammar topic with each stage's real status, computed from the learner's own data:
 * Understand → Recognise → Practise → Produce → Feedback → Review.
 */
export function useCycleStages(info: CycleInfo): { stages: CycleStage[]; openMistakes: number; flagged: boolean; loaded: boolean } {
  const { data } = useLearnerData();
  const lesson = info.slug;
  const events = data?.events ?? [];
  const attempts = data?.attempts ?? [];
  const viewed = new Set(events.filter((e) => e.type === "lesson_section_viewed" && (e.contentRef ?? "").startsWith(`${lesson}#`)).map((e) => e.contentRef));
  const checked = attempts.some((a) => a.exerciseSlug === `grammar-check-${lesson}`);
  const recognised = attempts.some((a) => a.exerciseSlug === `grammar-recognise-${lesson}`)
    || events.some((e) => e.type === "reading_completed" && info.readings.some((r) => r.slug === e.contentRef));
  const m = data ? mastery(data.responses, lesson) : { band: "not_started", answered: 0 };
  const producedHere = attempts.some((a) => a.exerciseSlug === `grammar-produce-${lesson}`);
  const produced = [...(data?.writing ?? []), ...(data?.speaking ?? [])].filter((x) => x.feedback);
  const flagged = produced.some((x) => ((x.feedback as { issues?: { grammarRef?: string | null }[] }).issues ?? []).some((i) => i.grammarRef?.startsWith(`lesson:${lesson}`)));
  // questions of this topic whose latest answer was wrong
  const ids = new Set(info.questionIds);
  const slugOf = new Map(attempts.map((a) => [a.id, a.exerciseSlug]));
  const latest = new Map<string, { ok: boolean; at: string }>();
  for (const r of data?.responses ?? []) {
    const k = r.questionId.includes("/") ? r.questionId : `${slugOf.get(r.attemptId) ?? "?"}/${r.questionId}`; // ids are unique per exercise only
    const prev = latest.get(k);
    if (ids.has(k) && (!prev || r.createdAt >= prev.at)) latest.set(k, { ok: r.correct, at: r.createdAt });
  }
  const openMistakes = [...latest.values()].filter((x) => !x.ok).length;
  const stages: CycleStage[] = [
    { key: "understand", label: "Understand", icon: BookOpen, href: stageHref(lesson, "understand"), done: checked || viewed.size >= Math.ceil(info.sections / 2), hint: "Read the theory" },
    { key: "recognise", label: "Recognise", icon: Eye, href: stageHref(lesson, "recognise"), done: recognised, hint: "Spot it in context" },
    { key: "practise", label: "Practise", icon: Dumbbell, href: stageHref(lesson, "practise"), done: m.band === "secure" || m.band === "mastered", hint: m.answered ? `${m.band.replace("_", " ")} so far` : "Controlled exercises" },
    { key: "produce", label: "Produce", icon: PenLine, href: stageHref(lesson, "produce"), done: producedHere, hint: "Use it yourself" },
    { key: "feedback", label: "Feedback", icon: MessageSquareText, href: stageHref(lesson, "feedback"), done: (m.answered > 0 || producedHere) && !flagged && openMistakes === 0, hint: flagged ? "AI flagged this in your work" : openMistakes ? `${openMistakes} answer${openMistakes === 1 ? "" : "s"} to learn from` : "Learn from corrections" },
    { key: "review", label: "Review", icon: Repeat, href: stageHref(lesson, "review"), done: m.answered > 0 && openMistakes === 0, hint: openMistakes ? `${openMistakes} question${openMistakes === 1 ? "" : "s"} to retry` : "Spaced review" },
  ];
  return { stages, openMistakes, flagged, loaded: !!data };
}

/** Compact overview of the cycle (dashboard). Each stage opens that stage inside the lesson. */
export function LearningCycle({ info, compact = false }: { info: CycleInfo; compact?: boolean }) {
  const { stages } = useCycleStages(info);
  return (
    <ol className={clsx(compact ? "grid grid-cols-3 gap-1.5" : "flex flex-wrap gap-2")} aria-label="Learning cycle" data-testid="learning-cycle">
      {stages.map((s, i) => (
        <li key={s.key} className={compact ? "min-w-0" : "min-w-[8.5rem] flex-1"}>
          <Link href={s.href} title={`${s.label}: ${s.hint}`} aria-label={`${i + 1}. ${s.label}${s.done ? " (done)" : ""}: ${s.hint}`}
            className={clsx("group flex h-full flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-[background,border-color,transform] hover:-translate-y-0.5",
              s.done ? "border-success/50 bg-[color-mix(in_srgb,var(--success)_8%,var(--surface))]" : "border-line hover:border-primary/50")}>
            <span className={clsx("grid h-7 w-7 place-items-center rounded-full", s.done ? "bg-success text-white" : "bg-surface-2 text-muted group-hover:text-primary")}>
              {s.done ? <Check size={15} aria-hidden="true" /> : <s.icon size={15} aria-hidden="true" />}
            </span>
            <span className={clsx("max-w-full truncate font-semibold", compact ? "text-xs" : "text-sm")}>{s.label}</span>
            {!compact && <span className="text-xs text-muted">{s.hint}</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}
