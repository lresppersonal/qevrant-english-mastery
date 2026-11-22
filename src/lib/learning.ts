/**
 * Personalised learning engine. Everything here is computed from the learner's own
 * activity (answers, attempts, reviews, essays, speaking, listening) — no guesses
 * and no hidden server calls — so recommendations update automatically after every action.
 *
 * Learning cycle used across the platform:
 *   Understand (theory) → Recognise (reading) → Practise (exercises) → Produce (writing/speaking)
 *   → Feedback (AI + explanations) → Revise (spaced repetition + mistake review)
 */
import type { Exercise, Question, GrammarLesson, Level } from "./content/schema";
import { exercises, grammarLessons, grammarDomains, readingTexts, LEVEL_ORDER } from "./content";
import { mastery, dueItems } from "./progress";
import type { ActivityEvent, Attempt, ListeningLog, ResponseRow, ReviewCardRow, ReviewLogRow, SavedItem, SpeakingAttempt, WritingSubmission } from "./store/types";

export interface LearnerSnapshot {
  events: ActivityEvent[];
  responses: ResponseRow[];
  attempts: Attempt[];
  cards: ReviewCardRow[];
  reviewLogs: ReviewLogRow[];
  saved: SavedItem[];
  writing: WritingSubmission[];
  speaking: SpeakingAttempt[];
  listening: ListeningLog[];
  selfLevel: Level | null;
}

const DAY = 864e5;
const ago = (iso: string, now: number) => (now - Date.parse(iso)) / DAY;

// ---------- question pool ----------
export interface PoolItem { key: string; exercise: Exercise; question: Question; lesson: string | null }

/**
 * Question ids in content are only unique inside their exercise ("q1", "q2"…), so the engine
 * always works with a qualified key "exercise-slug/q1". Responses saved from a normal exercise
 * carry the short id (the exercise is known from the attempt); smart sets save the qualified key.
 */
export const qid = (exerciseSlug: string, id: string) => `${exerciseSlug}/${id}`;
export function responseKeyer(attempts: Pick<Attempt, "id" | "exerciseSlug">[]) {
  const slug = new Map(attempts.map((a) => [a.id, a.exerciseSlug]));
  return (r: Pick<ResponseRow, "attemptId" | "questionId">) => (r.questionId.includes("/") ? r.questionId : qid(slug.get(r.attemptId) ?? "?", r.questionId));
}
let poolCache: Map<string, PoolItem> | null = null;
/** Every grammar question, indexed by id (reading questions stay with their texts). */
export function questionPool(): Map<string, PoolItem> {
  if (poolCache) return poolCache;
  poolCache = new Map();
  for (const ex of exercises) {
    if (ex.skill !== "grammar") continue;
    for (const q of ex.questions) poolCache.set(qid(ex.slug, q.id), { key: qid(ex.slug, q.id), exercise: ex, question: q, lesson: q.theoryAnchor?.lesson ?? (ex.target.type === "lesson" ? ex.target.ref : null) });
  }
  return poolCache;
}

/** Questions whose most recent answer was wrong: the learner's personal mistake queue. */
export function mistakeQueue(responses: ResponseRow[], attempts: Pick<Attempt, "id" | "exerciseSlug">[]): { id: string; lastWrongAt: string; times: number }[] {
  const pool = questionPool();
  const key = responseKeyer(attempts);
  const latest = new Map<string, ResponseRow & { key: string }>();
  const wrongCount = new Map<string, number>();
  for (const r0 of responses) {
    const r = { ...r0, key: key(r0) };
    if (!pool.has(r.key)) continue;
    const prev = latest.get(r.key);
    if (!prev || r.createdAt >= prev.createdAt) latest.set(r.key, r);
    if (!r.correct) wrongCount.set(r.key, (wrongCount.get(r.key) ?? 0) + 1);
  }
  return [...latest.values()].filter((r) => !r.correct)
    .map((r) => ({ id: r.key, lastWrongAt: r.createdAt, times: wrongCount.get(r.key) ?? 1 }))
    .sort((a, b) => b.times - a.times || a.lastWrongAt.localeCompare(b.lastWrongAt));
}

