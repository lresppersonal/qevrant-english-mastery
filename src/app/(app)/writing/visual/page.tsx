import { catalogue, GROUP_LABEL, TYPE_LABEL, getVisualTask } from "@/lib/visual";
import { PageHeader } from "@/components/ui";
import { VisualTaskButton } from "@/components/visual/VisualTaskButton";
import Link from "next/link";
import { ArrowLeft, BarChart3, Workflow, Map, Layers } from "lucide-react";

export const metadata = { title: "Visual Data Description" };
const ICON = { charts: BarChart3, diagrams: Workflow, maps: Map, combined: Layers } as const;
const ABOUT = {
  charts: "Trends over time, comparisons between groups and shares of a whole. Each task is generated with new, internally consistent data.",
  diagrams: "Sequences, natural cycles, devices and mechanisms: describe stages and how parts work together.",
  maps: "Changes to places and buildings over time, with location and change vocabulary.",
  combined: "Two related visuals: summarise each and connect them only where the data allow.",
} as const;

export default function VisualHub() {
  return (
    <>
      <Link href="/writing" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Academic Writing</Link>
      <PageHeader eyebrow="Academic Writing" title="Visual Data Description"
        intro="Describe and analyse charts, diagrams, maps and plans in a short academic report of at least 150 words. Each task has an original figure, a vocabulary bank, model sentence frames, a key-features checklist and AI feedback that checks your facts against the data." />
      <div className="space-y-8" data-testid="visual-hub">
        {catalogue().map(({ group, types }, gi) => {
          const Icon = ICON[group];
          return (
            <section key={group} aria-labelledby={`h-${group}`} className="enter" style={{ ["--i" as string]: gi }}>
              <h2 id={`h-${group}`} className="flex items-center gap-2 text-xl font-bold"><Icon size={20} className="text-primary" aria-hidden="true" /> {GROUP_LABEL[group]}</h2>
              <p className="mb-3 mt-1 text-sm text-muted">{ABOUT[group]}</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {types.map((t) => (
                  <li key={t.type} className="card flex flex-col p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold">{TYPE_LABEL[t.type]}</p>
                      <span className="text-xs text-muted">{t.generated ? `${t.templates} subjects · new data each time` : `${t.library.length} tasks`}</span>
                    </div>
                    {!t.generated && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {t.library.map((id) => <li key={id}><Link href={`/writing/visual/task?id=${id}`} className="text-primary underline-offset-4 hover:underline">{getVisualTask(id)?.title}</Link></li>)}
                      </ul>
                    )}
                    <div className="mt-auto pt-3"><VisualTaskButton type={t.type} label={t.generated ? "Generate a task" : "Random task"} /></div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
