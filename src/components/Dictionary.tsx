"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Info } from "lucide-react";
import type { VocabItem } from "@/lib/content/schema";
import core from "@content/generated/core-lexicon.json";
import { createLocalDictionary, type CoreWord } from "@/lib/dictionary/local";
import type { DictEntry } from "@/lib/dictionary/types";
import { SaveButton } from "./SaveButton";
import { Pronounce } from "./Pronounce";
import { useAiStatus } from "./useAiStatus";
import { LevelBadge } from "./ui";

type State = { status: "loading" | "ready" | "error"; entry: DictEntry | null; error?: string; fromServer: boolean };
const memo = new Map<string, DictEntry>();

/** Looks a word up: local data instantly, then the server (pronunciation, context, unknown words). */
export function useDictionary(word: string, sentence: string, items: VocabItem[]) {
  const local = useMemo(() => createLocalDictionary(items, core as CoreWord[]), [items]);
  const [state, setState] = useState<State>({ status: "loading", entry: null, fromServer: false });
  const [attempt, setAttempt] = useState(0);
  const key = `${word.toLowerCase()}|${sentence}`;

  useEffect(() => {
    let cancelled = false;
    const cached = memo.get(key);
    if (cached) { setState({ status: "ready", entry: cached, fromServer: true }); return; }
    const loc = local.lookup(word);
    setState({ status: loc ? "ready" : "loading", entry: loc, fromServer: false });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 30000);
    fetch("/api/dictionary/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word, sentence }), signal: ctl.signal })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error ?? `The dictionary service returned an error (${r.status}).`);
        return json.entry as DictEntry;
      })
      .then((entry) => { if (cancelled) return; memo.set(key, entry); setState({ status: "ready", entry, fromServer: true }); })
      .catch((e: Error) => {
        if (cancelled) return;
        const msg = e.name === "AbortError" ? "The dictionary took too long to respond." : e instanceof TypeError ? (navigator.onLine ? "The online dictionary isn't reachable from this copy of the app." : "You're offline.") : e.message;
        setState((s) => (s.entry ? { ...s, status: "ready", error: msg } : { status: "error", entry: null, error: msg, fromServer: false }));
      })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; ctl.abort(); clearTimeout(timer); };
  }, [key, word, sentence, local, attempt]);

  return { ...state, retry: useCallback(() => { memo.delete(key); setAttempt((n) => n + 1); }, [key]) };
}