// ---------- level ----------
export function estimateLevel(s: LearnerSnapshot): { level: Level; basis: string } {
  const evidence: string[] = [];
  let level: Level = s.selfLevel ?? "B2";
  if (s.selfLevel) evidence.push(`your own estimate (${s.selfLevel})`);
  // highest level band where grammar accuracy is solid on enough answers
  let best: Level | null = null;
  for (const lv of LEVEL_ORDER) {
    const lessonSlugs = new Set(grammarLessons.filter((l) => l.level === lv).map((l) => l.slug));
    const rows = s.responses.filter((r) => lessonSlugs.has(r.targetRef ?? "")).slice(-40);
    if (rows.length >= 10 && rows.filter((r) => r.correct).length / rows.length >= 0.75) best = lv;
  }
  if (best) { evidence.push(`75%+ accuracy on ${best} grammar`); if (LEVEL_ORDER.indexOf(best) > LEVEL_ORDER.indexOf(level)) level = best; }
  const ai = [...s.writing, ...s.speaking].slice(0, 6).map((x) => (x.feedback as { indicativeLevel?: string } | null)?.indicativeLevel).filter((x): x is Level => !!x && (LEVEL_ORDER as string[]).includes(x));
  if (ai.length >= 2) {
    const sorted = ai.map((x) => LEVEL_ORDER.indexOf(x)).sort((a, b) => a - b);
    const median = LEVEL_ORDER[sorted[Math.floor(sorted.length / 2)]];
    evidence.push(`AI feedback on your last ${ai.length} essays/answers (${median})`);
    level = median;
  }
  return { level, basis: evidence.length ? `Based on ${evidence.join(", ")}.` : "Based on the default starting level. It will adjust as you practise." };
}

// ---------- weak areas ----------
export interface Weakness { key: string; label: string; detail: string; href: string; practiceHref?: string; severity: number }

