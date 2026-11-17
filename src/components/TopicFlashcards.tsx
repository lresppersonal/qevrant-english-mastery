"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Rating, type Grade } from "ts-fsrs";
import { RotateCcw, Shuffle, CheckCircle2 } from "lucide-react";
import { useLearner } from "./StoreProvider";
import { LevelBadge, ProgressBar } from "./ui";
import { newCard, rate, previewIntervals, statusFromCard, humanInterval } from "@/lib/progress";
import { buildPracticeQueue, topicStats, RELEARN_GAP, type PracticeCard } from "@/lib/vocab-practice";
import { getTheme } from "@/lib/content";
import type { ReviewCardRow, SavedItem } from "@/lib/store/types";

const RATINGS: { grade: Grade; label: string; key: string }[] = [
  { grade: Rating.Again as Grade, label: "Again", key: "1" },
  { grade: Rating.Hard as Grade, label: "Difficult", key: "2" },
  { grade: Rating.Good as Grade, label: "Good", key: "3" },
  { grade: Rating.Easy as Grade, label: "Easy", key: "4" },
];
const KIND_LABEL: Record<string, string> = { word: "word", collocation: "collocation", phrasal_verb: "phrasal verb", idiom: "idiom", phrase: "expression" };

export function TopicFlashcards({ theme }: { theme: string }) {
  const { store, ready, refresh } = useLearner();
  const [saved, setSaved] = useState<SavedItem[] | null>(null);
  const [cards, setCards] = useState<ReviewCardRow[]>([]);
  const [queue, setQueue] = useState<PracticeCard[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState({ reviewed: 0, remembered: 0, practice: 0 });
  const [seen, setSeen] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([store.listSaved(), store.listReviewCards()]);
    setSaved(s); setCards(c);
    return { s, c };
  }, [store]);

  const start = useCallback(async (exclude: string[] = []) => {
    const { s, c } = await load();
    setQueue(buildPracticeQueue(theme, s, c, { exclude })); setPos(0); setRevealed(false);
  }, [load, theme]);

  useEffect(() => { if (ready) start().catch((e) => setError((e as Error).message)); }, [ready, start]);

  const stats = useMemo(() => (saved ? topicStats(theme, saved, cards) : null), [saved, cards, theme]);
  const current = queue[pos];
  const row: ReviewCardRow | null = current ? cards.find((c) => c.savedItemId === current.savedId) ?? current.card : null;
  const previewRow = row ?? (current ? newCard("preview") : null);
  const intervals = previewRow ? previewIntervals(previewRow) : null;

  const answer = useCallback(async (grade: Grade) => {
    if (!current || busy) return;
    setBusy(true); setError(null);
    try {
      const { item, sense } = current.ref;
      let savedId = current.savedId;
      if (!savedId) {
        const s = await store.saveItem({ itemType: "sense", itemRef: sense.id, label: item.lemma, context: sense.examples[0], sourceRef: `practice:${theme}` });
        savedId = s.id;
        void refresh();
      }
      const base = cards.find((c) => c.savedItemId === savedId) ?? newCard(savedId);
      const next = rate(base, grade);
      await store.putReviewCard(next);
      await store.addReviewLog({ savedItemId: savedId, rating: grade, state: next.state, due: next.due });
      await store.setSavedStatus(savedId, statusFromCard(next));
      await store.logEvent({ type: "review_completed", contentType: "sense", contentRef: sense.id, payload: { rating: grade, source: `practice:${theme}` } });
      setCards((cs) => [...cs.filter((c) => c.savedItemId !== savedId), next]);
      setSaved((ss) => (ss && !ss.some((x) => x.id === savedId) ? [...ss, { id: savedId!, itemType: "sense", itemRef: sense.id, label: item.lemma, context: sense.examples[0], sourceRef: `practice:${theme}`, status: statusFromCard(next), createdAt: new Date().toISOString() }] : ss));
      setSession((s) => ({ reviewed: s.reviewed + 1, remembered: s.remembered + (grade >= Rating.Good ? 1 : 0), practice: s.practice + (grade <= Rating.Hard ? 1 : 0) }));
      setSeen((x) => [...x, sense.id]);
      // "Again": the card comes back a few cards later in this session if it is due again soon
      const soon = new Date(next.due).getTime() - Date.now() < 15 * 60_000;
      setQueue((q) => {
        const updated = q.map((c, i) => (i === pos ? { ...c, savedId, card: next } : c));
        if (grade === Rating.Again && soon) updated.splice(Math.min(updated.length, pos + 1 + RELEARN_GAP), 0, { ...current, savedId, card: next, kind: "due" });
        return updated;
      });
      setPos((p) => p + 1); setRevealed(false);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [current, busy, store, theme, cards, pos, refresh]);

  // Keyboard: space/enter reveals, 1–4 rate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (!revealed && (e.key === " " || e.key === "Enter") && current) { e.preventDefault(); setRevealed(true); }
      else if (revealed) { const r = RATINGS.find((x) => x.key === e.key); if (r) { e.preventDefault(); void answer(r.grade); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current, answer]);

  if (!saved || !stats) return <div className="skeleton h-80 rounded-2xl" aria-label="Loading" />;

  const progress = (
    <div className="card mb-5 p-4" data-testid="practice-progress">
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div><p className="font-display text-2xl font-extrabold tabular-nums">{session.reviewed}</p><p className="text-xs text-muted">{session.reviewed} reviewed</p></div>
        <div><p className="font-display text-2xl font-extrabold tabular-nums text-success">{stats.remembered}</p><p className="text-xs text-muted">remembered</p></div>
        <div><p className="font-display text-2xl font-extrabold tabular-nums text-accent-text">{stats.learning}</p><p className="text-xs text-muted">need more practice</p></div>
        <div><p className="font-display text-2xl font-extrabold tabular-nums">{stats.newRemaining}</p><p className="text-xs text-muted">new remaining</p></div>
      </div>
      <div className="mt-3"><ProgressBar value={(stats.total - stats.newRemaining) / Math.max(1, stats.total)} label={`${stats.total - stats.newRemaining} of ${stats.total} items studied`} /></div>
      <p className="mt-1.5 text-xs text-muted">{stats.total - stats.newRemaining} of {stats.total} items in this topic studied · {stats.due} due now · this session: {session.remembered} remembered, {session.practice} to practise again</p>
    </div>
  );

  if (!current) {
    return (
      <>
        {progress}
        <div className="card p-6 text-center" data-testid="practice-done">
          <CheckCircle2 size={28} className="mx-auto text-success" aria-hidden="true" />
          <p className="mt-2 font-display text-xl font-bold">{session.reviewed ? "Session complete" : "Nothing due in this topic right now"}</p>
          <p className="mt-1 text-muted">{stats.newRemaining > 0 ? `${stats.newRemaining} new items are waiting. Each session introduces up to ten, easiest first.` : stats.due === 0 ? "You have studied every item in this topic. Cards come back here when they are due." : ""}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(stats.newRemaining > 0 || stats.due > 0) && <button className="btn btn-primary" onClick={() => start(seen)}><Shuffle size={16} aria-hidden="true" /> Continue with a new session</button>}
            <Link href={`/vocabulary/topics/${theme}/context`} className="btn btn-ghost">Practise in context</Link>
            <Link href="/review" className="btn btn-ghost"><RotateCcw size={16} aria-hidden="true" /> All due reviews</Link>
          </div>
        </div>
      </>
    );
  }

  const { item, sense } = current.ref;
  return (
    <>
      {progress}
      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center gap-3 text-sm text-muted">
          <span className="tabular-nums">{pos + 1} / {queue.length}</span>
          <div className="flex-1"><ProgressBar value={pos / queue.length} label="Session progress" /></div>
        </div>
        <div className="flip" data-flipped={revealed}>
          <div className="flip-inner">
            <div className="flip-face card flex min-h-[260px] flex-col p-6 sm:p-8" aria-hidden={revealed}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx("chip", current.kind === "new" && "!border-primary !text-primary")}>{current.kind === "new" ? "new" : current.kind === "interleaved" ? `from ${getTheme(sense.topics[0])?.title ?? "another topic"}` : "review"}</span>
                <span className="chip">{KIND_LABEL[item.kind] ?? item.kind}</span>
              </div>
              <p className="mt-6 font-display text-3xl font-extrabold" data-testid="flashcard-front">{item.lemma}</p>
              <p className="mt-3 text-sm text-muted">Say or think of the meaning, a translation and an example before you turn the card.</p>
              <div className="flex-1" />
              {!revealed && <button className="btn btn-primary mt-6 w-full" onClick={() => setRevealed(true)} autoFocus>Show answer</button>}
            </div>
            <div className="flip-face flip-back card p-6 sm:p-8" aria-hidden={!revealed} aria-live="polite">
              {revealed && (
                <div className="space-y-2.5" data-testid="flashcard-back">
                  <p className="flex flex-wrap items-baseline gap-2"><span className="font-display text-2xl font-extrabold">{item.lemma}</span><LevelBadge level={sense.level} /><em className="text-sm text-muted">{item.pos}</em>{sense.register !== "neutral" && <span className="chip">{sense.register}</span>}</p>
                  <p lang="ru" className="text-lg font-semibold text-primary">{sense.translations.ru}</p>
                  <p>{sense.definition}</p>
                  <p className="rounded-lg bg-surface-2 px-3 py-2 italic">{sense.examples[0]}</p>
                  {sense.collocations.length > 0 && <p className="text-sm"><span className="font-semibold">Collocations: </span>{sense.collocations.slice(0, 4).join(" · ")}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
        {revealed && (
          <div className="enter mt-4">
            <p className="text-sm font-semibold text-muted">How well did you recall it?</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((r) => {
                const due = intervals?.find((x) => x.grade === r.grade)?.due;
                return (
                  <button key={r.label} disabled={busy} onClick={() => answer(r.grade)} className="btn btn-ghost flex-col !gap-0 !py-2" aria-keyshortcuts={r.key}>
                    <span>{r.label}</span>{due && <span className="text-xs font-normal text-muted">{humanInterval(new Date(due))}</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">Keys: space to turn, 1–4 to rate. Your answer schedules the next review.</p>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </>
  );
}
