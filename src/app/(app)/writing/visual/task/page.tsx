"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { getVisualTask, TYPE_LABEL, VISUAL_PREFIX, type VisualTask } from "@/lib/visual";
import { WritingWorkspace, type WorkspaceTask } from "@/components/EssayWorkspace";
import { VisualFigure } from "@/components/visual/VisualFigure";
import { VisualTaskButton } from "@/components/visual/VisualTaskButton";
import { LevelBadge, Rich } from "@/components/ui";

function KeyFeatures({ t }: { t: VisualTask }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5" data-testid="key-features">
      <p className="font-bold">Key features to look for</p>
      {open ? <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">{t.keyFeatures.map((k) => <li key={k}>{k}</li>)}</ul>
        : <><p className="mt-1 text-sm text-muted">Study the figure and decide on the main features first, then compare with this checklist.</p>
          <button type="button" className="btn btn-ghost mt-2 !min-h-0 !py-1.5 text-sm" onClick={() => setOpen(true)}>Show the checklist</button></>}
    </div>
  );
}

function Aside({ t }: { t: VisualTask }) {
  return (
    <>
      <div className="card p-5">
        <p className="font-bold">How to organise it</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px]">
          <li>Introduction: paraphrase what the {t.group === "charts" || t.group === "combined" ? "figures show" : "diagram or maps show"}.</li>
          <li>Overview: two or three main features, with no detailed numbers.</li>
          <li>{t.group === "diagrams" ? "Body: the stages or parts in a logical order, grouped into phases." : t.group === "maps" ? "Body: the main changes, grouped by area or by type of change." : "Body: the key figures, grouped by trend or by comparison."}</li>
          <li>No opinions, causes or recommendations that the figure does not show.</li>
        </ol>
      </div>
      <KeyFeatures t={t} />
      <div className="card p-5">
        <p className="font-bold">Vocabulary bank</p>
        <ul className="mt-2 space-y-1.5 text-[15px]">{t.vocabulary.map((v) => <li key={v.term}><span className="font-semibold">{v.term}</span> <span className="text-muted">— <Rich text={v.use} /></span></li>)}</ul>
      </div>
      <div className="card p-5">
        <p className="font-bold">Useful sentence frames</p>
        <ul className="mt-2 space-y-1.5 text-[15px] text-muted">{t.expressions.map((e) => <li key={e}>{e}</li>)}</ul>
      </div>
    </>
  );
}

function Task() {
  const id = useSearchParams().get("id") ?? "";
  const t = useMemo(() => getVisualTask(id), [id]);
  if (!t) return (
    <div className="card p-6"><p className="font-semibold">This task doesn't exist.</p><Link href="/writing/visual" className="btn btn-primary mt-3">Choose a visual task</Link></div>
  );
  const task: WorkspaceTask = {
    slug: `${VISUAL_PREFIX}${t.id}`, title: t.title, minWords: t.minWords, href: `/writing/visual/task?id=${t.id}`, positionLabel: `Visual task: ${t.title}`,
    backHref: "/writing/visual", backLabel: "Visual Data Description", textLabel: "Your response", variant: "visual",
    header: (
      <div data-testid="visual-task">
        <div className="mb-2 flex flex-wrap items-center gap-2"><LevelBadge level={t.level} /><span className="chip">{TYPE_LABEL[t.type]}</span><span className="chip">{t.minWords}+ words</span><span className="chip">about {t.minutes} min</span></div>
        <h1 className="text-3xl font-extrabold">{t.title}</h1>
        <blockquote className="card mt-4 border-l-4 !border-l-primary p-5 text-[17px] font-medium leading-relaxed">{t.instruction}</blockquote>
        <div className="mt-4 space-y-4">{t.figures.map((f, i) => <VisualFigure key={i} figure={f} />)}</div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Info size={13} aria-hidden="true" /> {t.sourceNote}</p>
        <div className="mt-3"><VisualTaskButton type={t.type} avoid={[t.id]} label="Another task of this type" /></div>
      </div>
    ),
    aside: <Aside t={t} />,
  };
  return <WritingWorkspace key={t.id} task={task} />;
}

export default function VisualTaskPage() {
  return <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}><Task /></Suspense>;
}
