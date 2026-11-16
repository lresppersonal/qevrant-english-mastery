import { grammarLessons, grammarDomains, vocabItems, readingTexts, speakingPrompts, writingPrompts, themes } from "@/lib/content";

export interface SearchEntry { kind: string; title: string; subtitle: string; href: string; level?: string; haystack: string }

/** Client-side index over all published content. Postgres full-text replaces this in Phase 4. */
export function buildSearchIndex(): SearchEntry[] {
  const e: SearchEntry[] = [];
  const add = (x: Omit<SearchEntry, "haystack">, extra = "") =>
    e.push({ ...x, haystack: `${x.title} ${x.subtitle} ${extra}`.toLowerCase() });

  for (const t of themes) {
    add({ kind: "Topic", title: t.title, subtitle: t.summary, href: `/topics/${t.slug}` });
    add({ kind: "Vocabulary theme", title: t.title, subtitle: "Vocabulary by theme", href: `/vocabulary/topics/${t.slug}` });
  }
  for (const l of grammarLessons) {
    add({ kind: "Grammar", title: l.title, subtitle: l.summary, href: `/grammar/${l.slug}`, level: l.level });
    add({ kind: "Grammar practice", title: `Practice: ${l.title}`, subtitle: l.summary, href: `/grammar/${l.slug}/practice`, level: l.level });
    for (const s of l.sections) add({ kind: "Grammar section", title: s.title, subtitle: l.title, href: `/grammar/${l.slug}#${s.id}`, level: l.level });
  }
  for (const d of grammarDomains) add({ kind: "Grammar area", title: d.title, subtitle: d.description, href: `/grammar#${d.key}` }, d.topics.map((t) => t.title).join(" "));
  for (const v of vocabItems)
    add({ kind: "Vocabulary", title: v.lemma, subtitle: v.senses[0].definition, href: `/vocabulary/${v.slug}`, level: v.senses[0].level },
      v.senses.map((s) => `${s.definition} ${s.translations.ru} ${s.collocations.join(" ")} ${s.synonyms.join(" ")}`).join(" ") + " " + v.forms.join(" "));
  for (const r of readingTexts) add({ kind: "Reading", title: r.title, subtitle: r.standfirst, href: `/reading/${r.slug}`, level: r.level });
  for (const p of speakingPrompts) add({ kind: "Speaking", title: p.title, subtitle: p.prompt, href: `/speaking/${p.slug}`, level: p.level });
  for (const p of writingPrompts) add({ kind: "Academic Writing", title: p.title, subtitle: p.prompt, href: `/writing/${p.slug}`, level: p.level }, `${p.genre.replace(/_/g, " ")} ${p.topics.join(" ")}`);
  return e;
}

export function search(index: SearchEntry[], q: string, limit = 12) {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return index
    .map((x) => {
      if (!terms.every((t) => x.haystack.includes(t))) return null;
      const title = x.title.toLowerCase();
      const score = (title === terms.join(" ") ? 100 : 0) + (title.startsWith(terms[0]) ? 20 : 0) + (terms.every((t) => title.includes(t)) ? 10 : 0) - title.length / 100;
      return { x, score };
    })
    .filter((r): r is { x: SearchEntry; score: number } => !!r)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.x);
}
