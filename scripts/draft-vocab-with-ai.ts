/**
 * Drafts ORIGINAL vocabulary entries for headwords that the audit found missing.
 *
 *   ANTHROPIC_API_KEY=… npx tsx scripts/draft-vocab-with-ai.ts [--theme travel-tourism] [--limit 200] [--batch 25]
 *   npx tsx scripts/draft-vocab-with-ai.ts --promote        # move reviewed drafts into content/src/vocabulary
 *
 * Only the headword, part of speech and theme come from the audit (facts, not
 * copyrightable text). Definitions, examples, translations and collocations are
 * written fresh by the model and must be reviewed by a person before --promote.
 * Drafts go to content/drafts/vocabulary/<theme>.txt in the compact compiler format.
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ROOT = path.resolve(__dirname, "..");
const AUDIT = path.join(ROOT, "content/audit/vocab-audit.json");
const SRC = path.join(ROOT, "content/src/vocabulary");
const DRAFTS = path.join(ROOT, "content/drafts/vocabulary");
const args = process.argv.slice(2);
const arg = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function existingSlugs() {
  const seen = new Set<string>();
  for (const f of fs.readdirSync(SRC)) for (const line of fs.readFileSync(path.join(SRC, f), "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#") || line.startsWith("@")) continue;
    seen.add(kebab(line.split("|")[0]));
  }
  try { for (const it of JSON.parse(fs.readFileSync(path.join(ROOT, "content/vocabulary/education.json"), "utf8")).items) seen.add(it.slug); } catch { /* optional */ }
  return seen;
}

if (args.includes("--promote")) {
  const seen = existingSlugs();
  let moved = 0, skipped = 0;
  for (const f of fs.existsSync(DRAFTS) ? fs.readdirSync(DRAFTS) : []) {
    const keep: string[] = [];
    for (const line of fs.readFileSync(path.join(DRAFTS, f), "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"))) {
      const slug = kebab(line.split("|")[0]);
      if (seen.has(slug)) { skipped++; continue; }
      seen.add(slug); keep.push(line); moved++;
    }
    if (keep.length) fs.appendFileSync(path.join(SRC, f), "\n" + keep.join("\n") + "\n");
    fs.unlinkSync(path.join(DRAFTS, f));
  }
  console.log(`Promoted ${moved} entries (${skipped} duplicates skipped). Now run: npm run content:build`);
  process.exit(0);
}

if (!process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY first."); process.exit(1); }
const THEMES = new Set<string>(JSON.parse(fs.readFileSync(path.join(ROOT, "content/themes.json"), "utf8")).map((t: { slug: string }) => t.slug));

const Entry = z.object({
  lemma: z.string(),
  cls: z.enum(["n", "v", "adj", "adv", "coll", "pv", "idiom", "fx"]),
  academic: z.boolean(),
  pos: z.string(),
  level: z.enum(["B2", "B2+", "C1", "C2"]),
  register: z.enum(["neutral", "formal", "informal", "academic", "spoken"]),
  subtopic: z.string(),
  definition: z.string().describe("Original learner-friendly definition, max 20 words, not copied from any dictionary or textbook"),
  russian: z.string(),
  example: z.string().describe("Original natural example sentence related to the theme"),
  collocations: z.array(z.string()).max(4),
  synonyms: z.array(z.string()).max(3),
  extraThemes: z.array(z.string()).max(2),
});
const Batch = z.object({ entries: z.array(Entry) });

const clean = (s: string) => s.replace(/\|/g, "/").replace(/\s+/g, " ").trim();

async function main() {
  const audit: { lemma: string; pos: string[]; themes: string[]; inDatabase: boolean; sources: string[] }[] = JSON.parse(fs.readFileSync(AUDIT, "utf8"));
  const seen = existingSlugs();
  if (fs.existsSync(DRAFTS)) for (const f of fs.readdirSync(DRAFTS)) for (const l of fs.readFileSync(path.join(DRAFTS, f), "utf8").split("\n")) if (l.trim() && !l.startsWith("#")) seen.add(kebab(l.split("|")[0]));
  let todo = audit.filter((a) => !a.inDatabase && !seen.has(kebab(a.lemma)));
  if (arg("--theme")) todo = todo.filter((a) => a.themes[0] === arg("--theme"));
  todo.sort((a, b) => b.sources.length - a.sources.length);
  todo = todo.slice(0, Number(arg("--limit") ?? todo.length));
  const size = Number(arg("--batch") ?? 25);
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  fs.mkdirSync(DRAFTS, { recursive: true });
  console.log(`${todo.length} headwords to draft with ${model}.`);

  for (let i = 0; i < todo.length; i += size) {
    const chunk = todo.slice(i, i + size);
    const list = chunk.map((a) => `${a.lemma} (${a.pos.join("/") || "?"}) — theme: ${a.themes[0]}`).join("\n");
    try {
      const msg = await client.messages.parse({
        model, max_tokens: 8000,
        system: "You write entries for an English vocabulary database for adult B2–C2 learners whose first language is Russian. Write everything yourself: definitions, examples and collocations must be original and must not reproduce any dictionary or textbook wording. Choose the single most useful sense for an upper-intermediate/advanced learner, ideally the one connected with the given theme. Use British spelling. Russian translations should be natural equivalents (1–3 options). Allowed theme slugs for extraThemes: " + [...THEMES].join(", "),
        messages: [{ role: "user", content: `Write one entry for each headword, in the same order:\n${list}` }],
        output_config: { format: zodOutputFormat(Batch) },
      });
      const out = msg.parsed_output?.entries ?? [];
      const byTheme: Record<string, string[]> = {};
      out.forEach((e, k) => {
        const theme = chunk[k]?.themes[0] ?? "everyday-life";
        const slug = kebab(e.lemma);
        if (seen.has(slug)) return;
        seen.add(slug);
        const extra = e.extraThemes.filter((t) => THEMES.has(t) && t !== theme);
        (byTheme[theme] ??= []).push([e.lemma, e.cls + (e.academic ? "+ac" : ""), e.pos, e.level, e.register, e.subtopic, e.definition, e.russian, e.example, e.collocations.join("; "), e.synonyms.join("; "), extra.join("; ")].map(clean).join(" | "));
      });
      for (const [theme, lines] of Object.entries(byTheme)) {
        const file = path.join(DRAFTS, `${theme}.txt`);
        if (!fs.existsSync(file)) fs.writeFileSync(file, `# DRAFT — review before running --promote (${theme})\n`);
        fs.appendFileSync(file, lines.join("\n") + "\n");
      }
      console.log(`  ${Math.min(i + size, todo.length)}/${todo.length}`);
    } catch (err) {
      console.error(`  batch at ${i} failed: ${(err as Error).message}. Re-run the script to continue; finished entries are kept.`);
    }
  }
  console.log("Done. Review content/drafts/vocabulary/*.txt, then run with --promote.");
}
main();
