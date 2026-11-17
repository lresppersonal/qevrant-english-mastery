"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";
import type { ReadingText, VocabItem } from "@/lib/content/schema";
import { segment, sentenceAt } from "@/lib/tokenize";
import { WordPopover } from "./WordPopover";
import { useLearner } from "./StoreProvider";

type Selection = { phrase: string; slug: string | null; context: string; anchor: HTMLElement; key: string };

export function Reader({ text, forms, items }: { text: ReadingText; forms: Record<string, string>; items: VocabItem[] }) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [highlight, setHighlight] = useState(true);
  const [done, setDone] = useState(false);
  const { store, ready, saved } = useLearner();
  const lastTrigger = useRef<HTMLElement | null>(null);
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
  const paras = useMemo(() => text.paragraphs.map((p) => { const m = p.match(/^\[([A-Z])\]\s*/); return { label: m?.[1] ?? null, body: m ? p.slice(m[0].length) : p }; }), [text]);
  const segmented = useMemo(() => paras.map((p) => segment(p.body, forms)), [paras, forms]);
  const savedSenses = new Set(saved.filter((s) => s.itemType === "sense").map((s) => s.itemRef));

  useEffect(() => {
    if (ready) store.setLastPosition({ href: `/reading/${text.slug}`, label: text.title }).catch(() => {});
  }, [ready, store, text]);
  // Closing returns focus to the word without scrolling the page.
  const close = useCallback((returnFocus: boolean) => { setSel(null); if (returnFocus) lastTrigger.current?.focus({ preventScroll: true }); }, []);

  function open(e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, pIdx: number, segIdx: number) {
    e.preventDefault();
    const segs = segmented[pIdx];
    const head = segs[segIdx].partOf !== undefined ? segs[segIdx].partOf! : segIdx;
    const s = segs[head];
    let phrase = s.text;
    if (s.match && s.match.length > 1) {
      const words = segs.filter((x, i) => i === head || x.partOf === head).map((x) => x.text);
      phrase = words.join(" ");
    }
    const key = `${pIdx}:${head}`;
    if (sel?.key === key) { setSel(null); return; } // tapping the same word again closes the card
    lastTrigger.current = e.currentTarget;
    setSel({ phrase, slug: s.match?.slug ?? null, context: sentenceAt(paras[pIdx].body, s.start), anchor: e.currentTarget, key });
  }

  async function finish() {
    await store.logEvent({ type: "reading_completed", contentType: "reading", contentRef: text.slug }).catch(() => {});
    setDone(true);
  }


  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Tap any word for its meaning, Russian translation and UK/US pronunciation.</span>
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
                  <span key={i} role="button" tabIndex={0} data-word="" aria-expanded={sel?.key === `${p}:${headIdx}`} onClick={(e) => open(e, p, i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") open(e, p, i); }}
                    className={clsx("cursor-pointer rounded-sm hover:bg-primary-soft focus-visible:bg-primary-soft", sel?.key === `${p}:${headIdx}` && "bg-primary-soft",
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
        <WordPopover key={sel.key} anchor={sel.anchor} word={sel.phrase} sentence={sel.context} items={items} sourceRef={`reading:${text.slug}`}
          gloss={text.keyVocabulary.find((k) => k.term.toLowerCase() === sel.phrase.toLowerCase())} onClose={close} />
      )}
    </>
  );
}
