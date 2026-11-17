import { describe, it, expect } from "vitest";
import { buildPracticeQueue, topicStats, topicSenses } from "@/lib/vocab-practice";
import { buildContextRound, contextItem, locate } from "@/lib/vocab-context";
import { newCard, rate } from "@/lib/progress";
import { allSenses, themes } from "@/lib/content";
import { Rating, type Grade } from "ts-fsrs";
import type { SavedItem, ReviewCardRow } from "@/lib/store/types";

const theme = "education";
const save = (senseId: string, id = `s-${senseId}`): SavedItem => ({ id, itemType: "sense", itemRef: senseId, label: senseId, context: null, sourceRef: null, status: "learning", createdAt: "2026-01-01T00:00:00Z" });
const reviewed = (savedId: string, grade: Grade, at: Date): ReviewCardRow => rate(newCard(savedId, at), grade, at);

describe("topic flashcards", () => {
  it("introduces new items from easier to harder levels", () => {
    const q = buildPracticeQueue(theme, [], [], { size: 30, newPerSession: 30 });
    const rank = ["B2", "B2+", "C1", "C2"];
    const levels = q.map((c) => rank.indexOf(c.ref.sense.level));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(q.every((c) => c.kind === "new")).toBe(true);
  });

  it("puts overdue cards first, interleaves due cards from other topics, and never repeats a card", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const past = new Date("2026-02-01T12:00:00Z");
    const mine = topicSenses(theme).slice(0, 3);
    const other = allSenses().filter((r) => !r.sense.topics.includes(theme)).slice(0, 3);
    const saved = [...mine, ...other].map((r) => save(r.sense.id));
    const cards = saved.map((s) => reviewed(s.id, Rating.Good as Grade, past));
    const q = buildPracticeQueue(theme, saved, cards, { now, size: 12 });
    expect(q[0].kind).toBe("due");
    expect(q.some((c) => c.kind === "interleaved")).toBe(true);
    expect(q.findIndex((c) => c.kind === "interleaved")).toBe(3); // every fourth position
    expect(new Set(q.map((c) => c.senseId)).size).toBe(q.length);
  });

  it("does not show cards that are not yet due", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const r = topicSenses(theme)[0];
    const s = save(r.sense.id);
    const c = reviewed(s.id, Rating.Easy as Grade, now); // due in the future
    const q = buildPracticeQueue(theme, [s], [c], { now, size: 50, newPerSession: 0 });
    expect(q.find((x) => x.senseId === r.sense.id)).toBeUndefined();
  });

  it("counts new, learning and remembered items for the progress indicator", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const [a, b] = topicSenses(theme);
    const saved = [save(a.sense.id), save(b.sense.id)];
    let ca = reviewed(saved[0].id, Rating.Good as Grade, new Date("2026-02-01"));
    ca = rate(ca, Rating.Good as Grade, new Date("2026-02-05")); // graduates to review
    const cb = reviewed(saved[1].id, Rating.Again as Grade, now);
    const st = topicStats(theme, saved, [ca, cb], now);
    expect(st.total).toBe(topicSenses(theme).length);
    expect(st.newRemaining).toBe(st.total - 2);
    expect(st.remembered + st.learning).toBe(2);
  });
});

describe("vocabulary in context", () => {
  it("builds a full round for every theme, ending with a production task", () => {
    for (const t of themes) {
      const r = buildContextRound(t.slug, [], 11);
      expect(r.length, t.slug).toBe(10);
      expect(r.at(-1)!.kind).toBe("produce");
      expect(new Set(r.map((x) => x.lemma)).size, t.slug).toBe(r.length);
    }
  });

  it.each(themes.map((t) => [t.slug]))("%s: answers fit the sentence and distractors are explained", (slug) => {
    for (const seed of [1, 2, 3]) for (const x of buildContextRound(slug, [], seed)) {
      if (x.kind === "produce") continue;
      if (x.kind !== "meaning") expect(x.sentence).toContain("____");
      if (x.kind === "meaning") expect(x.sentence).toMatch(/\*\*.+\*\*/);
      if (x.options) {
        expect(x.options.filter((o) => o.correct)).toHaveLength(1);
        expect(new Set(x.options.map((o) => o.text)).size).toBe(4);
        for (const o of x.options) expect(o.why.length).toBeGreaterThan(10);
      } else expect(x.accepted).toContain(x.answer.toLowerCase());
      if (x.kind === "form") expect(x.answer.toLowerCase()).not.toBe(x.hint!.toLowerCase());
    }
  });

  it("finds inflected forms in sentences", () => {
    const r = allSenses().find((x) => x.item.lemma === "foster") ?? allSenses().find((x) => x.item.kind === "word" && x.item.pos.startsWith("verb"))!;
    expect(locate(r, `They ${r.item.lemma}ed it.`) ?? locate(r, `They ${r.item.lemma}s it.`)).toBeTruthy();
    expect(contextItem(r, "produce", [], 1)?.kind).toBe("produce");
  });
});
