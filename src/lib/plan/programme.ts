/**
 * QEVRANT Intensive Study Plan: six weeks, each with six themed study days and one review-and-assessment
 * day. Every study day pairs one grammar topic with one vocabulary theme and reuses that theme across
 * reading, listening, writing and speaking, so the activities reinforce one another.
 *
 * Difficulty rises from B2 (week 1) to C1–C2 (week 6). Some readings return after two or more weeks
 * with a new focus: a deliberate, spaced re-reading, not an accident.
 */
export interface PlanDay {
  n: number;
  week: number;
  kind: "study" | "review";
  title: string;
  objective: string;
  level: "B2" | "B2+" | "C1" | "C2";
  grammar: string | string[];            // lesson slug, or several for consolidation/assessment
  theme: string;                         // vocabulary theme slug
  reading: string;
  readingFocus?: string;                 // for spaced re-reading
  listening: string;                     // listening resource slug
  writing: { kind: "essay"; slug: string } | { kind: "visual"; id: string };
  speaking: string;                      // speaking-bank category
}

type Row = [title: string, objective: string, level: PlanDay["level"], grammar: string | string[], theme: string, reading: string, listening: string, writing: string, speaking: string, focus?: string];
const W: { title: string; days: Row[] }[] = [
  { title: "Time, aspect and precision", days: [
    ["Experience and change", "Choose between perfect and past forms to talk about experience, results and change at work.", "B2", "perfect-and-continuous-aspect", "work-careers", "the-four-day-week", "bc-b2-listening", "remote-work-and-young-employees", "work"],
    ["States of mind", "Use stative and dynamic meanings precisely when describing thoughts, feelings and habits.", "B2", "stative-and-dynamic-verbs", "psychology-behaviour", "the-forgetting-curve", "ted-ed", "v:line-0-1102", "psychology"],
    ["Telling the past", "Sequence past events with narrative tenses and talk about heritage and memory.", "B2+", "narrative-tenses", "history-heritage", "who-owns-the-past", "bbc-in-our-time", "disappearing-traditions", "society"],
    ["Predicting the future", "Express degrees of certainty about technological change with future forms.", "B2", "future-forms", "science-technology", "can-machines-create", "npr-short-wave", "v:process-water", "technology"],
    ["Obligation and possibility", "Use modal verbs for advice, obligation and deduction about health and wellbeing.", "B2", "modals-and-modality", "health-medicine", "loneliness", "bbc-6-minute-english", "rising-stress-levels", "health"],
    ["Talking about things in general", "Use articles and noun phrases accurately to generalise about food and sustainability.", "B2", "articles-and-noun-phrases", "food-nutrition", "the-future-of-protein", "natgeo-overheard", "v:pie-0-1106", "lifestyle"],
  ] },
  { title: "Describing, comparing, connecting", days: [
    ["Cities compared", "Compare places precisely with modified comparatives and superlatives.", "B2", "comparison", "cities-urban", "fifteen-minute-city", "bbc-learning-english-from-the-news", "v:bar-3-1208", "society"],
    ["Evaluating culture", "Describe and evaluate buildings and art with exact intensifiers and adjective order.", "B2", "adjectives-adverbs-and-intensifiers", "architecture-design", "second-lives-for-old-buildings", "bc-audio-zone", "public-money-for-the-arts", "media"],
    ["How things are made", "Use passive and causative forms to describe production and global supply chains.", "B2", "passive-and-causative", "economics-globalisation", "life-of-a-t-shirt", "bbc-more-or-less", "v:process-glass", "business"],
    ["Learning and choices", "Choose infinitive and -ing patterns correctly when discussing education.", "B2", "verb-patterns", "education", "is-failure-the-best-teacher", "bc-c1-listening", "practical-skills-or-academic-subjects", "education"],
    ["Balancing arguments", "Link contrasting ideas and concede points about news and information.", "B2", "linking-contrast-concession", "communication-media", "why-false-news-spreads", "voa-learning-english", "online-misinformation", "media"],
    ["Money in everyday language", "Use multi-word verbs naturally, and know when a formal verb is better.", "B2+", "multi-word-verbs", "business-finance", "the-planes-that-came-back", "npr-planet-money", "personal-debt", "business"],
  ] },
  { title: "Complex sentences", days: [
    ["Living together", "Add precise information with defining and non-defining relative clauses.", "B2+", "relative-clauses", "society-politics", "the-rise-of-living-alone", "abc-conversations", "living-alone", "society"],
    ["Reporting research", "Compress information with participle and reduced clauses in scientific writing.", "B2+", "participle-and-reduced-clauses", "science-technology", "when-results-wont-repeat", "npr-short-wave", "v:line-bar-0-1302", "science"],
    ["Ideas as objects", "Package claims and questions as noun clauses to discuss behaviour and evidence.", "B2+", "noun-clauses", "psychology-behaviour", "the-marshmallow-test-revisited", "ted-ed", "choosing-a-partner", "psychology"],
    ["Aims and consequences", "Express purpose and result precisely when discussing environmental policy.", "B2+", "purpose-and-result-clauses", "environment", "rewilding", "natgeo-overheard", "paying-for-plastic", "environment"],
    ["What others say", "Report and evaluate other people's claims with a range of reporting verbs.", "B2+", "reported-speech", "communication-media", "the-price-of-attention", "intelligence-squared", "news-from-social-media", "media"],
    ["Alternative worlds", "Reason about hypothetical economic scenarios with conditionals and the unreal past.", "C1", "conditionals-and-unreal-past", "economics-globalisation", "measuring-what-matters", "economist-the-intelligence", "cashless-societies", "global"],
  ] },
  { title: "Information structure and emphasis", days: [
    ["Making a point stand out", "Use inversion and cleft sentences for emphasis in argument.", "C1", "inversion-and-emphasis", "society-politics", "compulsory-voting", "bbc-global-news-podcast", "ageing-populations", "society"],
    ["Impersonal evaluation", "Evaluate and hedge with anticipatory it and existential there.", "C1", "anticipatory-it-and-there", "business-finance", "the-planes-that-came-back", "bc-podcasts-for-professionals", "v:table-2-1402", "work", "Re-read and underline every sentence that begins with It or There."],
    ["Writing like an academic", "Nominalise, hedge and choose an academic register.", "C1", "academic-register", "education", "the-forgetting-curve", "bc-c1-listening", "online-degrees", "academic", "Re-read and rewrite two paragraphs in a more academic register."],
    ["Holding a text together", "Refer back clearly with summary nouns, such and the former/the latter.", "C1", "cohesion-and-reference", "cities-urban", "fifteen-minute-city", "bbc-6-minute-english", "v:map-town-centre", "society", "Re-read and list every summary noun (this approach, these changes…)."],
    ["Demands and hypotheses", "Use the subjunctive, as if and but for in formal recommendations.", "C1", "subjunctive-and-hypothetical-forms", "work-careers", "the-four-day-week", "bc-podcasts-for-professionals", "gig-economy", "work", "Re-read and turn three findings into formal recommendations."],
    ["Saying less, meaning more", "Avoid repetition with ellipsis and substitution in conversation and writing.", "C1", "ellipsis-and-substitution", "relationships-personality", "loneliness", "abc-conversations", "loneliness-among-the-elderly", "personal", "Re-read and find places where words could be omitted or substituted."],
  ] },
  { title: "Stance, nuance and argument", days: [
    ["Precise denial", "Control the scope of negation and focusing adverbs in claims about the media.", "C1", "negation-and-focusing", "communication-media", "why-false-news-spreads", "intelligence-squared", "regulating-social-media", "media", "Re-read and note how the writer limits claims (not all, only, rarely)."],
    ["Futures that were", "Narrate plans, predictions and destinies with the future in the past.", "C1", "future-in-the-past", "history-heritage", "who-owns-the-past", "bbc-in-our-time", "v:map-village", "society", "Re-read and retell the story from the viewpoint of someone in the past."],
    ["Words that go together", "Use dependent prepositions accurately in environmental argument.", "C1", "dependent-prepositions", "environment", "governing-the-commons", "bbc-learning-english-from-the-news", "extreme-weather", "environment"],
    ["Fixed phrases with prepositions", "Use prepositional phrases precisely to describe spaces and change.", "C1", "prepositional-phrases", "architecture-design", "second-lives-for-old-buildings", "natgeo-overheard", "v:floor-library", "society", "Re-read and collect every prepositional phrase of place and change."],
    ["Sounding natural", "Use vague language and fillers appropriately in spoken English.", "B2+", "vague-language-and-fillers", "everyday-life", "the-rise-of-living-alone", "bbc-the-english-we-speak", "unaffordable-housing", "lifestyle", "Re-read, then summarise it aloud in an informal register."],
    ["Asking diplomatically", "Use indirect questions and tags to sound polite and tentative in business contexts.", "B2+", "indirect-questions-and-tags", "business-finance", "the-planes-that-came-back", "npr-planet-money", "v:bar-table-0-1506", "work", "Re-read and prepare five indirect questions for the founder in the story."],
  ] },
  { title: "Proficiency: compression and nuance", days: [
    ["Dense, elegant sentences", "Compress information with verbless and absolute clauses.", "C2", "verbless-and-absolute-clauses", "science-technology", "the-moral-machine", "intelligence-squared", "children-and-coding", "technology"],
    ["Whatever it takes", "Use nominal relative clauses (what, whatever, whoever) in argument.", "C1", "nominal-relative-clauses", "society-politics", "the-power-to-attract", "economist-the-intelligence", "global-brands", "global"],
    ["Habits and character", "Describe typical and annoying behaviour with will, would and used to.", "B2+", "habits-used-to-would", "psychology-behaviour", "the-marshmallow-test-revisited", "ted-ed", "v:line-1-1603", "psychology", "Re-read and contrast the original belief with the newer finding."],
    ["Consolidation: tense, aspect and modality", "Retrieve and combine the tense and modality topics from weeks 1 and 5.", "C1", ["perfect-and-continuous-aspect", "stative-and-dynamic-verbs", "future-forms", "modals-and-modality", "future-in-the-past"], "economics-globalisation", "measuring-what-matters", "bbc-more-or-less", "v:line-pie-0-1604", "business", "Re-read and explain the argument in your own words in three minutes."],
    ["Consolidation: complex sentences", "Retrieve and combine the clause structures from weeks 3 and 6.", "C1", ["relative-clauses", "participle-and-reduced-clauses", "noun-clauses", "purpose-and-result-clauses", "verbless-and-absolute-clauses"], "environment", "governing-the-commons", "npr-short-wave", "plastic-in-the-oceans", "environment", "Re-read and combine pairs of sentences into single complex sentences."],
    ["Consolidation: emphasis and stance", "Retrieve and combine emphasis, hedging and reference from weeks 4 and 5.", "C1", ["inversion-and-emphasis", "anticipatory-it-and-there", "academic-register", "cohesion-and-reference", "negation-and-focusing"], "communication-media", "the-price-of-attention", "intelligence-squared", "online-degrees", "media", "Re-read and identify the writer's stance markers."],
  ] },
];

