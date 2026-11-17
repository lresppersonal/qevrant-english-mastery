// Stand-in for the Anthropic Messages API, used only by end-to-end tests.
import http from "node:http";

const writing = {
  summary: "A clear position with relevant examples, but some sentences are long and a few relative clauses are punctuated incorrectly.",
  overallAssessment: "A well-organised essay with a clear view. Accuracy in complex sentences is what holds it back.",
  indicativeLevel: "B2+",
  criteria: [
    { criterion: "task_response", band: 6.5, rating: "secure", comment: "You answer the question and keep a consistent view.", strengths: ["Clear position"], improvements: ["Add one limitation of your view"] },
    { criterion: "coherence_cohesion", band: 6, rating: "developing", comment: "Paragraphs are logical but linking is repetitive.", strengths: ["One idea per paragraph"], improvements: ["Vary linkers"] },
    { criterion: "lexical_resource", band: 6.5, rating: "secure", comment: "Good topic vocabulary.", strengths: ["setback"], improvements: ["Avoid 'good' and 'bad'"] },
    { criterion: "grammatical_range_accuracy", band: 6, rating: "developing", comment: "Some errors with relative clauses.", strengths: ["Conditionals"], improvements: ["Commas in non-defining clauses"] },
  ],
  issues: [
    { quote: "students which fail", problem: "Use who for people.", suggestion: "students who fail", category: "grammar", severity: "error", grammarRef: "lesson:relative-clauses#form" },
    { quote: "this is good for them", problem: "Too general for an academic essay.", suggestion: "this benefits them", category: "vocabulary", severity: "style", grammarRef: null },
  ],
  vocabularyUpgrades: [{ original: "problem", better: "setback", why: "More precise for a temporary failure.", senseRef: "setback-n" }],
  collocations: [{ original: "learn more from failure", natural: "learn more from failure", explanation: "Natural — kept as an example of a good collocation." }],
  repetition: [{ word: "failure", count: 5, alternatives: ["setbacks", "mistakes", "not succeeding"], note: "Vary the noun when the meaning allows." }],
  argumentAdvice: ["Add a counter-argument in paragraph 3 and answer it."],
  paragraphAdvice: [{ paragraph: 2, focus: "Topic sentence", advice: "Start with the main idea before the example." }],
  correctedEssay: "Many people believe that students learn more from failure than from success.",
  rewrite: { original: "Failure is good for students.", improved: "Failure, when it is followed by feedback, can benefit students.", note: "Adds a condition and replaces a vague adjective." },
  nextSteps: ["Review commas in relative clauses", "Learn three linkers of contrast"],
};

const speaking = {
  summary: "Fluent and relevant, with a narrow range of linking phrases.",
  overallAssessment: "A relevant, fluent answer that needs a wider range of vocabulary.",
  topicRelevance: { rating: "secure", comment: "You answered the question and covered most points." },
  indicativeLevel: "B2",
  criteria: [
    { criterion: "fluency_coherence", band: 6.5, rating: "secure", comment: "Good pace.", strengths: ["Few hesitations"], improvements: ["Signpost your main point"] },
    { criterion: "lexical_resource", band: 6, rating: "developing", comment: "Mostly general words.", strengths: [], improvements: ["Use topic collocations"] },
    { criterion: "grammatical_range_accuracy", band: 5.5, rating: "developing", comment: "Mostly simple sentences.", strengths: [], improvements: ["Try a what-clause for emphasis"] },
  ],
  issues: [{ quote: "i failed my exam", problem: "Add when and why for a fuller story.", suggestion: "I failed my first maths exam at university", category: "task", severity: "style", grammarRef: null }],
  spokenVariation: ["Starting with 'So' is natural in speech."],
  repetition: [],
  vocabularyUpgrades: [],
  usefulPhrases: [{ phrase: "What I learned from it was that…", use: "To introduce the lesson you took from an experience." }],
  nextSteps: ["Practise a 2-minute story with a clear ending"],
};

// Dictionary entries written "by the AI" (for words the mock dictionary also knows, plus one it doesn't).
const dictionary = (word) => ({
  lemma: word === "pondered" ? "ponder" : word.toLowerCase(),
  formNote: word === "pondered" ? "past form of ponder" : null,
  grammar: word === "pondered" ? "verb, past tense" : "adjective",
  contextIndex: word === "pondered" ? 1 : 0,
  contextNote: word === "pondered" ? "Here it means she thought about the question carefully for a long time." : "Here it means found everywhere.",
  senses: word === "pondered"
    ? [{ pos: "verb", definition: "to wonder about something without reaching an answer", ru: "задаваться вопросом", example: "I often ponder why people choose this job.", cefr: "C1" }, { pos: "verb", definition: "to think carefully about something for a long time", ru: "обдумывать, размышлять", example: "She pondered the offer for a week.", cefr: "C1" }]
    : [{ pos: "adjective", definition: "seeming to be everywhere at the same time", ru: "вездесущий, повсеместный", example: "Smartphones are now ubiquitous.", cefr: "C1" }],
  register: "formal", ipaUk: "/ai-uk/", ipaUs: "/ai-us/",
  collocations: ["become ubiquitous"], synonyms: ["widespread"], antonyms: ["scarce"], forms: ["ubiquity (noun)"], usageNotes: ["Mostly written English."],
});

let failNext = 0;
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url.startsWith("/__fail")) { failNext = Number(new URL(req.url, "http://x").searchParams.get("n") ?? 1); res.end(`failing next ${failNext}`); return; }
    if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) { res.writeHead(404).end(); return; }
    if (failNext > 0) {
      failNext--;
      // like a real outage, the error takes a moment to arrive
      setTimeout(() => {
        res.writeHead(529, { "content-type": "application/json" });
        res.end(JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }));
      }, 1200);
      return;
    }
    const isSpeaking = body.includes("SPOKEN answer");
    let payload = isSpeaking ? speaking : writing;
    if (body.includes("lexicographer")) payload = dictionary((body.match(/Word clicked: \\"([^\\]+)\\"/) ?? [])[1] ?? "ubiquitous");
    if (body.includes("Choose which listed sense")) payload = { contextIndex: 1, contextNote: "Here it means the land along the side of a river.", ru: "берег" };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "msg_mock", type: "message", role: "assistant", model: "mock",
      content: [{ type: "text", text: JSON.stringify(payload) }],
      stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
    }));
  });
}).listen(4010, () => console.log("mock anthropic on 4010"));
