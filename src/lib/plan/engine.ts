import { getLesson, getReading, getSense, getWritingPrompt, getTheme, getExercise } from "../content";
import { mastery, dueItems } from "../progress";
import { mistakeQueue } from "../learning";
import { SPEAKING_BANK, bankPrompt } from "../speaking-bank";
import { visualFromSlug, getVisualTask, VISUAL_PREFIX } from "../visual";
import type { ActivityEvent, Attempt, ListeningLog, ResponseRow, ReviewCardRow, SavedItem, SpeakingAttempt, WritingSubmission, Profile } from "../store/types";
import { PROGRAMME, type PlanDay } from "./programme";
import { SKILL_LABEL, priorityOf, type Priority, type Skill, type SkillPriority } from "./personal";
import { THEME_LISTENING } from "../listening";

/**
 * Progress through the Intensive Study Plan is derived entirely from real activity: a block is complete
 * only when the matching exercise, text, essay, recording, log or review exists after the day began.
 * A day begins when the previous day was completed (or skipped), so the plan is self-paced. The only
 * stored state is the enrolment itself and any days the learner chose to skip.
 */
export interface PlanSettings { startedAt: string; intensity: "full" | "focused"; startWeek: 1 | 3; skipped: Record<string, string>; personal: boolean }
export const readPlan = (p: Profile | null): PlanSettings | null => {
  const raw = (p?.preferences as { intensive?: Partial<PlanSettings> } | undefined)?.intensive;
  return raw && typeof raw.startedAt === "string" ? { startedAt: raw.startedAt, intensity: raw.intensity ?? "full", startWeek: raw.startWeek ?? 1, skipped: raw.skipped ?? {}, personal: raw.personal !== false } : null;
};

export interface PlanData {
  events: ActivityEvent[]; attempts: Attempt[]; responses: ResponseRow[]; cards: ReviewCardRow[];
  writing: WritingSubmission[]; speaking: SpeakingAttempt[]; listening: ListeningLog[]; saved: SavedItem[];
}
export type BlockKey = "grammar" | "vocabulary" | "reading" | "listening" | "writing" | "speaking" | "revision" | "focus";
export interface Block { key: BlockKey; label: string; title: string; why: string; href: string; minutes: number; required: boolean; doneAt: string | null; result?: string; skill?: Skill; priority?: Priority }
export interface DayView { day: PlanDay; start: string | null; blocks: Block[]; status: "done" | "skipped" | "current" | "upcoming"; completedAt: string | null; minutes: number }

const after = (iso: string | undefined | null, start: string) => !!iso && iso >= start;
const firstAfter = (xs: (string | null | undefined)[], start: string) => xs.filter((x): x is string => after(x, start)).sort()[0] ?? null;
const lessonsOf = (d: PlanDay) => (Array.isArray(d.grammar) ? d.grammar : [d.grammar]);
const LABEL: Record<BlockKey, string> = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", listening: "Listening", writing: "Academic Writing", speaking: "Speaking", revision: "Revision", focus: "Focus" };

/** A speaking prompt from the day's category, close to its level, that the learner hasn't answered yet. */
export function speakingPromptFor(d: PlanDay, done: string[]) {
  const rank = { B2: 0, "B2+": 1, C1: 2, C2: 3 } as const;
  const inCat = SPEAKING_BANK.filter((p) => p.category === d.speaking);
  return [...inCat].sort((a, b) => Math.abs(rank[a.level] - rank[d.level]) - Math.abs(rank[b.level] - rank[d.level]) || a.id.localeCompare(b.id)).find((p) => !done.includes(p.id)) ?? inCat[0];
}

