/**
 * Base-form candidates for an English word form, most likely first.
 * Rule-based and dependency-free so it works on the client too. The server
 * also uses the sentence context (see context.ts) to choose between them.
 */
const IRREGULAR: Record<string, [string, string]> = {};
const add = (base: string, note: string, ...forms: string[]) => forms.forEach((f) => (IRREGULAR[f] = [base, note]));
// verbs: past simple and past participle
const VERBS = "arise arose arisen|be was,were been|bear bore born,borne|beat beat beaten|become became become|begin began begun|bend bent bent|bet bet bet|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|breed bred bred|bring brought brought|broadcast broadcast broadcast|build built built|burn burnt burnt|burst burst burst|buy bought bought|catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|creep crept crept|cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|dream dreamt dreamt|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|flee fled fled|fly flew flown|forbid forbade forbidden|forecast forecast forecast|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got got,gotten|give gave given|go went gone|grind ground ground|grow grew grown|hang hung hung|have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|know knew known|lay laid laid|lead led led|lean leant leant|leap leapt leapt|learn learnt learnt|leave left left|lend lent lent|let let let|lie lay lain|light lit lit|lose lost lost|make made made|mean meant meant|meet met met|mislead misled misled|overcome overcame overcome|pay paid paid|prove proved proven|put put put|quit quit quit|read read read|rid rid rid|ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|set set set|shake shook shaken|shed shed shed|shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|speak spoke spoken|speed sped sped|spend spent spent|spin spun spun|split split split|spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck|sting stung stung|strike struck struck|strive strove striven|swear swore sworn|sweep swept swept|swim swam swum|swing swung swung|take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|sew sewed sewn|undergo underwent undergone|understand understood understood|undertake undertook undertaken|upset upset upset|wake woke woken|wear wore worn|weave wove woven|win won won|wind wound wound|withdraw withdrew withdrawn|write wrote written";
for (const v of VERBS.split("|")) {
  const [base, past, pp] = v.split(" ");
  past.split(",").forEach((f) => f !== base && add(base, `past simple of ${base}`, f));
  pp.split(",").forEach((f) => f !== base && !IRREGULAR[f] && add(base, `past participle of ${base}`, f));
  pp.split(",").forEach((f) => { if (IRREGULAR[f]?.[1].startsWith("past simple") && past.split(",").includes(f)) IRREGULAR[f] = [base, `past simple and past participle of ${base}`]; });
}
add("be", "present form of be", "am", "is", "are"); add("be", "-ing form of be", "being");
add("have", "third-person form of have", "has"); add("do", "third-person form of do", "does"); add("go", "third-person form of go", "goes");
// nouns
for (const [pl, sg] of [["people", "person"], ["children", "child"], ["men", "man"], ["women", "woman"], ["feet", "foot"], ["teeth", "tooth"], ["mice", "mouse"], ["geese", "goose"], ["data", "datum"], ["criteria", "criterion"], ["phenomena", "phenomenon"], ["analyses", "analysis"], ["crises", "crisis"], ["hypotheses", "hypothesis"], ["theses", "thesis"], ["media", "medium"], ["lives", "life"], ["wives", "wife"], ["knives", "knife"], ["leaves", "leaf"], ["halves", "half"], ["selves", "self"], ["shelves", "shelf"], ["wolves", "wolf"]] as const) add(sg, `plural of ${sg}`, pl);
// adjectives / adverbs
add("good", "comparative of good", "better"); add("good", "superlative of good", "best");
add("bad", "comparative of bad", "worse"); add("bad", "superlative of bad", "worst");
add("far", "comparative of far", "further", "farther"); add("far", "superlative of far", "furthest", "farthest");
// pronoun forms
for (const [f, b] of [["me", "I"], ["my", "I"], ["mine", "I"], ["him", "he"], ["his", "he"], ["her", "she"], ["hers", "she"], ["us", "we"], ["our", "we"], ["ours", "we"], ["them", "they"], ["theirs", "they"], ["your", "you"], ["yours", "you"]] as const) add(b, `form of the pronoun ${b}`, f);

const VOWEL = /[aeiou]/;
export interface Candidate { lemma: string; note?: string }

export function lemmaCandidates(raw: string): Candidate[] {
  const w = raw.toLowerCase().replace(/[’']s$/, "").replace(/’/g, "'");
  const out: Candidate[] = [];
  const push = (lemma: string, note?: string) => { if ((lemma.length > 1 || lemma === w) && !out.some((c) => c.lemma === lemma)) out.push({ lemma, note }); };
  push(w);
  if (IRREGULAR[w]) push(IRREGULAR[w][0], IRREGULAR[w][1]);
  const ends = (s: string) => w.endsWith(s) && w.length > s.length + 1;
  if (ends("ing")) {
    const stem = w.slice(0, -3);
    if (/(.)\1$/.test(stem) && !/(ll|ss|zz|ff)$/.test(stem)) push(stem.slice(0, -1), `-ing form of ${stem.slice(0, -1)}`);
    push(stem, `-ing form of ${stem}`);
    push(stem + "e", `-ing form of ${stem}e`);
    if (stem.endsWith("y")) push(stem.slice(0, -1) + "ie", `-ing form of ${stem.slice(0, -1)}ie`);
  }
  if (ends("ied")) push(w.slice(0, -3) + "y", `past form of ${w.slice(0, -3)}y`);
  if (ends("ed")) {
    const stem = w.slice(0, -2);
    if (/(.)\1$/.test(stem) && !/(ll|ss|zz|ff)$/.test(stem)) push(stem.slice(0, -1), `past form of ${stem.slice(0, -1)}`);
    push(stem, `past form of ${stem}`);
    push(w.slice(0, -1), `past form of ${w.slice(0, -1)}`);
  }
  if (ends("ies")) push(w.slice(0, -3) + "y", `plural or third-person form of ${w.slice(0, -3)}y`);
  if (ends("ves")) { push(w.slice(0, -3) + "f", `plural of ${w.slice(0, -3)}f`); push(w.slice(0, -3) + "fe", `plural of ${w.slice(0, -3)}fe`); }
  if (ends("es") && /(s|x|z|ch|sh|o)es$/.test(w)) push(w.slice(0, -2), `plural or third-person form of ${w.slice(0, -2)}`);
  if (ends("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) push(w.slice(0, -1), `plural or third-person form of ${w.slice(0, -1)}`);
  if (ends("ier")) push(w.slice(0, -3) + "y", `comparative of ${w.slice(0, -3)}y`);
  if (ends("iest")) push(w.slice(0, -4) + "y", `superlative of ${w.slice(0, -4)}y`);
  if (ends("er") && VOWEL.test(w.slice(0, -2))) { const s = w.slice(0, -2); if (/(.)\1$/.test(s)) push(s.slice(0, -1), `comparative of ${s.slice(0, -1)}`); push(s, `comparative of ${s}`); push(s + "e", `comparative of ${s}e`); }
  if (ends("est") && VOWEL.test(w.slice(0, -3))) { const s = w.slice(0, -3); if (/(.)\1$/.test(s)) push(s.slice(0, -1), `superlative of ${s.slice(0, -1)}`); push(s, `superlative of ${s}`); push(s + "e", `superlative of ${s}e`); }
  if (ends("ily")) push(w.slice(0, -3) + "y", `adverb from ${w.slice(0, -3)}y`);
  if (ends("ly")) push(w.slice(0, -2), `adverb from ${w.slice(0, -2)}`);
  return out;
}

export const irregularOf = (w: string) => IRREGULAR[w.toLowerCase()];
