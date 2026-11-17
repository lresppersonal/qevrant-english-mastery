"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { VocabItem } from "@/lib/content/schema";
import { lookupForm } from "@/lib/tokenize";
import { useDictionary, DictionaryCard } from "./Dictionary";
import { Pronounce } from "./Pronounce";
import { SaveButton } from "./SaveButton";
import { useAiStatus } from "./useAiStatus";
import { LevelBadge } from "./ui";

const GAP = 10, MARGIN = 8, MAX_W = 360;

/**
 * A small card anchored to the tapped word. It is positioned in document coordinates (absolute),
 * so it scrolls with the text and never moves the page: no scrollIntoView, and focus uses
 * preventScroll. It opens above the word when there is room, otherwise below, and is clamped
 * horizontally to stay inside the viewport.
 */
export function WordPopover({ anchor, word, sentence, items, sourceRef, gloss, onClose }: {
  anchor: HTMLElement; word: string; sentence: string; items: VocabItem[]; sourceRef: string;
  gloss?: { term: string; definition: string; ru: string }; onClose: (returnFocus: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; above: boolean; arrow: number } | null>(null);
  const [more, setMore] = useState(false);
  const { lookup, note } = lookupForm(word);
  const { status, entry, error, retry } = useDictionary(lookup, sentence, items);
  const ai = useAiStatus();

  // Measure and place (again whenever the content changes size)
  useLayoutEffect(() => {
    const place = () => {
      const el = ref.current; if (!el) return;
      const r = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const width = Math.min(MAX_W, vw - MARGIN * 2);
      const h = el.offsetHeight;
      const above = r.top - GAP - h >= MARGIN + 56 || r.bottom + GAP + h > vh - MARGIN; // 56: sticky header
      const centre = r.left + r.width / 2;
      const left = Math.min(Math.max(MARGIN, centre - width / 2), vw - width - MARGIN);
      const top = (above ? r.top - GAP - h : r.bottom + GAP) + window.scrollY;
      setPos({ top: Math.max(window.scrollY + MARGIN, top), left: left + window.scrollX, width, above, arrow: Math.min(Math.max(16, centre - left), width - 16) });
    };
    place();
    const ro = new ResizeObserver(place);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", place);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); };
  }, [anchor, status, more]);

  // Focus the card without scrolling; close on Escape or a click elsewhere
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(true); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      if ((t as HTMLElement).closest?.("[data-word]")) return; // another word: the reader opens it instead
      onClose(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [anchor, onClose]);

  const sense = entry ? entry.senses[entry.contextIndex ?? 0] ?? entry.senses[0] : null;
  const synonyms = entry ? [...new Set(entry.synonyms)].filter((s) => s.toLowerCase() !== entry.lemma.toLowerCase()).slice(0, 3) : [];

  const body = (
    <div ref={ref} role="dialog" aria-modal="false" aria-label={`Meaning of ${word}`} tabIndex={-1} data-testid="word-popover"
      className="word-pop card absolute z-50 p-4 outline-none" data-side={pos?.above ? "top" : "bottom"}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? 0, width: pos?.width ?? MAX_W, visibility: pos ? "visible" : "hidden" }}>
      <span aria-hidden="true" className="word-pop-arrow" style={{ left: pos?.arrow ?? 24 }} />
      <button type="button" onClick={() => onClose(true)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Close"><X size={15} /></button>

      {status === "loading" && !entry && <p className="flex items-center gap-2 py-3 pr-8 text-muted" aria-live="polite"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Looking up “{word}”…</p>}

      {!entry && status === "error" && (
        <div className="space-y-2 pr-6" data-testid="dictionary-error">
          <p className="font-display text-xl font-extrabold">{word}</p>
          {gloss ? <p className="text-[15px]"><strong>{gloss.term}</strong>: {gloss.definition} — <span lang="ru">{gloss.ru}</span></p> : null}
          <p role="alert" className="text-sm text-danger">{error}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary !min-h-9 !px-3 text-sm" onClick={retry}><RefreshCw size={14} aria-hidden="true" /> Try again</button>
            <SaveButton itemType="custom" itemRef={lookup.toLowerCase()} label={lookup} context={sentence} sourceRef={sourceRef} />
          </div>
        </div>
      )}

      {entry && !more && (
        <div className="space-y-2.5" data-testid="dictionary-entry">
          <div className="pr-8">
            <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-display text-xl font-extrabold" data-testid="pop-lemma">{entry.lemma}</span>{entry.cefr && <LevelBadge level={entry.cefr} />}{sense?.pos && <em className="text-sm text-muted">{sense.pos}</em>}</p>
            {(note || entry.formNote) && <p className="text-xs text-muted" data-testid="form-note">{note ?? `“${entry.query}” is the ${entry.formNote}.`}</p>}
          </div>
          {sense?.ru ? <p lang="ru" className="font-semibold text-primary" data-testid="pop-ru">{sense.ru}</p>
            : gloss ? <p lang="ru" className="font-semibold text-primary" data-testid="pop-ru">{gloss.ru}</p> : null}
          {sense?.definition ? <p className="text-[15px] leading-snug" data-testid="pop-definition">{entry.contextNote ?? sense.definition}</p>
            : gloss && <p className="text-[15px] leading-snug" data-testid="pop-definition">{gloss.definition}</p>}
          {synonyms.length > 0 && <p className="text-sm" data-testid="pop-synonyms"><span className="font-semibold">Synonyms: </span>{synonyms.join(", ")}</p>}
          <Pronounce word={entry.lemma} ipa={entry.ipa} audio={entry.audio} serverTts={ai?.tts} />
          {entry.missing.length > 0 && !sense?.ru && <p className="text-xs text-muted">Not available yet: {entry.missing.join("; ")}.</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
            {sense?.senseRef ? <SaveButton itemType="sense" itemRef={sense.senseRef} label={entry.lemma} context={sentence} sourceRef={sourceRef} />
              : <SaveButton itemType="custom" itemRef={entry.lemma.toLowerCase()} label={entry.lemma} context={[sense?.ru, sense?.definition].filter(Boolean).join(" — ") || sentence} sourceRef={sourceRef} />}
            <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setMore(true)} aria-expanded={false}>More details <ChevronDown size={14} aria-hidden="true" /></button>
          </div>
        </div>
      )}

      {entry && more && (
        <div>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto pr-6"><DictionaryCard word={lookup} sentence={sentence} items={items} sourceRef={sourceRef} gloss={gloss} /></div>
          <div className="mt-2 flex items-center border-t border-line pt-2">
            <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setMore(false)} aria-expanded={true}>Less <ChevronUp size={14} aria-hidden="true" /></button>
          </div>
        </div>
      )}
    </div>
  );
  return createPortal(body, document.body);
}
