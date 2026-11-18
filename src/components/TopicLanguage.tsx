"use client";
import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { kitForPrompt, type KitEntry } from "@/lib/speaking-links";
import type { BankPrompt } from "@/lib/speaking-bank";
import { getVocabItem } from "@/lib/content";
import { useLearner } from "./StoreProvider";
import { WordPopover } from "./WordPopover";

const GROUPS: { key: keyof ReturnType<typeof kitForPrompt>; label: string }[] = [
  { key: "advanced", label: "Advanced words" }, { key: "collocations", label: "Natural collocations" },
  { key: "phrasalVerbs", label: "Phrasal verbs" }, { key: "idioms", label: "Idiomatic expressions" },
  { key: "academic", label: "Academic expressions" }, { key: "conversational", label: "Conversational alternatives" },
];

/**
 * "Language for this topic": items from the vocabulary themes linked to the topic's category.
 * Words the learner has saved are marked, so speaking becomes retrieval practice for studied vocabulary.
 * Tapping an item opens the Reading dictionary card in place (no navigation), so the speaking session,
 * its timers and any recording carry on untouched.
 */
export function TopicLanguage({ prompt }: { prompt: BankPrompt }) {
  const kit = useMemo(() => kitForPrompt(prompt), [prompt]);
  const { saved } = useLearner();
  const savedSenses = new Set(saved.filter((x) => x.itemType === "sense").map((x) => x.itemRef));
  const [sel, setSel] = useState<{ entry: KitEntry; anchor: HTMLElement } | null>(null);
  const close = useCallback((returnFocus: boolean) => {
    setSel((cur) => { if (returnFocus) cur?.anchor.focus({ preventScroll: true }); return null; });
  }, []);
  const groups = GROUPS.map((g) => ({ ...g, items: kit[g.key] as KitEntry[] })).filter((g) => g.items.length);
  if (!groups.length) return null;
  return (
    <details className="mt-4 rounded-xl border border-line p-3 text-left" data-testid="topic-language">
      <summary className="cursor-pointer font-semibold">Language for this topic</summary>
      <p className="mt-1 text-sm text-muted">Try to use two or three of these naturally — don&apos;t force idioms into every answer. Words you have saved are marked ★.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {g.items.map((k) => (
                <li key={k.slug}>
                  <button type="button" data-word="" title={k.hint} aria-haspopup="dialog" aria-expanded={sel?.entry.senseId === k.senseId}
                    onClick={(e) => { const anchor = e.currentTarget; setSel((cur) => (cur?.entry.senseId === k.senseId ? null : { entry: k, anchor })); }}
                    className={clsx("chip !text-[13px] hover:border-primary hover:text-primary", sel?.entry.senseId === k.senseId && "!border-primary !text-primary")}>
                    {savedSenses.has(k.senseId) ? "★ " : ""}{k.lemma}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {sel && (() => {
        const item = getVocabItem(sel.entry.slug);
        return (
          <WordPopover key={sel.entry.senseId} anchor={sel.anchor} word={sel.entry.lemma} sentence="" items={item ? [item] : []}
            senseId={sel.entry.senseId} sourceRef={`speaking:${prompt.id}`} source={`Speaking — ${prompt.prompt}`} saveContext={prompt.prompt} onClose={close} />
        );
      })()}
    </details>
  );
}
