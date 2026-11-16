"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { BookOpenText, Languages, Newspaper, PenLine, Mic, ListChecks, ArrowRight } from "lucide-react";
import type { Exercise, GrammarLesson, Level, ReadingText, SpeakingPrompt, Topic, WritingPrompt } from "@/lib/content/schema";
import { LEVELS } from "@/lib/content/schema";
import { LevelBadge, PageHeader } from "./ui";

type SenseRow = { slug: string; lemma: string; id: string; level: Level; definition: string; ru: string };

export function TopicHub(props: {
  topic: Topic; lessons: GrammarLesson[]; senses: SenseRow[]; texts: ReadingText[]; exercises: Exercise[];
  speaking: SpeakingPrompt[]; writing: WritingPrompt[];
}) {
  const [level, setLevel] = useState<Level | "all">("all");
  const f = <T extends { level: Level }>(xs: T[]) => (level === "all" ? xs : xs.filter((x) => x.level === level));
  const senses = f(props.senses);

  const Section = ({ icon: Icon, title, count, children, href }: { icon: typeof Mic; title: string; count: number; children: React.ReactNode; href?: string }) => (
    <section className="card p-5" aria-labelledby={`h-${title}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={19} className="text-primary" aria-hidden="true" />
        <h2 id={`h-${title}`} className="flex-1 text-lg font-bold">{title} <span className="text-sm font-medium text-muted">({count})</span></h2>
        {href && <Link href={href} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">See all</Link>}
      </div>
      {count === 0 ? <p className="text-sm text-muted">Nothing at this level yet.</p> : children}
    </section>
  );
  const Row = ({ href, level, title, sub }: { href: string; level: string; title: string; sub?: string }) => (
    <li><Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
      <LevelBadge level={level} /><span className="min-w-0 flex-1"><span className="block font-medium">{title}</span>{sub && <span className="block truncate text-sm text-muted">{sub}</span>}</span>
      <ArrowRight size={15} className="text-muted" aria-hidden="true" /></Link></li>
  );

  return (
    <>
      <PageHeader eyebrow={`Topic · ${props.topic.family}`} title={props.topic.title} intro={props.topic.summary} />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by level">
        {(["all", ...LEVELS] as const).map((l) => (
          <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}
            className={clsx("rounded-full border px-3.5 py-1.5 text-sm font-semibold", level === l ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>
            {l === "all" ? "All levels" : l}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={BookOpenText} title="Grammar" count={f(props.lessons).length} href="/grammar">
          <ul>{f(props.lessons).map((l) => <Row key={l.slug} href={`/grammar/${l.slug}`} level={l.level} title={l.title} sub={l.summary} />)}</ul>
        </Section>
        <Section icon={Newspaper} title="Reading" count={f(props.texts).length} href="/reading">
          <ul>{f(props.texts).map((r) => <Row key={r.slug} href={`/reading/${r.slug}`} level={r.level} title={r.title} sub={r.standfirst} />)}</ul>
        </Section>
        <Section icon={Languages} title="Vocabulary" count={senses.length} href="/vocabulary">
          <ul className="grid gap-x-4 sm:grid-cols-2">
            {senses.slice(0, 14).map((s) => (
              <li key={s.id}><Link href={`/vocabulary/${s.slug}#${s.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <LevelBadge level={s.level} /><span className="truncate font-medium">{s.lemma}</span></Link></li>
            ))}
          </ul>
          {senses.length > 14 && <p className="mt-2 px-2 text-sm text-muted">+ {senses.length - 14} more in Vocabulary</p>}
        </Section>
        <Section icon={ListChecks} title="Practice" count={f(props.exercises).length}>
          <ul>{f(props.exercises).map((e) => {
            const href = e.target.type === "lesson" ? `/grammar/${e.target.ref}#practice` : e.target.type === "text" ? `/reading/${e.target.ref}` : `/practice/${e.slug}`;
            return <Row key={e.slug} href={href} level={e.level} title={e.title} sub={`${e.questions.length} questions · ${e.skill}`} />;
          })}</ul>
        </Section>
        <Section icon={Mic} title="Speaking" count={f(props.speaking).length} href="/speaking">
          <ul>{f(props.speaking).map((p) => <Row key={p.slug} href={`/speaking/${p.slug}`} level={p.level} title={p.title} sub={p.prompt} />)}</ul>
        </Section>
        <Section icon={PenLine} title="Academic Writing" count={f(props.writing).length} href="/writing">
          <ul>{f(props.writing).map((p) => <Row key={p.slug} href={`/writing/${p.slug}`} level={p.level} title={p.title} sub={p.prompt} />)}</ul>
        </Section>
      </div>
    </>
  );
}
