import type { ActivityEvent } from "@/lib/store/types";
import { SKILLS, type Skill } from "@/lib/plan/personal";
import type { DayView, Block } from "@/lib/plan/engine";

/** Which of the six areas a logged activity belongs to. Grammar includes Grammar Practice; Academic Writing is separate. */
export function skillOfEvent(e: Pick<ActivityEvent, "type" | "contentType">): Skill | null {
  switch (e.type) {
    case "exercise_completed": return e.contentType === "vocab" || e.contentType === "vocabulary" ? "vocabulary" : "grammar";
    case "lesson_section_viewed": return e.contentType === "grammar_lesson" ? "grammar" : null;
    case "review_completed": return "vocabulary";
    case "reading_completed": return "reading";
    case "listening_logged": return "listening";
    case "speaking_submitted": return "speaking";
    case "writing_submitted": return "writing";
    default: return null; // saves, unsaves and single answers are not a completed task
  }
}

export const skillOfBlock = (b: Pick<Block, "key" | "skill">): Skill | null =>
  b.skill ?? ((SKILLS as readonly string[]).includes(b.key) ? (b.key as Skill) : b.key === "revision" ? "vocabulary" : null);

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Monday-first dates (local) of the week containing `now`. */
export function weekDates(now = new Date()): string[] {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return ymd(x); });
}

export interface Cell { done: number; planned: number }
export type WeekGrid = { dates: string[]; today: string; rows: Record<Skill, Cell[]> };

/**
 * Monday–Sunday × six areas. `done` = completed tasks logged that day. `planned` = plan blocks for that
 * day: finished plan days sit on the date they were completed; the current plan day sits on today and the
 * following plan days on the following dates. With no plan, only completed work is shown.
 */
export function weeklySkillGrid(events: Pick<ActivityEvent, "type" | "contentType" | "createdAt">[], planDays: DayView[] | null, now = new Date()): WeekGrid {
  const dates = weekDates(now);
  const today = ymd(now);
  const rows = Object.fromEntries(SKILLS.map((s) => [s, dates.map(() => ({ done: 0, planned: 0 }))])) as Record<Skill, Cell[]>;
  const idx = new Map(dates.map((d, i) => [d, i]));
  for (const e of events) {
    const s = skillOfEvent(e); const i = idx.get(ymd(new Date(e.createdAt)));
    if (s && i !== undefined) rows[s][i].done++;
  }
  if (planDays) {
    const place = (dv: DayView, date: string) => {
      const i = idx.get(date); if (i === undefined) return;
      for (const b of dv.blocks) { const s = skillOfBlock(b); if (s) rows[s][i].planned++; }
    };
    for (const dv of planDays) if (dv.status === "done" && dv.completedAt) place(dv, ymd(new Date(dv.completedAt)));
    const ahead = planDays.filter((d) => d.status === "current" || d.status === "upcoming");
    const t = idx.get(today) ?? 0;
    ahead.slice(0, 7 - t).forEach((dv, k) => place(dv, dates[t + k]));
  }
  return { dates, today, rows };
}