const writingOf = (w: string): PlanDay["writing"] => (w.startsWith("v:") ? { kind: "visual", id: w.slice(2) } : { kind: "essay", slug: w });

export const PROGRAMME: PlanDay[] = W.flatMap((week, wi) => {
  const study: PlanDay[] = week.days.map((r, di) => ({
    n: wi * 7 + di + 1, week: wi + 1, kind: "study", title: r[0], objective: r[1], level: r[2], grammar: r[3], theme: r[4], reading: r[5], listening: r[6], writing: writingOf(r[7]), speaking: r[8], readingFocus: r[9],
  }));
  const lessons = [...new Set(study.flatMap((d) => (Array.isArray(d.grammar) ? d.grammar : [d.grammar])))];
  const review: PlanDay = {
    n: wi * 7 + 7, week: wi + 1, kind: "review", title: `Week ${wi + 1} review and assessment`,
    objective: `Retrieve this week's grammar and vocabulary without notes, then check how well it has stuck. Theme of the week: ${week.title.toLowerCase()}.`,
    level: study[study.length - 1].level, grammar: lessons, theme: study[0].theme, reading: study[0].reading, listening: study[0].listening,
    writing: { kind: "visual", id: ["line-2-1707", "bar-0-1714", "table-0-1721", "map-campus", "pie-table-0-1735", "line-bar-1-1742"][wi] }, speaking: study[(wi * 2) % study.length].speaking,
  };
  return [...study, review];
});
export const WEEK_TITLES = W.map((w) => w.title);