export function weakAreas(s: LearnerSnapshot, now = Date.now()): Weakness[] {
  const out: Weakness[] = [];
  for (const l of grammarLessons) {
    const m = mastery(s.responses, l.slug);
    if (m.answered >= 3 && m.accuracy < 0.7) out.push({ key: `lesson:${l.slug}`, label: l.title, detail: `${Math.round(m.accuracy * 100)}% correct in your last ${m.answered} answers`, href: `/grammar/${l.slug}`, practiceHref: `/practice/smart?lesson=${l.slug}`, severity: 1 - m.accuracy + 0.1 });
  }
  // recurring rule-level mistakes in the last 30 days
  const tags = new Map<string, number>();
  for (const r of s.responses) if (!r.correct && r.errorTag && ago(r.createdAt, now) <= 30) tags.set(r.errorTag, (tags.get(r.errorTag) ?? 0) + 1);
  for (const [tag, n] of tags) {
    if (n < 2) continue;
    const [slug, section] = tag.split(":");
    const lesson = grammarLessons.find((l) => l.slug === slug);
    if (!lesson || out.some((w) => w.key === `lesson:${slug}`)) continue;
    const sec = lesson.sections.find((x) => x.id === section);
    out.push({ key: `rule:${tag}`, label: `${lesson.title}${sec ? ` — ${sec.title}` : ""}`, detail: `${n} mistakes in the last 30 days`, href: `/grammar/${slug}${section ? `#${section}` : ""}`, practiceHref: `/practice/smart?lesson=${slug}`, severity: Math.min(1, n / 5) });
  }
  // grammar and vocabulary problems AI found in your own writing and speaking
  const aiRefs = new Map<string, number>(); const cats = new Map<string, number>();
  for (const x of [...s.writing, ...s.speaking]) {
    if (ago(x.createdAt, now) > 45) continue;
    for (const i of (x.feedback as { issues?: { grammarRef?: string | null; category?: string; severity?: string }[] } | null)?.issues ?? []) {
      if (i.severity === "style") continue;
      if (i.grammarRef?.startsWith("lesson:")) aiRefs.set(i.grammarRef.slice(7).split("#")[0], (aiRefs.get(i.grammarRef.slice(7).split("#")[0]) ?? 0) + 1);
      if (i.category && i.category !== "grammar") cats.set(i.category, (cats.get(i.category) ?? 0) + 1);
    }
  }
  for (const [slug, n] of aiRefs) {
    if (n < 2) continue;
    const lesson = grammarLessons.find((l) => l.slug === slug);
    if (!lesson || out.some((w) => w.key === `lesson:${slug}`)) continue;
    out.push({ key: `ai:${slug}`, label: lesson.title, detail: `flagged ${n} times in your essays and speaking`, href: `/grammar/${slug}`, practiceHref: `/practice/smart?lesson=${slug}`, severity: Math.min(1, n / 4) });
  }
  const CAT: Record<string, [string, string]> = {
    collocation: ["Collocations", "/vocabulary"], vocabulary: ["Word choice", "/vocabulary"], cohesion: ["Cohesion and linking", "/grammar/linking-contrast-concession"],
    register: ["Formal register", "/grammar/academic-register"], task: ["Answering the question fully", "/writing/essays"], spelling_punctuation: ["Spelling and punctuation", "/writing"],
  };
  for (const [c, n] of cats) if (n >= 3 && CAT[c]) out.push({ key: `cat:${c}`, label: CAT[c][0], detail: `${n} issues in your recent essays and speaking`, href: CAT[c][1], severity: Math.min(1, n / 8) });
  return out.sort((a, b) => b.severity - a.severity).slice(0, 5);
}

// ---------- revision ----------
export function revisionNeeds(s: LearnerSnapshot, now = Date.now()) {
  const dueWords = dueItems(s.saved, s.cards).length;
  const mistakes = mistakeQueue(s.responses, s.attempts).length;
  // secure lessons not practised for 3+ weeks fade: refresh them
  const lastPractised = new Map<string, string>();
  for (const r of s.responses) { const t = r.targetRef ?? ""; if (!lastPractised.has(t) || r.createdAt > lastPractised.get(t)!) lastPractised.set(t, r.createdAt); }
  const fading = grammarLessons.filter((l) => {
    const m = mastery(s.responses, l.slug);
    const last = lastPractised.get(l.slug);
    return (m.band === "secure" || m.band === "mastered") && last && ago(last, now) > 21;
  }).map((l) => ({ slug: l.slug, title: l.title, days: Math.round(ago(lastPractised.get(l.slug)!, now)) }));
  return { dueWords, mistakes, fading };
}

// ---------- next lesson ----------
/** Curriculum order: grammar-map order, then level. */
export function curriculum(): GrammarLesson[] {
  const order: string[] = [];
  for (const d of grammarDomains) for (const t of d.topics) if (t.lesson && !order.includes(t.lesson)) order.push(t.lesson);
  for (const l of grammarLessons) if (!order.includes(l.slug)) order.push(l.slug);
  return order.map((slug) => grammarLessons.find((l) => l.slug === slug)!).filter(Boolean);
}
export function nextLesson(s: LearnerSnapshot, level: Level): GrammarLesson | null {
  const started = new Set(s.responses.map((r) => r.targetRef ?? ""));
  const viewed = new Set(s.events.filter((e) => e.type === "lesson_section_viewed").map((e) => (e.contentRef ?? "").split("#")[0]));
  const rank = LEVEL_ORDER.indexOf(level);
  const list = curriculum();
  const inProgress = list.find((l) => viewed.has(l.slug) && mastery(s.responses, l.slug).band === "not_started");
  if (inProgress) return inProgress;
  return list.find((l) => !started.has(l.slug) && Math.abs(LEVEL_ORDER.indexOf(l.level) - rank) <= 1)
    ?? list.find((l) => mastery(s.responses, l.slug).band === "practising") ?? null;
}

// ---------- neglected skills ----------
export function neglectedSkills(s: LearnerSnapshot, now = Date.now()) {
  const last = (xs: string[]) => xs.length ? Math.min(...xs.map((x) => ago(x, now))) : Infinity;
  const skills = [
    { key: "reading", label: "Reading", href: "/reading", days: last(s.events.filter((e) => e.type === "reading_completed").map((e) => e.createdAt)) },
    { key: "listening", label: "Listening", href: "/listening", days: last(s.listening.map((l) => l.createdAt)) },
    { key: "speaking", label: "Speaking", href: "/speaking", days: last(s.speaking.map((x) => x.createdAt)) },
    { key: "writing", label: "Writing", href: "/writing", days: last(s.writing.map((x) => x.createdAt)) },
    { key: "vocabulary", label: "Vocabulary review", href: "/review", days: last(s.reviewLogs.map((r) => r.reviewedAt)) },
  ];
  return skills.filter((x) => x.days > 7).sort((a, b) => b.days - a.days);
}

// ---------- today's plan ----------
export interface PlanTask { key: string; stage: "Understand" | "Recognise" | "Practise" | "Produce" | "Revise"; title: string; reason: string; href: string; minutes: number; done: boolean }

export function todaysPlan(s: LearnerSnapshot, now = Date.now()): { tasks: PlanTask[]; level: ReturnType<typeof estimateLevel>; weak: Weakness[]; revise: ReturnType<typeof revisionNeeds>; next: GrammarLesson | null; neglected: ReturnType<typeof neglectedSkills> } {
  const level = estimateLevel(s);
  const weak = weakAreas(s, now);
  const revise = revisionNeeds(s, now);
  const next = nextLesson(s, level.level);
  const neglected = neglectedSkills(s, now);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const doneToday = (pred: (e: ActivityEvent) => boolean) => s.events.some((e) => Date.parse(e.createdAt) >= today.getTime() && pred(e));
  const tasks: PlanTask[] = [];

  if (revise.dueWords > 0 || doneToday((e) => e.type === "review_completed"))
    tasks.push({ key: "review", stage: "Revise", title: revise.dueWords ? `Review ${revise.dueWords} word${revise.dueWords === 1 ? "" : "s"} due today` : "Vocabulary review", reason: "Spaced repetition: these are scheduled for today, just before you'd forget them.", href: "/review", minutes: Math.min(15, Math.max(3, Math.ceil(revise.dueWords * 0.4))), done: revise.dueWords === 0 });
  if (weak[0]?.practiceHref)
    tasks.push({ key: "weak", stage: "Practise", title: `Strengthen: ${weak[0].label}`, reason: `Your weakest area right now (${weak[0].detail}).`, href: weak[0].practiceHref, minutes: 10, done: false });
  else if (revise.mistakes > 0)
    tasks.push({ key: "mistakes", stage: "Revise", title: `Retry ${Math.min(revise.mistakes, 10)} question${revise.mistakes === 1 ? "" : "s"} you got wrong`, reason: "Correcting earlier mistakes is one of the fastest ways to make a rule stick.", href: "/practice/smart?mode=mistakes", minutes: 8, done: false });
  if (next) {
    const startedNext = s.events.some((e) => e.type === "lesson_section_viewed" && (e.contentRef ?? "").startsWith(`${next.slug}#`));
    tasks.push({ key: "lesson", stage: startedNext ? "Practise" : "Understand", title: `${startedNext ? "Continue" : "Learn"}: ${next.title}`, reason: startedNext ? "You've read part of this lesson; finish it and try the practice." : `The next topic in your path at ${next.level}.`, href: startedNext ? `/grammar/${next.slug}/practice` : `/grammar/${next.slug}`, minutes: startedNext ? 12 : next.minutes, done: false });
  }
  const skill = neglected[0];
  if (skill) tasks.push({ key: `skill:${skill.key}`, stage: skill.key === "reading" || skill.key === "listening" ? "Recognise" : skill.key === "vocabulary" ? "Revise" : "Produce", title: `${skill.label}: ${skill.key === "speaking" ? "one 1-minute answer" : skill.key === "writing" ? "one paragraph or essay" : skill.key === "reading" ? "one text with its tasks" : skill.key === "listening" ? "one short episode" : "one session"}`, reason: Number.isFinite(skill.days) ? `You haven't practised ${skill.label.toLowerCase()} for ${Math.round(skill.days)} days.` : `You haven't tried ${skill.label.toLowerCase()} yet.`, href: skill.href, minutes: skill.key === "writing" ? 25 : 10, done: false });
  // Fill the plan with a production task (or a reading text if reading was not already suggested), never two of the same kind.
  const has = (k: string) => tasks.some((t) => t.key === k);
  if (tasks.length < 3 && has("skill:reading") && !has("skill:speaking")) tasks.push({ key: "skill:speaking", stage: "Produce", title: "Speaking: one 1-minute answer", reason: "Use today's grammar and vocabulary in your own words, then read the feedback.", href: "/speaking", minutes: 10, done: false });
  if (tasks.length < 3 && !has("skill:reading")) tasks.push({ key: "read", stage: "Recognise", title: `Read: ${readingTexts[(new Date(now).getDate()) % readingTexts.length].title}`, reason: "See grammar and vocabulary used naturally, then check your understanding.", href: `/reading/${readingTexts[(new Date(now).getDate()) % readingTexts.length].slug}`, minutes: 15, done: false });
  return { tasks: tasks.slice(0, 4), level, weak, revise, next, neglected };
}

// ---------- smart practice sets ----------
export type SmartMode = "mistakes" | "weak" | "mixed" | "lesson";
/** Builds a practice set from real questions: mistakes first, then weak lessons, then spaced mixed review. */
export function buildSmartSet(s: Pick<LearnerSnapshot, "responses" | "attempts">, mode: SmartMode, opts: { lesson?: string; lessons?: string[]; slug?: string; title?: string; size?: number; seed?: number } = {}): { exercise: Exercise; reason: string } | null {
  const pool = questionPool();
  const size = opts.size ?? 10;
  let seed = opts.seed ?? Date.now();
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [rand(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const mistakes = mistakeQueue(s.responses, s.attempts).map((m) => pool.get(m.id)!).filter(Boolean);
  const key = responseKeyer(s.attempts);
  let picked: PoolItem[] = []; let reason = "";

  if (mode === "lesson" && opts.lessons?.length) {
    // Interleaved set across several lessons: earlier mistakes first, then round-robin across topics.
    const byLesson = opts.lessons.map((l) => shuffle([...pool.values()].filter((p) => p.lesson === l)));
    const wrong = mistakes.filter((p) => p.lesson && opts.lessons!.includes(p.lesson)).slice(0, Math.ceil(size / 4));
    const rr: PoolItem[] = [];
    for (let i = 0; rr.length < size * 2 && byLesson.some((b) => b[i]); i++) for (const b of byLesson) if (b[i]) rr.push(b[i]);
    picked = [...wrong, ...rr.filter((p) => !wrong.includes(p))].slice(0, size);
    reason = "Interleaved questions from several topics, answered without looking at the theory first. Earlier mistakes come first.";
  } else if (mode === "lesson" && opts.lesson) {
    const forLesson = [...pool.values()].filter((p) => p.lesson === opts.lesson);
    const wrongHere = mistakes.filter((p) => p.lesson === opts.lesson);
    picked = [...wrongHere, ...shuffle(forLesson.filter((p) => !wrongHere.includes(p)))].slice(0, size);
    reason = wrongHere.length ? `Starts with ${wrongHere.length} question${wrongHere.length === 1 ? "" : "s"} you got wrong before, then fresh ones on the same topic.` : "A fresh mix of questions on this topic.";
  } else if (mode === "mistakes") {
    picked = mistakes.slice(0, size);
    reason = "Questions you answered incorrectly last time. Each one leaves this list once you get it right.";
  } else {
    // weak / mixed: weight lessons by low accuracy, plus questions not seen for a long time
    const seen = new Map<string, string>();
    for (const r of s.responses) seen.set(key(r), r.createdAt);
    const lessonAcc = (slug: string | null) => (slug ? mastery(s.responses, slug) : { answered: 0, accuracy: 1 });
    const scored = [...pool.values()].map((p) => {
      const m = lessonAcc(p.lesson);
      const weakness = m.answered ? 1 - m.accuracy : mode === "weak" ? 0 : 0.3;
      const staleness = seen.has(p.key) ? Math.min(1, ago(seen.get(p.key)!, Date.now()) / 30) : 0.6;
      return { p, score: (mode === "weak" ? weakness * 2 : weakness) + staleness + rand() * 0.4 };
    }).sort((a, b) => b.score - a.score);
    picked = [...mistakes.slice(0, Math.ceil(size / 3)), ...scored.map((x) => x.p)].filter((p, i, a) => a.indexOf(p) === i).slice(0, size);
    reason = mode === "weak" ? "Weighted towards the topics where your accuracy is lowest." : "Mixed review across topics: earlier mistakes, weaker areas and questions you haven't seen for a while.";
  }
  if (picked.length < (mode === "mistakes" ? 1 : 2)) return null;
  const exercise: Exercise = {
    ...picked[0].exercise,
    id: "00000000-0000-4000-8000-000000000000",
    slug: opts.slug ?? `smart-${mode}${opts.lesson ? `-${opts.lesson}` : ""}`,
    title: opts.title ?? (mode === "mistakes" ? "Mistake review" : mode === "lesson" ? `Targeted practice: ${grammarLessons.find((l) => l.slug === opts.lesson)?.title ?? ""}` : mode === "weak" ? "Strengthen weak areas" : "Mixed review"),
    format: "mixed", target: { type: "lesson", ref: opts.lesson ?? picked[0].lesson ?? picked[0].exercise.target.ref },
    instructions: reason,
    questions: picked.map((p) => ({ ...p.question, id: p.key })),
  };
  return { exercise, reason };
}
/** Smart sets are saved under a synthetic slug: they count as grammar practice. */
export const isSmartSlug = (slug: string) => slug.startsWith("smart-");

/** Data the learning-cycle widget needs for one lesson (kept small for the browser bundle). */
export function cycleInfo(slug: string) {
  const l = grammarLessons.find((x) => x.slug === slug);
  if (!l) return null;
  const readingSlugs = l.links.filter((x) => x.type === "appears_in" && x.published).map((x) => x.to);
  const readings = readingTexts.filter((r) => readingSlugs.includes(r.slug)).map((r) => ({ slug: r.slug, title: r.title }));
  // Only texts the lesson is really linked to (no unrelated fallback).
  return { slug, sections: l.sections.length, readings, questionIds: [...questionPool().values()].filter((p) => p.lesson === slug).map((p) => p.key) };
}
