import type { ActivityEvent, Attempt, ListeningLog, ResponseRow, ReviewLogRow, SavedItem, SpeakingAttempt, WritingSubmission } from "./store/types";
import { dayKey, mastery, studyDays } from "./progress";

/**
 * Progress analytics and the weekly report. Everything is computed from the learner's own rows,
 * with the rules written out in CRITERIA so the learner can see exactly how each score is made.
 */

export interface AnalyticsInput {
  events: ActivityEvent[];
  responses: ResponseRow[];
  attempts: Attempt[];
  reviewLogs: ReviewLogRow[];
  saved: SavedItem[];
  writing: WritingSubmission[];
  speaking: SpeakingAttempt[];
  listening: ListeningLog[];
  weeklyGoalDays: number;
}

export interface ContentInfo {
  lessons: { slug: string; title: string; sections: { id: string; title: string }[] }[];
  readingSlugs: string[];
  exerciseSkill: (slug: string) => string | undefined;
}

export type SectionKey = "consistency" | "activity" | "grammar" | "vocabulary" | "reading" | "listening" | "speaking" | "writing";

export const CRITERIA: Record<SectionKey, { label: string; rule: string; minEvidence: string }> = {
  consistency: { label: "Consistency", rule: "Study days this week ÷ your weekly goal (capped at 100%).", minEvidence: "Always assessed." },
  activity: { label: "Activities", rule: "Completed activities ÷ 10: each exercise, reading text, day of vocabulary review, listening log, speaking answer and essay counts as one.", minEvidence: "Always assessed." },
  grammar: { label: "Grammar accuracy", rule: "Percentage of grammar practice answers correct this week.", minEvidence: "At least 10 grammar answers." },
  vocabulary: { label: "Vocabulary retention", rule: "Percentage of revision cards rated Good or Easy this week.", minEvidence: "At least 10 vocabulary reviews." },
  reading: { label: "Reading", rule: "Percentage of reading questions answered correctly this week.", minEvidence: "At least 5 reading answers." },
  listening: { label: "Listening", rule: "Half from minutes listened (target 60 min), half from your average self-rated comprehension (1–5).", minEvidence: "At least one logged session." },
  speaking: { label: "Speaking", rule: "Average AI-estimated band this week ÷ 9.", minEvidence: "At least one speaking submission with feedback." },
  writing: { label: "Writing", rule: "Average AI-estimated band this week ÷ 9.", minEvidence: "At least one essay with feedback." },
};
export const SECTION_ORDER: SectionKey[] = ["consistency", "activity", "grammar", "vocabulary", "reading", "listening", "speaking", "writing"];

export interface SectionScore { key: SectionKey; score: number | null; evidence: string }
export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;
  overall: number | null;
  sections: SectionScore[];
  strongest: SectionKey[];
  weakest: SectionKey[];
  insufficient: SectionKey[];
  recurringMistakes: { label: string; count: number; href?: string }[];
  recommendations: string[];
  priorities: string[];
  totals: { studyDays: number; activities: number; minutesListened: number; answers: number };
  generatedAt: string;
}

export const mondayOf = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const bandOf = (fb: unknown) => (fb as { estimate?: { mean?: number } } | null)?.estimate?.mean;

function skillOfResponses(input: AnalyticsInput, info: ContentInfo) {
  const skillByAttempt = new Map(input.attempts.map((a) => [a.id, info.exerciseSkill(a.exerciseSlug) ?? "other"]));
  return (r: ResponseRow) => skillByAttempt.get(r.attemptId) ?? "other";
}