export function DictionaryCard({ word, sentence, items, sourceRef, gloss }: { word: string; sentence: string; items: VocabItem[]; sourceRef?: string; gloss?: { term: string; definition: string; ru: string } }) {
  const { status, entry, error, fromServer, retry } = useDictionary(word, sentence, items);
  const ai = useAiStatus();
  const [explain, setExplain] = useState<{ busy: boolean; note?: string; ru?: string; index?: number; error?: string }>({ busy: false });

  if (status === "loading") return <p className="flex items-center gap-2 py-6 text-muted" aria-live="polite"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Looking up “{word}”…</p>;
  if (!entry) {
    return (
      <div className="space-y-3" data-testid="dictionary-error">
        <p className="font-display text-2xl font-extrabold">{word}</p>
        <p role="alert" className="text-danger">{error}</p>
        <p className="text-sm text-muted">Your text and progress are not affected. You can try again, or save the word with its sentence and look it up later.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={retry}><RefreshCw size={16} aria-hidden="true" /> Try again</button>
          <SaveButton itemType="custom" itemRef={word.toLowerCase()} label={word} context={sentence} sourceRef={sourceRef} />
        </div>
      </div>
    );
  }

  const ctxIdx = explain.index ?? entry.contextIndex;
  const ordered = entry.senses.map((s, i) => ({ s, i })).sort((a, b) => (a.i === ctxIdx ? -1 : b.i === ctxIdx ? 1 : 0));
  const first = entry.senses[ctxIdx ?? 0];

  async function doExplain() {
    setExplain({ busy: true });
    try {
      const r = await fetch("/api/dictionary/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word, sentence, explain: true, entry }) });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error ?? "Couldn't explain this word right now.");
      setExplain({ busy: false, note: json.explanation.contextNote, ru: json.explanation.ru, index: json.explanation.contextIndex });
    } catch (e) { setExplain({ busy: false, error: (e as Error).message }); }
  }

  return (
    <div className="space-y-4" data-testid="dictionary-entry">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-display text-2xl font-extrabold">{entry.lemma}</p>
          {entry.cefr && <LevelBadge level={entry.cefr} />}
          {entry.register && entry.register !== "neutral" && <span className="chip">{entry.register}</span>}
        </div>
        {entry.formNote && <p className="text-sm text-muted" data-testid="form-note">“{entry.query}” is the {entry.formNote}.</p>}
      </div>
      <Pronounce word={entry.lemma} ipa={entry.ipa} audio={entry.audio} serverTts={ai?.tts} />
      {gloss && (
        <div className="rounded-xl border border-primary/40 bg-primary-soft px-4 py-3 text-[15px]" data-testid="text-gloss">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Key vocabulary in this text</p>
          <p className="mt-1"><strong>{gloss.term}</strong>: {gloss.definition} — <span lang="ru">{gloss.ru}</span></p>
        </div>
      )}

      {(entry.grammar || sentence) && (
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-[15px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">In this sentence</p>
          {sentence && <p className="mt-1 italic">{sentence}</p>}
          {entry.grammar && <p className="mt-1"><strong>Grammar:</strong> {entry.grammar}</p>}
          {(explain.note || entry.contextNote) && <p className="mt-1" data-testid="context-note"><strong>Meaning here:</strong> {explain.note ?? entry.contextNote}{explain.ru && <> — <span lang="ru">{explain.ru}</span></>}</p>}
          {!entry.contextNote && !explain.note && entry.senses.length > 1 && ai?.dictionaryAi && (
            <button type="button" className="btn btn-ghost mt-2 !min-h-9 !py-1 text-sm" onClick={doExplain} disabled={explain.busy}>
              {explain.busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} Explain the meaning in this sentence
            </button>
          )}
          {explain.error && <p role="alert" className="mt-1 text-sm text-danger">{explain.error}</p>}
        </div>
      )}

      <ol className="space-y-3">
        {ordered.map(({ s, i }, n) => (
          <li key={i} className={n === 0 ? "rounded-xl border-l-4 border-primary pl-3" : "border-l-4 border-transparent pl-3"} data-testid={n === 0 ? "best-sense" : undefined}>
            <p className="text-sm"><em className="text-muted">{s.pos}</em>{s.cefr && <span className="ml-2 text-xs font-semibold text-muted">{s.cefr}</span>}{n === 0 && entry.senses.length > 1 && <span className="ml-2 chip !py-0 text-xs">best fit here</span>}</p>
            <p className="font-medium">{s.definition}</p>
            {s.ru && <p lang="ru" className="text-primary">{s.ru}</p>}
            {s.examples.slice(0, 2).map((x) => <p key={x} className="text-[15px] italic text-muted">{x}</p>)}
          </li>
        ))}
      </ol>

      {entry.usageNotes.length > 0 && <div className="flex gap-2 rounded-xl border border-line px-3 py-2 text-[15px]"><Info size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" /><div>{entry.usageNotes.map((u) => <p key={u}>{u}</p>)}</div></div>}
      <dl className="space-y-1.5 text-[15px]">
        {entry.collocations.length > 0 && <div><dt className="inline font-semibold">Collocations: </dt><dd className="inline">{entry.collocations.join(" · ")}</dd></div>}
        {entry.synonyms.length > 0 && <div><dt className="inline font-semibold">Synonyms: </dt><dd className="inline">{entry.synonyms.join(", ")}</dd></div>}
        {entry.antonyms.length > 0 && <div><dt className="inline font-semibold">Antonyms: </dt><dd className="inline">{entry.antonyms.join(", ")}</dd></div>}
        {entry.forms.length > 0 && <div><dt className="inline font-semibold">Forms and related words: </dt><dd className="inline">{entry.forms.join(", ")}</dd></div>}
      </dl>
      {entry.missing.length > 0 && <p className="text-sm text-muted">Not available yet: {entry.missing.join("; ")}.</p>}
      {error && fromServer === false && <p className="text-sm text-muted">Showing the built-in entry. {error} <button type="button" className="font-semibold text-primary underline" onClick={retry}>Retry</button></p>}

      <div className="flex flex-wrap items-center gap-3">
        {first?.senseRef ? <SaveButton itemType="sense" itemRef={first.senseRef} label={entry.lemma} context={sentence} sourceRef={sourceRef} />
          : <SaveButton itemType="custom" itemRef={entry.lemma.toLowerCase()} label={entry.lemma} context={[first?.ru, first?.definition].filter(Boolean).join(" — ") || sentence} sourceRef={sourceRef} />}
        {entry.vocabSlug && <Link href={`/vocabulary/${entry.vocabSlug}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Full entry</Link>}
      </div>
      {entry.sources.length > 0 && <p className="text-xs text-muted">Sources: {entry.sources.map((s, i) => <span key={i}>{i > 0 && "; "}{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.name}</a> : s.name}{s.license ? ` (${s.license})` : ""}</span>)}</p>}
    </div>
  );
}
