import Link from "next/link";
import { speakingPrompts } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { Mic, Sparkles } from "lucide-react";
import { SpeakingStudio } from "@/components/SpeakingStudio";

export const metadata = { title: "Speaking" };
const FORMAT = { interview: "Interview questions", long_turn: "Long turn", discussion: "Discussion" } as const;

export default function SpeakingIndex() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Speaking"
        intro="Generate a random topic, prepare, speak against the clock and get AI practice feedback on fluency, vocabulary and grammar, with an estimated IELTS-style band." />
      <SpeakingStudio />
      <h2 className="mb-3 text-xl font-bold">Guided tasks</h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {speakingPrompts.map((p) => (
          <li key={p.slug}>
            <Link href={`/speaking/${p.slug}`} className="card flex h-full flex-col p-6 hover:border-primary">
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
