"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { BookOpen, Languages, Newspaper, Headphones, Mic, PenLine, Check } from "lucide-react";
import { useLearner } from "./StoreProvider";
import { SKILLS, SKILL_LABEL, CONFIDENCE_LABEL, readAssessment, type Skill } from "@/lib/plan/personal";

const ICON: Record<Skill, typeof BookOpen> = { grammar: BookOpen, vocabulary: Languages, reading: Newspaper, listening: Headphones, speaking: Mic, writing: PenLine };

/**
 * The learner's self-assessment: confidence in six areas (1–5) and up to three areas to improve.
 * Saved in the learner's profile, so it follows them across devices; editable at any time.
 */
export function LearningProfileForm({ submitLabel, onDone, onSkip }: { submitLabel: string; onDone?: () => void; onSkip?: () => void }) {
  const { profile, store, refresh, toast } = useLearner();
  const [ratings, setRatings] = useState<Partial<Record<Skill, number>>>({});
  const [focus, setFocus] = useState<Skill[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const a = readAssessment(profile);
    if (a) { setRatings(a.ratings); setFocus(a.focus); }
  }, [profile]);
  const complete = SKILLS.every((s) => ratings[s]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await store.updateProfile({ preferences: { ...(profile?.preferences ?? {}), assessment: { ratings, focus, updatedAt: new Date().toISOString() } } });
      await refresh();
      toast("Your learning profile is saved");
      onDone?.();
    } catch (err) { toast(`Couldn't save: ${(err as Error).message}`); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-7" data-testid="learning-profile">
      <fieldset>
        <legend className="text-sm font-semibold">How confident do you feel in each area? <span className="font-normal text-muted">1 = I struggle considerably · 5 = very confident</span></legend>
        <ul className="mt-3 space-y-2.5">
          {SKILLS.map((s, i) => {
            const Icon = ICON[s];
            return (
              <li key={s} className="enter rounded-xl border border-line bg-surface p-3" style={{ ["--i" as string]: i }}>
                <div role="radiogroup" aria-label={`${SKILL_LABEL[s]}: confidence`} className="flex flex-wrap items-center gap-3">
                  <span className="flex min-w-[9.5rem] flex-1 items-center gap-2 font-semibold"><Icon size={17} className="text-primary" aria-hidden="true" />{SKILL_LABEL[s]}</span>
                  <span className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const on = ratings[s] === n;
                      return (
                        <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n}: ${CONFIDENCE_LABEL[n]}`} title={CONFIDENCE_LABEL[n]}
                          onClick={() => setRatings({ ...ratings, [s]: n })}
                          className={clsx("grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition-[background,border-color,color,transform] duration-150 active:scale-95",
                            on ? "border-primary bg-primary text-primary-fg" : "border-line text-muted hover:border-primary/60 hover:text-ink")}>{n}</button>
                      );
                    })}
                  </span>
                </div>
                {ratings[s] && <p className="mt-1.5 text-sm text-muted">{CONFIDENCE_LABEL[ratings[s]!]}</p>}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Which areas would you most like to improve? <span className="font-normal text-muted">Choose up to three.</span></legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {SKILLS.map((s) => {
            const on = focus.includes(s);
            const full = !on && focus.length >= 3;
            return (
              <button key={s} type="button" aria-pressed={on} disabled={full} onClick={() => setFocus(on ? focus.filter((x) => x !== s) : [...focus, s])}
                className={clsx("inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150",
                  on ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:text-ink", full && "opacity-50")}>
                {on && <Check size={14} aria-hidden="true" />}{SKILL_LABEL[s]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="text-sm text-muted">Your answers set the starting priorities of your personal study plan. As you work, your real results gradually take over, and you can change everything later in Settings or on the plan page.</p>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy || !complete}>{busy ? "Saving…" : submitLabel}</button>
        {onSkip && <button type="button" className="btn btn-ghost" onClick={onSkip}>Skip for now</button>}
      </div>
      {!complete && <p className="text-xs text-muted">Rate all six areas to save.</p>}
    </form>
  );
}