export function weeklyReport(input: AnalyticsInput, info: ContentInfo, weekStartDate: Date, now = new Date()): WeeklyReport {
  const start = mondayOf(weekStartDate);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  const inWeek = (iso: string) => { const t = Date.parse(iso); return t >= start.getTime() && t < end.getTime(); };
  const skill = skillOfResponses(input, info);

  const days = studyDays(input.events.filter((e) => inWeek(e.createdAt))).size;

  const ev = input.events.filter((e) => inWeek(e.createdAt));
  const listening = input.listening.filter((l) => inWeek(l.createdAt));
  const writing = input.writing.filter((w) => inWeek(w.createdAt));
  const speaking = input.speaking.filter((s) => inWeek(s.createdAt));
  const reviews = input.reviewLogs.filter((r) => inWeek(r.reviewedAt));
  const responses = input.responses.filter((r) => inWeek(r.createdAt));
  const gResp = responses.filter((r) => skill(r) === "grammar");
  const rResp = responses.filter((r) => skill(r) === "reading");
  const reviewSessions = new Set(ev.filter((e) => e.type === "review_completed").map((e) => dayKey(e.createdAt))).size; // one per day with reviews
  const activities = ev.filter((e) => e.type === "exercise_completed" || e.type === "reading_completed").length + reviewSessions + listening.length + writing.length + speaking.length;
  const minutes = listening.reduce((n, l) => n + l.minutes, 0);

  const sc = (key: SectionKey, score: number | null, evidence: string): SectionScore => ({ key, score: score === null ? null : Math.max(0, Math.min(100, Math.round(score))), evidence });
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sBands = speaking.map((s) => bandOf(s.feedback)).filter((b): b is number => typeof b === "number");
  const wBands = writing.map((w) => bandOf(w.feedback)).filter((b): b is number => typeof b === "number");

  const sections: SectionScore[] = [
    sc("consistency", pct(days, Math.max(1, input.weeklyGoalDays)), `${days} study day(s), goal ${input.weeklyGoalDays}`),
    sc("activity", activities * 10, `${activities} activities`),
    sc("grammar", gResp.length >= 10 ? pct(gResp.filter((r) => r.correct).length, gResp.length) : null, `${gResp.length} grammar answers`),
    sc("vocabulary", reviews.length >= 10 ? pct(reviews.filter((r) => r.rating >= 3).length, reviews.length) : null, `${reviews.length} reviews`),
    sc("reading", rResp.length >= 5 ? pct(rResp.filter((r) => r.correct).length, rResp.length) : null, `${rResp.length} reading answers`),
    sc("listening", listening.length ? Math.min(50, (minutes / 60) * 50) + (avg(listening.map((l) => l.comprehension)) / 5) * 50 : null, `${listening.length} session(s), ${minutes} min`),
    sc("speaking", sBands.length ? (avg(sBands) / 9) * 100 : null, sBands.length ? `${sBands.length} submission(s), average est. band ${avg(sBands).toFixed(1)}` : `${speaking.length} submission(s)`),
    sc("writing", wBands.length ? (avg(wBands) / 9) * 100 : null, wBands.length ? `${wBands.length} essay(s), average est. band ${avg(wBands).toFixed(1)}` : `${writing.length} essay(s)`),
  ];
  const assessed = sections.filter((s) => s.score !== null) as (SectionScore & { score: number })[];
  const insufficient = sections.filter((s) => s.score === null).map((s) => s.key);
  const skills = assessed.filter((s) => s.key !== "consistency" && s.key !== "activity");
  const sorted = [...skills].sort((a, b) => b.score - a.score);
  const overall = activities === 0 && days === 0 ? null : Math.round(avg(assessed.map((s) => s.score)));

  // Recurring mistakes: wrong answers grouped by rule, plus grammar areas flagged by AI feedback.
  const counts = new Map<string, { label: string; count: number; href?: string }>();
  const lessonTitle = (slug: string, section?: string) => {
    const l = info.lessons.find((x) => x.slug === slug);
    const s = l?.sections.find((x) => x.id === section);
    return l ? `${l.title}${s ? ` — ${s.title}` : ""}` : slug;
  };
  for (const r of responses.filter((x) => !x.correct && x.errorTag)) {
    const [slug, section] = r.errorTag!.split(":");
    const k = `rule:${r.errorTag}`;
    const cur = counts.get(k) ?? { label: lessonTitle(slug, section), count: 0, href: `/grammar/${slug}${section ? `#${section}` : ""}` };
    cur.count++; counts.set(k, cur);
  }
  for (const fb of [...writing, ...speaking].map((x) => x.feedback as { issues?: { grammarRef?: string | null; category?: string }[] } | null)) {
    for (const i of fb?.issues ?? []) {
      if (i.grammarRef?.startsWith("lesson:")) {
        const [slug, section] = i.grammarRef.slice(7).split("#");
        const k = `ai:${i.grammarRef}`;
        const cur = counts.get(k) ?? { label: `${lessonTitle(slug, section)} (in your writing/speaking)`, count: 0, href: `/grammar/${slug}#${section}` };
        cur.count++; counts.set(k, cur);
      } else if (i.category && i.category !== "grammar") {
        const k = `cat:${i.category}`;
        const cur = counts.get(k) ?? { label: `${i.category.replace(/_/g, " ")} issues in your writing/speaking`, count: 0 };
        cur.count++; counts.set(k, cur);
      }
    }
  }
  const recurringMistakes = [...counts.values()].filter((c) => c.count >= 2).sort((a, b) => b.count - a.count).slice(0, 6);

  const ADVICE: Record<SectionKey, string> = {
    consistency: `Aim for ${input.weeklyGoalDays} study days: short daily sessions beat one long one.`,
    activity: "Complete at least 10 activities next week — one exercise, one review session and one skill task per study day.",
    grammar: "Redo the practice for the rules in your recurring mistakes, then read the theory section each one links to.",
    vocabulary: "Review your due words every day; rate honestly so the schedule adapts.",
    reading: "Read one text with all its tasks and check every explanation, especially for True/False/Not Given.",
    listening: "Log two listening sessions of 20–30 minutes and use the ‘practise with any episode’ tasks.",
    speaking: "Do two 1-minute answers in the Speaking studio and one 2-minute answer.",
    writing: "Write one essay and act on the paragraph and argument advice in its feedback.",
  };
  const recommendations: string[] = [];
  for (const s of sorted.slice(-2).reverse()) if (s.score < 75) recommendations.push(`${CRITERIA[s.key].label} (${s.score}%): ${ADVICE[s.key]}`);
  for (const k of insufficient) recommendations.push(`${CRITERIA[k].label} was insufficiently assessed (${CRITERIA[k].minEvidence.toLowerCase()}): ${ADVICE[k]}`);
  if (recurringMistakes[0]) recommendations.unshift(`Your most frequent mistake was “${recurringMistakes[0].label}” (${recurringMistakes[0].count}×). Review that rule first.`);
  const priorities = [
    ...(recurringMistakes[0] ? [`Fix: ${recurringMistakes[0].label}`] : []),
    ...[...sorted].reverse().slice(0, 2).map((s) => `Improve ${CRITERIA[s.key].label.toLowerCase()}`),
    ...insufficient.filter((k) => k !== "consistency" && k !== "activity").slice(0, 2).map((k) => `Get evidence for ${CRITERIA[k].label.toLowerCase()}`),
  ].slice(0, 3);

  return {
    weekStart: dayKey(start), weekEnd: dayKey(new Date(end.getTime() - 1)), overall, sections,
    strongest: sorted.slice(0, 2).filter((s) => s.score >= 50).map((s) => s.key),
    weakest: [...sorted].reverse().slice(0, 2).map((s) => s.key),
    insufficient, recurringMistakes, recommendations: recommendations.slice(0, 6), priorities,
    totals: { studyDays: days, activities, minutesListened: minutes, answers: responses.length },
    generatedAt: now.toISOString(),
  };
}

/** Whole-history progress for each section (not just this week). */
export function sectionProgress(input: AnalyticsInput, info: ContentInfo) {
  const skill = skillOfResponses(input, info);
  const allSections = info.lessons.flatMap((l) => l.sections.map((s) => `${l.slug}#${s.id}`));
  const viewed = new Set(input.events.filter((e) => e.type === "lesson_section_viewed").map((e) => e.contentRef));
  const g = input.responses.filter((r) => skill(r) === "grammar");
  const rd = input.responses.filter((r) => skill(r) === "reading");
  const lessonsSecure = info.lessons.filter((l) => ["secure", "mastered"].includes(mastery(input.responses, l.slug).band)).length;
  const lessonsStarted = info.lessons.filter((l) => mastery(input.responses, l.slug).answered > 0).length;
  const textsDone = new Set(input.events.filter((e) => e.type === "reading_completed").map((e) => e.contentRef)).size;
  const vocab = input.saved.filter((s) => s.itemType === "sense" || s.itemType === "custom");
  const learned = vocab.filter((s) => s.status === "familiar" || s.status === "mastered").length;
  const revisedItems = new Set(input.reviewLogs.map((r) => r.savedItemId)).size;
  const minutes = input.listening.reduce((n, l) => n + l.minutes, 0);
  const sBands = input.speaking.map((s) => bandOf(s.feedback)).filter((b): b is number => typeof b === "number");
  const wBands = input.writing.map((w) => bandOf(w.feedback)).filter((b): b is number => typeof b === "number");
  const last = (xs: number[]) => (xs.length ? xs[0] : null);

  const rows = [
    { key: "grammar-theory", label: "Grammar theory", value: allSections.length ? allSections.filter((s) => viewed.has(s)).length / allSections.length : 0, detail: `${allSections.filter((s) => viewed.has(s)).length} of ${allSections.length} sections read` },
    { key: "grammar-practice", label: "Grammar practice", value: info.lessons.length ? lessonsSecure / info.lessons.length : 0, detail: `${lessonsSecure} of ${info.lessons.length} topics secure · ${lessonsStarted} started · ${g.length ? pct(g.filter((r) => r.correct).length, g.length) : 0}% accuracy (${g.length} answers)` },
    { key: "vocabulary", label: "Vocabulary", value: vocab.length ? learned / vocab.length : 0, detail: `${vocab.length} saved · ${learned} learned · ${revisedItems} revised (${input.reviewLogs.length} reviews)` },
    { key: "reading", label: "Reading", value: info.readingSlugs.length ? textsDone / info.readingSlugs.length : 0, detail: `${textsDone} of ${info.readingSlugs.length} texts completed · ${rd.length ? pct(rd.filter((r) => r.correct).length, rd.length) : 0}% accuracy` },
    { key: "listening", label: "Listening", value: Math.min(1, minutes / 600), detail: `${input.listening.length} sessions · ${minutes} min in total (bar target: 10 hours)` },
    { key: "speaking", label: "Speaking", value: Math.min(1, input.speaking.length / 20), detail: `${input.speaking.length} sessions${last(sBands) !== null ? ` · latest est. band ${last(sBands)}` : ""} (bar target: 20)` },
    { key: "writing", label: "Writing", value: Math.min(1, input.writing.length / 10), detail: `${input.writing.length} essays submitted${last(wBands) !== null ? ` · latest est. band ${last(wBands)}` : ""} (bar target: 10)` },
  ];
  const overall = rows.reduce((n, r) => n + r.value, 0) / rows.length;
  return { rows, overall, exercisesCompleted: input.attempts.length };
}

/** Activities per week for the last n weeks, split by skill (for the trend chart). */
export function weeklyActivity(input: AnalyticsInput, info: ContentInfo, weeks = 8, now = new Date()) {
  const skill = skillOfResponses(input, info);
  const m0 = mondayOf(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(m0); start.setDate(m0.getDate() - (weeks - 1 - i) * 7);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const inW = (iso: string) => { const t = Date.parse(iso); return t >= start.getTime() && t < end.getTime(); };
    const answers = input.responses.filter((r) => inW(r.createdAt));
    return {
      week: dayKey(start),
      grammar: answers.filter((r) => skill(r) === "grammar").length,
      reading: answers.filter((r) => skill(r) === "reading").length,
      vocabulary: input.reviewLogs.filter((r) => inW(r.reviewedAt)).length,
      listening: input.listening.filter((l) => inW(l.createdAt)).reduce((n, l) => n + l.minutes, 0),
      speaking: input.speaking.filter((s) => inW(s.createdAt)).length,
      writing: input.writing.filter((w) => inW(w.createdAt)).length,
    };
  });
}
