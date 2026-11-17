"use client";
import Link from "next/link";
import { useMemo } from "react";
import { kitForPrompt, type KitEntry } from "@/lib/speaking-links";
import type { BankPrompt } from "@/lib/speaking-bank";
import { useLearner } from "./StoreProvider";

const GROUPS: { key: keyof ReturnType<typeof kitForPrompt>; label: string }[] = [
  { key: "advanced", label: "Advanced words" }, { key: "collocations", label: "Natural collocations" },
  { key: "phrasalVerbs", label: "Phrasal verbs" }, { key: "idioms", label: "Idiomatic expressions" },
  { key: "academic", label: "Academic expressions" }, { key: "conversational", label: "Conversational alternatives" },
];

/**
 * "Language for this topic": items from the vocabulary themes linked to the topic's category.
 * Words the learner has saved are marked, so speaking becomes retrieval practice for studied vocabulary.
 */
export function TopicLanguage({ prompt }: { prompt: BankPrompt }) {
  const kit = useMemo(() => kitForPrompt(prompt), [prompt]);
  const { saved } = useLearner();
  const savedSenses = new Set(saved.filter((x) => x.itemType === "sense").map((x) => x.itemRef));
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
                <li key={k.slug}><Link href={`/vocabulary/${k.slug}#${k.senseId}`} title={k.hint} className="chip !text-[13px] hover:border-primary hover:text-primary">{savedSenses.has(k.senseId) ? "★ " : ""}{k.lemma}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
