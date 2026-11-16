"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";

/** Open questions: no single right answer, so we offer points to consider rather than a score. */
export function CriticalThinking({ items }: { items: { question: string; points: string }[] }) {
  const [open, setOpen] = useState<number[]>([]);
  return (
    <section className="card mt-10 p-5 sm:p-6" aria-labelledby="h-crit">
      <h2 id="h-crit" className="flex items-center gap-2 text-xl font-bold"><Lightbulb size={20} aria-hidden="true" /> Critical thinking</h2>
      <p className="mt-1 text-sm text-muted">Discuss with a partner, or answer in writing. There is no single correct answer; reveal the points to consider when you're ready.</p>
      <ol className="mt-4 space-y-4">
        {items.map((c, i) => (
          <li key={i} className="rounded-xl bg-surface-2 px-4 py-3">
            <p className="font-medium">{i + 1}. {c.question}</p>
            {open.includes(i) ? <p className="mt-2 text-[15px] text-muted">{c.points}</p>
              : <button onClick={() => setOpen((o) => [...o, i])} className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">Show points to consider</button>}
          </li>
        ))}
      </ol>
    </section>
  );
}
