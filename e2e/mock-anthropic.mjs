// Stand-in for the Anthropic Messages API, used only by end-to-end tests.
import http from "node:http";

const writing = {
  summary: "A clear position with relevant examples, but some sentences are long and a few relative clauses are punctuated incorrectly.",
  indicativeLevel: "B2+",
  criteria: [
    { criterion: "task_response", rating: "secure", comment: "You answer the question and keep a consistent view.", strengths: ["Clear position"], improvements: ["Add one limitation of your view"] },
    { criterion: "coherence_cohesion", rating: "developing", comment: "Paragraphs are logical but linking is repetitive.", strengths: ["One idea per paragraph"], improvements: ["Vary linkers"] },
    { criterion: "lexical_resource", rating: "secure", comment: "Good topic vocabulary.", strengths: ["setback"], improvements: ["Avoid 'good' and 'bad'"] },
    { criterion: "grammatical_range_accuracy", rating: "developing", comment: "Some errors with relative clauses.", strengths: ["Conditionals"], improvements: ["Commas in non-defining clauses"] },
  ],
  issues: [
    { quote: "students which fail", problem: "Use who for people.", suggestion: "students who fail", category: "grammar", grammarRef: "lesson:relative-clauses#form" },
    { quote: "this is good for them", problem: "Too general for an academic essay.", suggestion: "this benefits them", category: "vocabulary", grammarRef: null },
  ],
  vocabularyUpgrades: [{ original: "problem", better: "setback", why: "More precise for a temporary failure.", senseRef: "setback-n" }],
  rewrite: { original: "Failure is good for students.", improved: "Failure, when it is followed by feedback, can benefit students.", note: "Adds a condition and replaces a vague adjective." },
  nextSteps: ["Review commas in relative clauses", "Learn three linkers of contrast"],
};

const speaking = {
  summary: "Fluent and relevant, with a narrow range of linking phrases.",
  indicativeLevel: "B2",
  criteria: [
    { criterion: "fluency_coherence", rating: "secure", comment: "Good pace.", strengths: ["Few hesitations"], improvements: ["Signpost your main point"] },
    { criterion: "lexical_resource", rating: "developing", comment: "Mostly general words.", strengths: [], improvements: ["Use topic collocations"] },
    { criterion: "grammatical_range_accuracy", rating: "developing", comment: "Mostly simple sentences.", strengths: [], improvements: ["Try a what-clause for emphasis"] },
  ],
  issues: [{ quote: "i failed my exam", problem: "Add when and why for a fuller story.", suggestion: "I failed my first maths exam at university", category: "task", grammarRef: null }],
  vocabularyUpgrades: [],
  usefulPhrases: [{ phrase: "What I learned from it was that…", use: "To introduce the lesson you took from an experience." }],
  nextSteps: ["Practise a 2-minute story with a clear ending"],
};

http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) { res.writeHead(404).end(); return; }
    const isSpeaking = body.includes("SPOKEN answer");
    const payload = isSpeaking ? speaking : writing;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "msg_mock", type: "message", role: "assistant", model: "mock",
      content: [{ type: "text", text: JSON.stringify(payload) }],
      stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 },
    }));
  });
}).listen(4010, () => console.log("mock anthropic on 4010"));
