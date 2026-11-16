/**
 * Splits a paragraph into word and separator segments, and marks multi-word dictionary
 * matches (longest match first, up to 5 words) for tap-to-define.
 */
export interface Segment { text: string; start: number; word: boolean; match?: { slug: string; length: number }; partOf?: number }

const WORD = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

export function segment(paragraph: string, forms: Record<string, string>): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of paragraph.matchAll(WORD)) {
    if (m.index! > last) out.push({ text: paragraph.slice(last, m.index), start: last, word: false });
    out.push({ text: m[0], start: m.index!, word: true });
    last = m.index! + m[0].length;
  }
  if (last < paragraph.length) out.push({ text: paragraph.slice(last), start: last, word: false });

  const wordIdx = out.map((s, i) => (s.word ? i : -1)).filter((i) => i >= 0);
  for (let w = 0; w < wordIdx.length; w++) {
    const head = out[wordIdx[w]];
    if (head.partOf !== undefined) continue;
    for (let n = Math.min(5, wordIdx.length - w); n >= 1; n--) {
      const slice = wordIdx.slice(w, w + n);
      // only join across plain spaces
      const gapsOk = slice.slice(1).every((idx) => out[idx - 1] && !out[idx - 1].word && out[idx - 1].text === " ");
      if (!gapsOk) continue;
      const key = slice.map((i) => out[i].text).join(" ").toLowerCase().replace(/’/g, "'");
      const slug = forms[key];
      if (slug) {
        head.match = { slug, length: n };
        slice.slice(1).forEach((i) => (out[i].partOf = wordIdx[w]));
        break;
      }
    }
  }
  return out;
}

/** The sentence around a character offset, used as saved context. */
export function sentenceAt(paragraph: string, offset: number) {
  const parts = paragraph.split(/(?<=[.!?])\s+(?=[A-Z‘“'"])/);
  let pos = 0;
  for (const s of parts) {
    const at = paragraph.indexOf(s, pos);
    if (offset >= at && offset <= at + s.length) return s.trim();
    pos = at + s.length;
  }
  return paragraph;
}