function blocksFor(d: PlanDay, start: string, data: PlanData, s: PlanSettings): Block[] {
  const blocks: Block[] = [];
  const lessons = lessonsOf(d);
  const attemptsAfter = data.attempts.filter((a) => after(a.completedAt, start));
  const review = d.kind === "review";

  // 1. Grammar
  if (lessons.length === 1) {
    const slug = lessons[0], l = getLesson(slug);
    const before = mastery(data.responses.filter((r) => r.createdAt < start), slug);
    const secure = before.band === "secure" || before.band === "mastered";
    const slugs = [...(l?.exercises ?? []), `smart-lesson-${slug}`];
    const att = attemptsAfter.filter((a) => slugs.includes(a.exerciseSlug)).sort((a, b) => a.completedAt.localeCompare(b.completedAt))[0];
    blocks.push({ key: "grammar", label: LABEL.grammar, title: secure ? `Consolidate: ${l?.title}` : l?.title ?? slug,
      why: secure ? "You already answer this topic accurately, so today is a short retrieval check rather than a full lesson." : "Read the theory (parts A–I), then complete the practice set; every answer explains the rule.",
      href: secure ? `/practice/smart?lesson=${slug}` : `/grammar/${slug}`, minutes: secure ? 10 : Math.min(35, l?.minutes ?? 30), required: true,
      doneAt: att?.completedAt ?? null, result: att ? `${att.score}/${att.total}` : undefined });
  } else {
    const att = attemptsAfter.find((a) => a.exerciseSlug === `smart-plan-${d.n}`);
    blocks.push({ key: "grammar", label: review ? "Grammar check" : "Grammar retrieval", title: `${review ? "Assessment" : "Mixed retrieval"}: ${lessons.map((x) => getLesson(x)?.title.split(":")[0]).filter(Boolean).slice(0, 3).join(", ")}${lessons.length > 3 ? "…" : ""}`,
      why: review ? "Answer without looking at the theory first. The result shows which topics need more work next week." : "Interleaved questions from several earlier topics: harder than blocked practice, and better for long-term retention.",
      href: `/practice/smart?plan=${d.n}`, minutes: 20, required: true, doneAt: att?.completedAt ?? null, result: att ? `${Math.round((att.score / Math.max(1, att.total)) * 100)}%` : undefined });
  }
  // 2. Vocabulary
  if (review) {
    const r = firstAfter(data.events.filter((e) => e.type === "review_completed").map((e) => e.createdAt), start);
    blocks.push({ key: "vocabulary", label: "Vocabulary retrieval", title: "Spaced review of your saved words", why: "Active recall of the words you saved this week, scheduled just before you would forget them.", href: "/review", minutes: 10, required: true, doneAt: r });
  } else {
    const savedTheme = data.saved.filter((x) => x.itemType === "sense" && after(x.createdAt, start) && getSense(x.itemRef)?.sense.topics.includes(d.theme)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    blocks.push({ key: "vocabulary", label: LABEL.vocabulary, title: `${getTheme(d.theme)?.title ?? d.theme}: choose 5 items to use`, why: "Study the theme, then save at least three words, collocations or idioms you will use in today's writing and speaking.",
      href: `/vocabulary/topics/${d.theme}`, minutes: 15, required: true, doneAt: savedTheme[2]?.createdAt ?? null, result: `${Math.min(savedTheme.length, 3)}/3 saved` });
  }
  // 3. Reading (not on review days)
  if (!review) {
    const r = getReading(d.reading);
    const readBefore = data.events.some((e) => e.type === "reading_completed" && e.contentRef === d.reading && e.createdAt < start && Date.parse(start) - Date.parse(e.createdAt) < 10 * 864e5);
    const doneAt = firstAfter(data.events.filter((e) => e.type === "reading_completed" && e.contentRef === d.reading).map((e) => e.createdAt), start);
    blocks.push({ key: "reading", label: LABEL.reading, title: r?.title ?? d.reading,
      why: d.readingFocus ? `Spaced re-reading. ${d.readingFocus}` : readBefore ? "You read this recently: skim it and focus on how the target grammar is used." : "Read for meaning first, then notice today's grammar and vocabulary in context. Mark it as read, then answer the questions.",
      href: `/reading/${d.reading}`, minutes: d.readingFocus || readBefore ? 12 : r?.level === "C2" ? 25 : 20, required: true, doneAt });
  }
  // 4. Listening
  if (!review) {
    const doneAt = firstAfter(data.listening.map((l) => l.createdAt), start);
    blocks.push({ key: "listening", label: LABEL.listening, title: "One episode on today's theme", why: "Listen to a short episode from the recommended source (or any on the theme) and log it with your comprehension rating.",
      href: `/listening#${d.listening}`, minutes: 15, required: s.intensity === "full" || d.n % 2 === 1, doneAt });
  }
  // 5. Writing
  const target = d.writing.kind === "essay" ? d.writing.slug : `${VISUAL_PREFIX}${d.writing.id}`;
  const w = data.writing.filter((x) => x.promptSlug === target && after(x.createdAt, start)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const essay = d.writing.kind === "essay" ? getWritingPrompt(d.writing.slug) : null;
  const visual = d.writing.kind === "visual" ? getVisualTask(d.writing.id) : null;
  blocks.push({ key: "writing", label: review ? "Timed writing" : LABEL.writing, title: essay?.title ?? visual?.title ?? target,
    why: essay ? "Plan for five minutes, then write the essay using at least three of today's saved items and one of today's grammar structures." : `${review ? "Write in 20 minutes without notes. " : ""}Describe the visual accurately; feedback checks your facts against the data.`,
    href: essay ? `/writing/${essay.slug}` : `/writing/visual/task?id=${d.writing.kind === "visual" ? d.writing.id : ""}`, minutes: essay ? 40 : 20,
    required: review || s.intensity === "full" || d.n % 2 === 0, doneAt: w?.createdAt ?? null,
    result: w ? ((w.feedback as { estimate?: { mean?: number } } | null)?.estimate?.mean ? `band ≈ ${(w.feedback as { estimate: { mean: number } }).estimate.mean}` : w.status === "failed" ? "saved, not assessed" : "submitted") : undefined });
  // 6. Speaking
  const spokenIds = data.speaking.map((x) => x.promptSlug.replace(/^bank:/, ""));
  const sp = speakingPromptFor(d, spokenIds);
  const spoke = data.speaking.filter((x) => after(x.createdAt, start) && bankPrompt(x.promptSlug.replace(/^bank:/, ""))?.category === d.speaking).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  blocks.push({ key: "speaking", label: LABEL.speaking, title: sp?.prompt ?? "A topic on today's theme", why: "Answer for one or two minutes. Open “Language for this topic” and aim to use today's vocabulary and grammar without reading it.",
    href: sp ? `/speaking?topic=${sp.id}` : "/speaking", minutes: 10, required: true, doneAt: spoke?.createdAt ?? null });
  // 7. Revision
  const due = dueItems(data.saved, data.cards).length, mistakes = mistakeQueue(data.responses, data.attempts).length;
  const planLessons = PROGRAMME.filter((x) => x.n < d.n).flatMap(lessonsOf);
  const weak = [...new Set(planLessons)].map((l) => ({ l, m: mastery(data.responses, l) })).filter((x) => x.m.answered >= 3 && x.m.accuracy < 0.7).sort((a, b) => a.m.accuracy - b.m.accuracy)[0];
  const revDone = firstAfter([...data.events.filter((e) => e.type === "review_completed").map((e) => e.createdAt), ...data.attempts.filter((a) => /^smart-(mistakes|weak|mixed|lesson)/.test(a.exerciseSlug)).map((a) => a.completedAt)], start);
  const rev = weak ? { title: `Strengthen: ${getLesson(weak.l)?.title}`, href: `/practice/smart?lesson=${weak.l}`, why: `Your accuracy on this earlier topic is ${Math.round(weak.m.accuracy * 100)}%, so it comes back today.` }
    : due > 0 ? { title: `Review ${due} word${due === 1 ? "" : "s"} due today`, href: "/review", why: "Spaced repetition: these words are scheduled for today." }
    : mistakes > 0 ? { title: `Retry ${Math.min(mistakes, 10)} earlier mistake${mistakes === 1 ? "" : "s"}`, href: "/practice/smart?mode=mistakes", why: "Questions you answered wrongly come back until you get them right." }
    : { title: "Mixed retrieval from earlier topics", href: "/practice/smart?mode=mixed", why: "A short interleaved set keeps earlier topics active." };
  blocks.push({ key: "revision", label: review ? "Weak points" : LABEL.revision, ...rev, minutes: 10, required: true, doneAt: revDone });
  return blocks;
}

// ---------- Personalisation (a transparent layer over the universal day) ----------
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const SKILL_OF: Partial<Record<BlockKey, Skill>> = { grammar: "grammar", vocabulary: "vocabulary", reading: "reading", listening: "listening", writing: "writing", speaking: "speaking" };

/** An extra block for a high-priority skill, built from the same day's theme, text and grammar. */
function focusBlock(skill: Skill, d: PlanDay, start: string, data: PlanData): Block {
  const lesson = lessonsOf(d)[0];
  const lt = getLesson(lesson)?.title.split(":")[0] ?? lesson;
  const theme = getTheme(d.theme)?.title ?? d.theme;
  const since = data.attempts.filter((a) => after(a.completedAt, start));
  const base = { key: "focus" as const, label: `${SKILL_LABEL[skill]} focus`, skill, priority: "high" as const, required: true, minutes: 15 };
  switch (skill) {
    case "listening": {
      const logs = data.listening.filter((l) => after(l.createdAt, start)).map((l) => l.createdAt).sort();
      const topic = THEME_LISTENING[d.theme]?.[0];
      return { ...base, title: `A second episode on ${theme.toLowerCase()}, with a different accent or speed`, why: "Listening is one of your priorities: two shorter sessions a day build more than one long one. Note five words from today's theme you hear, then log the episode.", href: topic ? `/listening?topic=${topic}` : "/listening", doneAt: logs[1] ?? null };
    }
    case "speaking": {
      const sp = data.speaking.filter((x) => after(x.createdAt, start)).map((x) => x.createdAt).sort();
      return { ...base, title: `A second answer, this time using ${lt.toLowerCase()}`, why: "Speaking is one of your priorities: repeat a topic with a different focus, aiming to use today's grammar and three theme words without notes.", href: "/speaking", minutes: 10, doneAt: sp[1] ?? null };
    }
    case "writing": {
      const at = since.find((a) => a.exerciseSlug === `grammar-produce-${lesson}`);
      return { ...base, title: `Write a paragraph with today's grammar: ${lt}`, why: "Academic Writing is one of your priorities: a short guided paragraph with a self-check, before the longer task.", href: `/grammar/${lesson}?stage=produce`, doneAt: at?.completedAt ?? null };
    }
    case "grammar": {
      const at = since.find((a) => a.exerciseSlug === `grammar-recognise-${lesson}`);
      return { ...base, title: `Spot it in context: ${lt}`, why: "Grammar is one of your priorities: recognising the structure in a real passage connects the rule to meaning.", href: `/grammar/${lesson}?stage=recognise`, minutes: 10, doneAt: at?.completedAt ?? null };
    }
    case "vocabulary": {
      const at = since.find((a) => a.exerciseSlug === `vocab-context-${d.theme}`);
      return { ...base, title: `${theme} vocabulary in context`, why: "Vocabulary is one of your priorities: gap-fills, meaning in context and your own sentence move words from recognition to use.", href: `/vocabulary/topics/${d.theme}/context`, doneAt: at?.completedAt ?? null };
    }
    case "reading": {
      const at = since.find((a) => getExercise(a.exerciseSlug)?.target.ref === d.reading);
      return { ...base, title: `Close reading: the questions on ${getReading(d.reading)?.title ?? d.reading}`, why: "Reading is one of your priorities: answer the comprehension questions and check the explanation for each one.", href: `/reading/${d.reading}`, doneAt: at?.completedAt ?? null };
    }
  }
}

/** Re-weight a universal day for one learner. Nothing is removed: stronger skills become shorter or every other day. */
export function personaliseDay(blocks: Block[], d: PlanDay, start: string, data: PlanData, s: PlanSettings, ps: SkillPriority[]): Block[] {
  const review = d.kind === "review";
  const out: Block[] = [];
  for (const b of blocks) {
    const sk = SKILL_OF[b.key];
    const pr = sk ? priorityOf(ps, sk) : null;
    if (!sk || !pr || pr === "medium") { out.push(sk ? { ...b, skill: sk, priority: "medium" } : b); continue; }
    if (pr === "high") {
      out.push({ ...b, skill: sk, priority: "high", required: true, minutes: review ? b.minutes : round5(b.minutes * 1.25) });
      continue;
    }
    // maintenance
    if (review) { out.push({ ...b, skill: sk, priority: "maintenance" }); continue; }
    const anchor = b.key === "grammar" || b.key === "vocabulary"; // the day is built around these, so they stay, shorter
    const everyDay = b.key === "reading" || b.key === "speaking" || s.intensity === "full";
    out.push({ ...b, skill: sk, priority: "maintenance", minutes: anchor ? Math.max(10, round5(b.minutes * 0.7)) : round5(b.minutes * 0.7),
      required: anchor ? b.required : everyDay ? b.required && d.n % 2 === 0 : b.required,
      why: `${b.why} Shorter today: this is one of your stronger areas, kept for regular revision.` });
  }
  if (!review) {
    const tops = ps.filter((p) => p.priority === "high").sort((a, b) => b.need - a.need).slice(0, 2);
    for (const t of tops) {
      const at = out.findIndex((b) => b.skill === t.skill);
      out.splice(at >= 0 ? at + 1 : out.length - 1, 0, focusBlock(t.skill, d, start, data));
    }
  }
  return out;
}

export function planProgress(s: PlanSettings, data: PlanData, priorities?: SkillPriority[] | null): { days: DayView[]; current: DayView | null; doneCount: number } {
  const shape = (d: PlanDay, start: string) => { const b = blocksFor(d, start, data, s); return s.personal && priorities ? personaliseDay(b, d, start, data, s, priorities) : b; };
  const days: DayView[] = [];
  let start: string | null = s.startedAt;
  const first = s.startWeek === 3 ? 15 : 1;
  for (const d of PROGRAMME) {
    if (d.n < first) continue;
    if (!start) { days.push({ day: d, start: null, blocks: shape(d, "9999").map((b) => ({ ...b, doneAt: null, result: undefined })), status: "upcoming", completedAt: null, minutes: 0 }); continue; }
    const blocks = shape(d, start);
    const skipped = s.skipped[String(d.n)];
    const req = blocks.filter((b) => b.required);
    const allDone = req.every((b) => b.doneAt);
    const completedAt = skipped ?? (allDone ? req.map((b) => b.doneAt!).sort().at(-1)! : null);
    days.push({ day: d, start, blocks, status: skipped ? "skipped" : allDone ? "done" : "current", completedAt, minutes: blocks.filter((b) => b.required).reduce((n, b) => n + b.minutes, 0) });
    start = completedAt; // the next day starts when this one is finished
  }
  for (const v of days) v.minutes ||= v.blocks.filter((b) => b.required).reduce((n, b) => n + b.minutes, 0);
  return { days, current: days.find((x) => x.status === "current") ?? null, doneCount: days.filter((x) => x.status === "done").length };
}

/** Weekly assessment results and topics that keep causing problems. */
export function planInsights(s: PlanSettings, data: PlanData, days: DayView[]) {
  const assessments = days.filter((d) => d.day.kind === "review").map((d) => ({ week: d.day.week, result: d.blocks.find((b) => b.key === "grammar")?.result ?? null }));
  const seen = [...new Set(days.filter((d) => d.status !== "upcoming").flatMap((d) => lessonsOf(d.day)))];
  const weak = seen.map((l) => ({ slug: l, title: getLesson(l)?.title ?? l, m: mastery(data.responses, l) })).filter((x) => x.m.answered >= 3 && x.m.accuracy < 0.7).sort((a, b) => a.m.accuracy - b.m.accuracy);
  return { assessments, weak };
}

export const planLessonsFor = (n: number) => { const d = PROGRAMME.find((x) => x.n === n); return d ? lessonsOf(d) : []; };
export { visualFromSlug };
