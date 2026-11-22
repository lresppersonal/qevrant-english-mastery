"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { BookOpenText, Languages, Newspaper, PenLine, Mic, ListChecks, ArrowRight, Headphones } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import type { Exercise, GrammarLesson, Level, ReadingText, SpeakingPrompt, Theme, WritingPrompt } from "@/lib/content/schema";
import { LEVELS } from "@/lib/content/schema";
import { ESSAY_LABEL } from "@/lib/essay";
import { LevelBadge, PageHeader } from "./ui";
import { topicContext, withNavContext } from "@/lib/nav-context";
import type { ListeningResource } from "@/lib/listening";

type SenseRow = { slug: string; lemma: string; id: string; level: Level; lexClass: string };

function Section({ icon: Icon, title, count, children, href, hrefLabel = "See all", i = 0 }: { icon: typeof Mic; title: string; count: number; children: React.ReactNode; href?: string; hrefLabel?: string; i?: number }) {
  return (
    <section className="card enter p-5" style={{ ["--i" as string]: i }} aria-labelledby={`h-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={19} className="text-primary" aria-hidden="true" />
        <h2 id={`h-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="flex-1 text-lg font-bold">{title} <span className="text-sm font-medium text-muted">({count})</span></h2>
        {href && <Link href={href} className="py-2.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">{hrefLabel}</Link>}
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
  speaking: SpeakingPrompt[]; writing: WritingPrompt[]; listening: ListeningResource[]; listeningTopic: string | null;
}) {
  // Every link from a topic carries the topic as its context, so "Back" in any module returns here.
  const ctx = topicContext(props.theme.slug);
  const to = (href: string) => withNavContext(href, ctx);
  // The level filter is remembered for this topic in this tab, so returning keeps the same view.
  const levelKey = `qevrant.topic.level.${props.theme.slug}`;
  const [level, setLevelState] = useState<Level | "all">("all");
  useEffect(() => {
    try { const v = sessionStorage.getItem(levelKey); if (v && (v === "all" || (LEVELS as readonly string[]).includes(v))) setLevelState(v as Level | "all"); } catch { /* storage unavailable */ }
  }, [levelKey]);
  const setLevel = (l: Level | "all") => { setLevelState(l); try { sessionStorage.setItem(levelKey, l); } catch { /* storage unavailable */ } };
  const listening = level === "all" ? props.listening : props.listening.filter((r) => (r.levels as string[]).includes(level));
  const f = <T extends { level: string }>(xs: T[]) => (level === "all" ? xs : xs.filter((x) => x.level === level));
  const senses = f(props.senses);

  return (
    <>
      <Link href={`/vocabulary/topics/${props.theme.slug}`} className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink" data-testid="hub-back"><ArrowLeft size={15} aria-hidden="true" /> {props.theme.title} vocabulary</Link>
      <PageHeader eyebrow={`Topic · ${props.theme.group}`} title={props.theme.title} intro={props.theme.summary} />
      <div className="scroll-row mb-6" role="group" aria-label="Filter by level">
        {(["all", ...LEVELS] as const).map((l) => (
          <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}
            className={clsx("rounded-full border px-3.5 py-1.5 text-sm font-semibold", level === l ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>
            {l === "all" ? "All levels" : l}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Languages} i={0} title="Vocabulary" count={senses.length} href={to(`/vocabulary/topics/${props.theme.slug}`)} hrefLabel="Open theme vocabulary">
          <ul className="grid gap-x-4 sm:grid-cols-2">
            {senses.slice(0, 16).map((s) => (
              <li key={s.id}><Link href={to(`/vocabulary/${s.slug}#${s.id}`)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <LevelBadge level={s.level} /><span className="truncate font-medium">{s.lemma}</span></Link></li>
            ))}
          </ul>
          {senses.length > 16 && <p className="mt-2 px-2 text-sm text-muted">+ {senses.length - 16} more</p>}
        </Section>
        <Section icon={Newspaper} i={1} title="Reading" count={f(props.texts).length} href={to("/reading")}>
          <ul>{f(props.texts).map((r) => <Row key={r.slug} href={to(`/reading/${r.slug}`)} level={r.level} title={r.title} sub={r.standfirst} />)}</ul>
        </Section>
        <Section icon={PenLine} i={2} title="Academic Writing" count={f(props.writing).length} href={to(`/writing?theme=${props.theme.slug}`)}>
          <ul>{f(props.writing).map((p) => <Row key={p.slug} href={to(`/writing/${p.slug}`)} level={p.level} title={p.title} sub={`${ESSAY_LABEL[p.genre]} · ${p.prompt}`} />)}</ul>
        </Section>
        {(props.speaking.length > 0 || level !== "all") && props.speaking.length > 0 && (
          <Section icon={Mic} i={3} title="Speaking" count={f(props.speaking).length} href={to("/speaking")}>
            <ul>{f(props.speaking).map((p) => <Row key={p.slug} href={to(`/speaking/${p.slug}`)} level={p.level} title={p.title} sub={p.prompt} />)}</ul>
          </Section>
        )}
        {props.listening.length > 0 && (
          <Section icon={Headphones} i={4} title="Listening" count={listening.length} href={to(`/listening${props.listeningTopic ? `?topic=${props.listeningTopic}` : ""}`)}>
            <ul>{listening.map((r) => <Row key={r.slug} href={to(`/listening${props.listeningTopic ? `?topic=${r.topics.find((t) => t === props.listeningTopic) ? props.listeningTopic : r.topics[0]}` : ""}#listen-${r.slug}`)} level={r.levels[0]} title={r.title} sub={`${r.source} · ${r.duration}`} />)}</ul>
          </Section>
        )}
        {props.lessons.length > 0 && (
          <Section icon={BookOpenText} i={5} title="Grammar in context" count={f(props.lessons).length} href="/grammar">
            <ul>{f(props.lessons).map((l) => <Row key={l.slug} href={to(`/grammar/${l.slug}`)} level={l.level} title={l.title} sub={l.summary} />)}</ul>
          </Section>
        )}
        {props.exercises.length > 0 && (
          <Section icon={ListChecks} i={6} title="Vocabulary practice" count={f(props.exercises).length}>
            <ul>{f(props.exercises).map((e) => <Row key={e.slug} href={to(`/practice/${e.slug}`)} level={e.level} title={e.title} sub={`${e.questions.length} questions`} />)}</ul>
          </Section>
        )}
      </div>
    </>
  );
}
