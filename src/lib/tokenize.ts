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

const CONTRACTIONS: Record<string, [string, string]> = {
  "won't": ["will", "will not"], "can't": ["can", "cannot"], "shan't": ["shall", "shall not"], "ain't": ["be", "am not / is not"],
  "i'm": ["I", "I am"], "let's": ["let", "let us"],
};
const SUFFIX: [RegExp, (stem: string) => [string, string]][] = [
  [/^(.+)n't$/i, (s) => [s, `${s} not`]],
  [/^(.+)'re$/i, (s) => [s, `${s} are`]],
  [/^(.+)'ve$/i, (s) => [s, `${s} have`]],
  [/^(.+)'ll$/i, (s) => [s, `${s} will`]],
  [/^(.+)'d$/i, (s) => [s, `${s} would / had`]],
];

/**
 * The form to look up for a tapped token, plus a note when it differs: possessives ("company's",
 * "students'") look up the noun; contractions ("don't", "they're") look up the main word and say
 * what the contraction stands for. Hyphenated words and ordinary words are unchanged.
 */
export function lookupForm(token: string): { lookup: string; note: string | null } {
  const t = token.replace(/’/g, "'");
  const lower = t.toLowerCase();
  if (CONTRACTIONS[lower]) { const [w, full] = CONTRACTIONS[lower]; return { lookup: w, note: `“${token}” is short for “${full}”.` }; }
  for (const [re, f] of SUFFIX) { const m = t.match(re); if (m && m[1].length > 0) { const [w, full] = f(m[1]); return { lookup: w, note: `“${token}” is short for “${full}”.` }; } }
  // it's / he's / she's / that's / what's: "is" or "has"; nouns + 's: possessive (or "is")
  const s = t.match(/^(.+)'s$/i);
  if (s) {
    const pron = ["it", "he", "she", "that", "what", "there", "here", "who", "where", "how"].includes(s[1].toLowerCase());
    return { lookup: s[1], note: pron ? `“${token}” is short for “${s[1]} is” or “${s[1]} has”.` : `“${token}” is the possessive form of “${s[1]}”.` };
  }
  if (/s'$/i.test(t)) return { lookup: t.slice(0, -1), note: `“${token}” is a plural possessive.` };
  return { lookup: t, note: null };
}
