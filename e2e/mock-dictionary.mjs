// Stand-in for the Free Dictionary API (api.dictionaryapi.dev), used only by end-to-end tests.
import http from "node:http";

let down = false;
const lic = { name: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0" };
const DATA = {
  ubiquitous: [{ word: "ubiquitous", phonetic: "/juːˈbɪkwɪtəs/", phonetics: [{ text: "/juːˈbɪkwɪtəs/", audio: "http://localhost:4011/audio/ubiquitous-uk.mp3" }, { text: "/juˈbɪkwɪtəs/", audio: "http://localhost:4011/audio/ubiquitous-us.mp3" }],
    meanings: [{ partOfSpeech: "adjective", definitions: [{ definition: "Being everywhere at once.", synonyms: ["omnipresent"] }], synonyms: ["omnipresent", "pervasive"], antonyms: ["rare"] }], license: lic, sourceUrls: ["https://en.wiktionary.org/wiki/ubiquitous"] }],
  ponder: [{ word: "ponder", phonetics: [{ text: "/ˈpɒndə/" }, { text: "/ˈpɑndɚ/", audio: "http://localhost:4011/audio/ponder-us.mp3" }],
    meanings: [{ partOfSpeech: "verb", definitions: [{ definition: "To think deeply about something." }], synonyms: ["consider"], antonyms: [] }], license: lic, sourceUrls: ["https://en.wiktionary.org/wiki/ponder"] }],
  bank: [{ word: "bank", phonetics: [{ text: "/bæŋk/" }], meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "A financial institution." }, { definition: "The edge of a river." }] }], license: lic }],
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__down") { down = true; res.end("down"); return; }
  if (url.pathname === "/__up") { down = false; res.end("up"); return; }
  if (url.pathname.startsWith("/audio/")) { res.writeHead(200, { "content-type": "audio/mpeg" }); res.end(Buffer.alloc(0)); return; }
  const m = url.pathname.match(/^\/api\/v2\/entries\/en\/(.+)$/);
  if (!m) { res.writeHead(404).end(); return; }
  if (down) { res.writeHead(503).end("unavailable"); return; }
  const word = decodeURIComponent(m[1]).toLowerCase();
  const d = DATA[word];
  if (!d) { res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ title: "No Definitions Found" })); return; }
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(d));
}).listen(4011, () => console.log("mock dictionary on 4011"));
