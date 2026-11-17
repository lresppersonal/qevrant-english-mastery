"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useLearner } from "./StoreProvider";
import { useLearnerData } from "./useLearnerData";
import { getSense, getTheme } from "@/lib/content";
import { recommendTopics } from "@/lib/speaking-links";
import { readPlan, planProgress } from "@/lib/plan/engine";
import { LevelBadge } from "./ui";

/**
 * Speaking topics that match what the learner studied recently: themes of words saved in the last
 * three weeks (more recent and more frequent = higher weight) and the theme of the current study-plan day.
 */
export function SpeakingSuggestions() {
  const { saved, profile } = useLearner();
  const { data } = useLearnerData();
  const items = useMemo(() => {
    const now = Date.now();
    const w = new Map<string, number>();
    for (const s of saved) {
      if (s.itemType !== "sense") continue;
      const age = (now - Date.parse(s.createdAt)) / 864e5;
      if (age > 21) continue;
      const theme = getSense(s.itemRef)?.sense.topics[0];
      if (theme) w.set(theme, (w.get(theme) ?? 0) + 1 / (1 + age / 7));
    }
    const plan = readPlan(profile);
    let planTheme: string | null = null;
    if (plan && data) planTheme = planProgress(plan, { ...data, saved }).current?.day.theme ?? null;
    if (planTheme) w.set(planTheme, (w.get(planTheme) ?? 0) + 5);
    const done = (data?.speaking ?? []).map((x) => x.promptSlug.replace(/^bank:/, ""));
    return { recs: recommendTopics([...w].map(([theme, weight]) => ({ theme, weight })), done, 3), planTheme };
  }, [saved, profile, data]);

  return (
    <section className="mb-10" aria-labelledby="h-sugg" data-testid="speaking-suggestions">
      <h2 id="h-sugg" className="mb-1 flex items-center gap-2 text-xl font-bold"><Sparkles size={18} className="text-primary" aria-hidden="true" /> Speak with the words you studied</h2>
      {items.recs.length === 0 ? (
        <p className="text-sm text-muted">Save words from a <Link href="/vocabulary" className="font-semibold text-primary">vocabulary theme</Link> or follow the <Link href="/plan" className="font-semibold text-primary">Intensive Study Plan</Link>, and topics that let you use them will appear here.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">Topics chosen from the themes of your recently saved vocabulary{items.planTheme ? " and today's study-plan theme" : ""}. Each topic shows the language to retrieve.</p>
          <ul className="grid gap-3 md:grid-cols-3">
            {items.recs.map(({ prompt, theme }) => (
              <li key={prompt.id}>
                <Link href={`/speaking?topic=${prompt.id}`} className="card card-link flex h-full flex-col p-4">
                  <span className="flex items-center gap-2"><LevelBadge level={prompt.level} /><span className="chip !text-[11px]">{getTheme(theme)?.title ?? theme}</span></span>
                  <span className="mt-2 flex-1 font-medium">{prompt.prompt}</span>
                  <span className="mt-2 text-sm font-semibold text-primary">Speak about this →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
