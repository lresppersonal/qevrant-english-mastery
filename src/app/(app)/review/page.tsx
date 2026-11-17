"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Grade } from "ts-fsrs";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { dueItems, newCard, rate, previewIntervals, humanInterval, statusFromCard } from "@/lib/progress";
import { describeSaved, isReviewable } from "@/lib/describe";
import { EmptyState, LevelBadge, PageHeader, ProgressBar } from "@/components/ui";
import type { SavedItem } from "@/lib/store/types";

/** Familiarity from the FSRS state: memory stability above three weeks counts as "well known". */
function stateLabel(c: { state: number; stability: number }) {
  if (c.state === 2 && c.stability > 21) return "well known";
  return ["new", "learning", "familiar", "relearning"][c.state] ?? "new";
}

export default function Review() {
  const { saved, store } = useLearner();
  const { data, reload } = useLearnerData();
  const [queue, setQueue] = useState<SavedItem[] | null>(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const due = useMemo(() => (data ? dueItems(saved.filter(isReviewable), data.cards) : []), [saved, data]);
  const cardsById = useMemo(() => new Map((data?.cards ?? []).map((c) => [c.savedItemId, c])), [data]);

  if (!data) return <div aria-busy="true" className="h-40 animate-pulse rounded-2xl bg-surface-2" />;

  if (!queue) {
    return (
      <>
        <PageHeader eyebrow="My study" title="Review" intro="Spaced revision of the words and phrases you've saved. Each answer schedules the next review: harder items come back sooner." />
        {due.length === 0 ? (
          <EmptyState title={saved.some(isReviewable) ? "All caught up" : "Nothing to review yet"}
            body={saved.some(isReviewable) ? "Nothing is due right now. Come back later, or keep learning and save new words." : "Save words from lessons, vocabulary pages and reading texts. They'll appear here for revision."}
            action={<Link href="/reading/is-failure-the-best-teacher" className="btn btn-primary">Find words in a text</Link>} />
        ) : (
          <div className="card flex flex-wrap items-center gap-4 p-6">
            <p className="flex-1 text-lg"><strong className="font-display text-3xl">{due.length}</strong> <span className="text-muted">{due.length === 1 ? "item is" : "items are"} due</span></p>
            <button className="btn btn-primary" onClick={() => { setQueue(due.slice(0, 30)); setPos(0); setRevealed(false); }}>Start review</button>
          </div>
        )}
      </>
    );
  }

  if (pos >= queue.length) {
    return (
      <EmptyState title="Session complete" body={`You reviewed ${doneCount} ${doneCount === 1 ? "item" : "items"}. Your schedule has been updated.`}
        action={<button className="btn btn-primary" onClick={async () => { await reload(); setQueue(null); setDoneCount(0); }}>Back to Review</button>} />
    );
  }

  const item = queue[pos];
  const d = describeSaved(item);
  const card = cardsById.get(item.id) ?? newCard(item.id);
  const options = previewIntervals(card);

  async function answer(grade: Grade) {
    setBusy(true);
    try {
      const next = rate(card, grade);
      await store.putReviewCard(next);
      await store.addReviewLog({ savedItemId: item.id, rating: grade, state: next.state, due: next.due });
      await store.setSavedStatus(item.id, statusFromCard(next));
      await store.logEvent({ type: "review_completed", contentType: item.itemType, contentRef: item.itemRef, payload: { rating: grade } });
      setDoneCount((n) => n + 1);
      setPos((p) => p + 1);
      setRevealed(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-3 text-sm text-muted">
        <span>{pos + 1} / {queue.length}</span>
        <div className="flex-1"><ProgressBar value={pos / queue.length} label="Review progress" /></div>
      </div>
      <div className="flip" data-flipped={revealed}>
        <div className="flip-inner">
          <div className="flip-face card flex flex-col p-6 sm:p-8" aria-hidden={revealed}>
            <div className="flex items-center gap-2">{d.level && <LevelBadge level={d.level} />}<span className="chip">{item.itemType === "custom" ? "your word" : "vocabulary"}</span><span className="chip">{stateLabel(card)}</span></div>
            <p className="mt-4 font-display text-3xl font-extrabold">{d.title}</p>
            {item.context && <p className="mt-3 italic text-muted">“{item.context}”</p>}
            <p className="mt-4 text-sm text-muted">Try to recall the meaning and how you would use it, then turn the card.</p>
            <div className="flex-1" />
            {!revealed && <button className="btn btn-primary mt-8 w-full" onClick={() => setRevealed(true)} autoFocus>Show meaning</button>}
          </div>
          <div className="flip-face flip-back card p-6 sm:p-8" aria-hidden={!revealed} aria-live="polite">
            {revealed && (
              <div className="space-y-3">
                <p className="font-display text-2xl font-extrabold">{d.title}</p>
                {d.definition ? <p className="text-lg">{d.definition}</p> : <p className="text-muted">You saved this word yourself. Check its meaning, then rate how well you knew it.</p>}
                {d.ru && <p lang="ru"><span className="font-semibold text-muted">Русский: </span>{d.ru}</p>}
                {d.example && <p className="rounded-lg bg-surface-2 px-3 py-2 italic">{d.example}</p>}
                {item.context && <p className="text-sm text-muted">Your sentence: “{item.context}”</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      {revealed && (
        <div className="enter mt-5">
          <p className="text-sm font-semibold text-muted">How well did you remember it?</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options.map((o) => (
              <button key={o.label} disabled={busy} onClick={() => answer(o.grade)} className="btn btn-ghost flex-col !gap-0 !py-2">
                <span>{o.label}</span><span className="text-xs font-normal text-muted">{humanInterval(o.due)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
