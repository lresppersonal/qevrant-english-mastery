import { ContextBackLink } from "@/components/NavMemory";
import Link from "next/link";
import { Suspense } from "react";
import { SpeakingSuggestions } from "@/components/SpeakingSuggestions";
import { speakingPrompts } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { Mic, Sparkles } from "lucide-react";
import { SpeakingStudio } from "@/components/SpeakingStudio";
import { SpeakingDevelopment } from "@/components/SpeakingDevelopment";

export const metadata = { title: "Speaking" };
const FORMAT = { interview: "Interview · Part 1 style", long_turn: "Long turn · Part 2 style", discussion: "Discussion · Part 3 style" } as const;

export default function SpeakingIndex() {
  return (
    <>
      <ContextBackLink />
      <PageHeader eyebrow="Learn" title="Speaking"
        intro="Generate a random topic, prepare, speak against the clock and get AI practice feedback on fluency, vocabulary and grammar, with an estimated band on a 9-point scale. Pronunciation is not scored: the app works from a transcript, not audio analysis." />
      <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><SpeakingStudio /></Suspense>
      <SpeakingSuggestions />
      <SpeakingDevelopment />
      <h2 className="mb-3 text-xl font-bold">Guided tasks</h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {speakingPrompts.map((p) => (
          <li key={p.slug}>
            <Link href={`/speaking/${p.slug}`} className="card card-link flex h-full flex-col p-6 ">
              <div className="flex flex-wrap items-center gap-2"><LevelBadge level={p.level} /><span className="chip"><Mic size={12} aria-hidden="true" />{FORMAT[p.format]}</span></div>
              <h2 className="mt-4 text-lg font-bold">{p.title}</h2>
              <p className="mt-2 flex-1 text-muted">{p.prompt}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles size={15} aria-hidden="true" /> AI practice feedback</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
