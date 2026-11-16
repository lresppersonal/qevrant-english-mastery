import Link from "next/link";
import { readingTexts } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { Clock } from "lucide-react";

export const metadata = { title: "Reading" };

export default function Reading() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Reading" intro="Original articles written for advanced learners. Tap any word to see its meaning and save it with the sentence it came from." />
      <ul className="grid gap-4 md:grid-cols-2">
        {readingTexts.map((r) => (
          <li key={r.slug}>
            <Link href={`/reading/${r.slug}`} className="card block h-full p-6 hover:border-primary">
              <div className="flex items-center gap-2"><LevelBadge level={r.level} /><span className="chip"><Clock size={12} aria-hidden="true" />{r.minutes} min</span><span className="chip">Education</span></div>
              <h2 className="mt-4 text-xl font-bold">{r.title}</h2>
              <p className="mt-2 text-muted">{r.standfirst}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">More texts arrive with each new topic.</p>
    </>
  );
}
