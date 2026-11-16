"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { BookOpenText, Languages, Newspaper, PenLine, Mic, ListChecks, ArrowRight } from "lucide-react";
import type { Exercise, GrammarLesson, Level, ReadingText, SpeakingPrompt, Theme, WritingPrompt } from "@/lib/content/schema";
import { LEVELS } from "@/lib/content/schema";
import { ESSAY_LABEL } from "@/lib/essay";
import { LevelBadge, PageHeader } from "./ui";

type SenseRow = { slug: string; lemma: string; id: string; level: Level; lexClass: string };

function Section({ icon: Icon, title, count, children, href, hrefLabel = "See all" }: { icon: typeof Mic; title: string; count: number; children: React.ReactNode; href?: string; hrefLabel?: string }) {
  return (
    <section className="card p-5" aria-labelledby={`h-${title}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={19} className="text-primary" aria-hidden="true" />
        <h2 id={`h-${title}`} className="flex-1 text-lg font-bold">{title} <span className="text-sm font-medium text-muted">({count})</span></h2>
        {href && <Link href={href} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{hrefLabel}</Link>}
      </div>
      {count === 0 ? <p className="text-sm text-muted">Nothing at this level yet.</p> : children}
    </section>
  );
}
function Row({ href, level, title, sub }: { href: string; level: string; title: string; sub?: string }) {
  return (
    <li><Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
      <LevelBadge level={level} /><span className="min-w-0 flex-1"><span className="block font-medium">{title}</span>{sub && <span className="block truncate text-sm text-muted">{sub}</span>}</span>
      <ArrowRight size={15} className="text-muted" aria-hidden="true" /></Link></li>
  );
}

export function TopicHub(props: {
  theme: Theme; lessons: GrammarLesson[]; senses: SenseRow[]; texts: ReadingText[]; exercises: Exercise[];
  speaking: SpeakingPrompt[]; writing: WritingPrompt[];
}) {
  const [level, setLevel] = useState<Level | "all">("all");
  const f = <T extends { level: Level }>(xs: T[]) => (level === "all" ? xs : xs.filter((x) => x.level === level));
  const senses = f(props.senses);

  return (
    <>
      <PageHeader eyebrow={`Topic · ${props.theme.group}`} title={props.theme.title} intro={props.theme.summary} />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by level">
        {(["all", ...LEVELS] as const).map((l) => (
          <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}
            className={clsx("rounded-full border px-3.5 py-1.5 text-sm font-semibold", level === l ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>
            {l === "all" ? "All levels" : l}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Languages} title="Vocabulary" count={senses.length} href={`/vocabulary/topics/${props.theme.slug}`} hrefLabel="Open theme vocabulary">
          <ul className="grid gap-x-4 sm:grid-cols-2">
            {senses.slice(0, 16).map((s) => (
              <li key={s.id}><Link href={`/vocabulary/${s.slug}#${s.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <LevelBadge level={s.level} /><span className="truncate font-medium">{s.lemma}</span></Link></li>
            ))}
          </ul>
          {senses.length > 16 && <p className="mt-2 px-2 text-sm text-muted">+ {senses.length - 16} more</p>}
        </Section>
        <Section icon={Newspaper} title="Reading" count={f(props.texts).length} href="/reading">
          <ul>{f(props.texts).map((r) => <Row key={r.slug} href={`/reading/${r.slug}`} level={r.level} title={r.title} sub={r.standfirst} />)}</ul>
        </Section>
        <Section icon={PenLine} title="Academic Writing" count={f(props.writing).length} href={`/writing?theme=${props.theme.slug}`}>
          <ul>{f(props.writing).map((p) => <Row key={p.slug} href={`/writing/${p.slug}`} level={p.level} title={p.title} sub={`${ESSAY_LABEL[p.genre]} · ${p.prompt}`} />)}</ul>
        </Section>
        {(props.speaking.length > 0 || level !== "all") && props.speaking.length > 0 && (
          <Section icon={Mic} title="Speaking" count={f(props.speaking).length} href="/speaking">
            <ul>{f(props.speaking).map((p) => <Row key={p.slug} href={`/speaking/${p.slug}`} level={p.level} title={p.title} sub={p.prompt} />)}</ul>
          </Section>
        )}
        {props.lessons.length > 0 && (
          <Section icon={BookOpenText} title="Grammar in context" count={f(props.lessons).length} href="/grammar">
            <ul>{f(props.lessons).map((l) => <Row key={l.slug} href={`/grammar/${l.slug}`} level={l.level} title={l.title} sub={l.summary} />)}</ul>
          </Section>
        )}
        {props.exercises.length > 0 && (
          <Section icon={ListChecks} title="Vocabulary practice" count={f(props.exercises).length}>
            <ul>{f(props.exercises).map((e) => <Row key={e.slug} href={`/practice/${e.slug}`} level={e.level} title={e.title} sub={`${e.questions.length} questions`} />)}</ul>
          </Section>
        )}
      </div>
    </>
  );
}
