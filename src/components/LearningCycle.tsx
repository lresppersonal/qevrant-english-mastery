"use client";
import Link from "next/link";
import clsx from "clsx";
import { BookOpen, Eye, Dumbbell, PenLine, MessageSquareText, Repeat, Check } from "lucide-react";
import { mastery } from "@/lib/progress";
import { useLearnerData } from "./useLearnerData";

export interface CycleInfo { slug: string; sections: number; readings: { slug: string; title: string }[]; questionIds: string[] }

/**
 * The six-stage learning cycle for one grammar topic, with each stage's real status:
 * Understand → Recognise → Practise → Produce → Feedback → Revise.
 */
export function LearningCycle({ info, compact = false }: { info: CycleInfo; compact?: boolean }) {
  const { data } = useLearnerData();
  const lesson = info.slug;
  const viewed = new Set((data?.events ?? []).filter((e) => e.type === "lesson_section_viewed" && (e.contentRef ?? "").startsWith(`${lesson}#`)).map((e) => e.contentRef));
  const readingSlugs = info.readings.map((r) => r.slug);
  const text = info.readings[0];
  const readDone = (data?.events ?? []).some((e) => e.type === "reading_completed" && readingSlugs.includes(e.contentRef ?? ""));
  const m = data ? mastery(data.responses, lesson) : { band: "not_started", answered: 0 };
  const produced = [...(data?.writing ?? []), ...(data?.speaking ?? [])].filter((x) => x.feedback);
  const flagged = produced.some((x) => ((x.feedback as { issues?: { grammarRef?: string | null }[] }).issues ?? []).some((i) => i.grammarRef?.startsWith(`lesson:${lesson}`)));
  // questions of this topic whose latest answer was wrong
  const ids = new Set(info.questionIds);
  const slugOf = new Map((data?.attempts ?? []).map((a) => [a.id, a.exerciseSlug]));
  const latest = new Map<string, { ok: boolean; at: string }>();
  for (const r of data?.responses ?? []) {
    const k = r.questionId.includes("/") ? r.questionId : `${slugOf.get(r.attemptId) ?? "?"}/${r.questionId}`; // ids are unique per exercise only
    const prev = latest.get(k);
    if (ids.has(k) && (!prev || r.createdAt >= prev.at)) latest.set(k, { ok: r.correct, at: r.createdAt });
  }
  const openMistakes = [...latest.values()].filter((x) => !x.ok).length;

  const stages = [
    { key: "understand", label: "Understand", icon: BookOpen, href: `/grammar/${lesson}`, done: viewed.size >= Math.ceil(info.sections / 2), hint: "Read the theory" },
    { key: "recognise", label: "Recognise", icon: Eye, href: text ? `/reading/${text.slug}` : "/reading", done: readDone, hint: text ? `Spot it in “${text.title}”` : "Spot it in a reading text" },
    { key: "practise", label: "Practise", icon: Dumbbell, href: `/grammar/${lesson}/practice`, done: m.band === "secure" || m.band === "mastered", hint: m.answered ? `${m.band.replace("_", " ")} so far` : "Controlled exercises" },
    { key: "produce", label: "Produce", icon: PenLine, href: "/writing", done: produced.length > 0, hint: "Use it in writing or speaking" },
    { key: "feedback", label: "Feedback", icon: MessageSquareText, href: "/writing/portfolio", done: produced.length > 0 && !flagged, hint: flagged ? "AI flagged this in your work" : "Learn from corrections" },
    { key: "revise", label: "Revise", icon: Repeat, href: `/practice/smart?lesson=${lesson}`, done: m.answered > 0 && openMistakes === 0, hint: openMistakes ? `${openMistakes} question${openMistakes === 1 ? "" : "s"} to retry` : "Spaced review" },
  ];
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
