"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { X, CheckCircle2 } from "lucide-react";
import type { ReadingText, VocabItem } from "@/lib/content/schema";
import { segment, sentenceAt } from "@/lib/tokenize";
import { ItemHeader, SenseBlock } from "./SenseCard";
import { SaveButton } from "./SaveButton";
import { useLearner } from "./StoreProvider";

type Selection = { phrase: string; slug: string | null; context: string };

export function Reader({ text, forms, items }: { text: ReadingText; forms: Record<string, string>; items: VocabItem[] }) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [highlight, setHighlight] = useState(true);
  const [done, setDone] = useState(false);
  const { store, ready, saved } = useLearner();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
  const paras = useMemo(() => text.paragraphs.map((p) => { const m = p.match(/^\[([A-Z])\]\s*/); return { label: m?.[1] ?? null, body: m ? p.slice(m[0].length) : p }; }), [text]);
  const segmented = useMemo(() => paras.map((p) => segment(p.body, forms)), [paras, forms]);
  const savedSenses = new Set(saved.filter((s) => s.itemType === "sense").map((s) => s.itemRef));

  useEffect(() => {
    if (ready) store.setLastPosition({ href: `/reading/${text.slug}`, label: text.title }).catch(() => {});
  }, [ready, store, text]);
  useEffect(() => { if (sel) panelRef.current?.focus(); }, [sel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && sel) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() { setSel(null); lastTrigger.current?.focus(); }

  function open(e: React.MouseEvent<HTMLElement>, pIdx: number, segIdx: number) {
    const segs = segmented[pIdx];
    const head = segs[segIdx].partOf !== undefined ? segs[segIdx].partOf! : segIdx;
    const s = segs[head];
    let phrase = s.text;
    if (s.match && s.match.length > 1) {
      const words = segs.filter((x, i) => i === head || x.partOf === head).map((x) => x.text);
      phrase = words.join(" ");
    }
    lastTrigger.current = e.currentTarget;
    setSel({ phrase, slug: s.match?.slug ?? null, context: sentenceAt(paras[pIdx].body, s.start) });
  }

  async function finish() {
    await store.logEvent({ type: "reading_completed", contentType: "reading", contentRef: text.slug }).catch(() => {});
    setDone(true);
  }

  const item = sel?.slug ? bySlug.get(sel.slug) : undefined;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Tap any word for its meaning and Russian translation.</span>
        <label className="inline-flex items-center gap-2 font-medium text-ink">
          <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          Underline topic vocabulary
        </label>
      </div>

      <div className="card px-5 py-6 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-[68ch] font-[450] text-[18px] leading-[1.85]">
          {segmented.map((segs, p) => (
            <p key={p} className="mb-5">
              {paras[p].label && <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-md bg-surface-2 align-[2px] font-display text-xs font-bold text-muted" aria-label={`Paragraph ${paras[p].label}`}>{paras[p].label}</span>}
              {segs.map((s, i) => {
                if (!s.word) return <span key={i}>{s.text}</span>;
                const headIdx = s.partOf ?? i;
                const head = segs[headIdx];
                const known = !!head.match;
                const savedHere = known && bySlug.get(head.match!.slug)?.senses.some((x) => savedSenses.has(x.id));
                return (
                  <span key={i} role="button" tabIndex={0} onClick={(e) => open(e, p, i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e as never, p, i); } }}
                    className={clsx("cursor-pointer rounded-sm hover:bg-primary-soft focus-visible:bg-primary-soft",
                      known && highlight && "underline decoration-dotted decoration-2 underline-offset-[5px] decoration-[color-mix(in_srgb,var(--primary)_60%,transparent)]",
                      savedHere && "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]")}>
                    {s.text}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
        <div className="mx-auto mt-4 flex max-w-[68ch] items-center gap-3 border-t border-line pt-6">
          {done ? <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 size={18} aria-hidden="true" /> Marked as read. Now try the questions below.</p>
            : <button className="btn btn-primary" onClick={finish}>I've finished reading</button>}
        </div>
      </div>

      {sel && (
        <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="false" aria-label={`Meaning of ${sel.phrase}`}
          className="card fixed inset-x-3 bottom-20 z-40 max-h-[60vh] overflow-y-auto p-5 outline-none md:inset-x-auto md:bottom-6 md:right-6 md:w-[400px]">
          <button onClick={close} className="btn btn-ghost absolute right-3 top-3 h-9 w-9 !min-h-0 !p-0" aria-label="Close"><X size={16} /></button>
          {item ? (
            <div className="space-y-4 pr-8">
              <ItemHeader item={item} />
              {item.senses.map((s) => <SenseBlock key={s.id} item={item} sense={s} context={sel.context} sourceRef={`reading:${text.slug}`} />)}
              <Link href={`/vocabulary/${item.slug}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Full entry</Link>
            </div>
          ) : (
            <div className="space-y-3 pr-8">
              <p className="font-display text-2xl font-extrabold">{sel.phrase}</p>
              <p className="text-muted">This word isn't in the English Mastery dictionary yet. You can still save it with its sentence, to look up and review later.</p>
              <blockquote className="rounded-lg border-l-4 border-line bg-surface-2 px-3 py-2 text-[15px] italic">{sel.context}</blockquote>
              <SaveButton itemType="custom" itemRef={sel.phrase.toLowerCase()} label={sel.phrase} context={sel.context} sourceRef={`reading:${text.slug}`} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
