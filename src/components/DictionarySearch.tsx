"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import type { VocabItem } from "@/lib/content/schema";
import { DictionaryCard } from "./Dictionary";

export function DictionarySearch({ items }: { items: VocabItem[] }) {
  const [word, setWord] = useState("");
  const [sentence, setSentence] = useState("");
  const [q, setQ] = useState<{ word: string; sentence: string } | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); const w = word.trim(); if (w) setQ({ word: w, sentence: sentence.trim() }); }}>
        <label className="block text-sm font-semibold">Word or phrase
          <input className="input mt-1" value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. many, running, despite, take off" autoComplete="off" maxLength={60} />
        </label>
        <label className="block text-sm font-semibold">Sentence it appears in (optional)
          <textarea className="input mt-1" rows={3} value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="Paste the sentence to get the meaning that fits it." maxLength={1200} />
        </label>
        <button className="btn btn-primary" disabled={!word.trim()}><Search size={16} aria-hidden="true" /> Look up</button>
        <p className="text-sm text-muted">Any English word works: forms like “studies” or “ran” are traced back to their base form.</p>
      </form>
      <div className="card min-h-40 p-5" aria-live="polite">
        {q ? <DictionaryCard key={`${q.word}|${q.sentence}`} word={q.word} sentence={q.sentence} items={items} sourceRef="dictionary" /> : <p className="text-muted">Results appear here.</p>}
      </div>
    </div>
  );
}
