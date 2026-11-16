# Content report: educational architecture v0.4 (2026-11-16)

## Reference corpus analysed

| Book | Status | Used for |
|---|---|---|
| Speakout 3rd ed. B2 Student's Book | Readable | grammar sequence (units 1–8), topic units, headword checks |
| Speakout 3rd ed. C1–C2 Student's Book | Readable (some scrambled pages) | C1–C2 grammar sequence, topic units, headword checks |
| Outcomes 3rd ed. Upper-Intermediate Vocabulary Builder | Readable | topic units, headword checks |
| Outcomes 3rd ed. Advanced Vocabulary Builder | Readable | topic units, headword checks |
| Destination C1&C2 Grammar & Vocabulary | **Now readable** (OCR'd copy in project) | 13 grammar units, 13 topic vocabulary units, headword checks |
| Speakout 3rd ed. B2+ Student's Book | **Still unreadable** (image-only scan, original file not accessible) | not used |
| Destination B2 Grammar & Vocabulary | **Still unreadable** (image-only scan, original file not accessible) | not used |

The books guided theme selection, grammar sequencing and level calibration only. **All learner-facing text is original**: definitions, examples, Russian translations, explanations, exercises, reading passages and essay questions. Nothing is copied from the books.

## Source-supported vs independently generated

* **Vocabulary**: every headword was automatically checked against the five readable books. 325 of the 448 new entries (73%) occur in at least one book; the other 123 are editorial additions chosen to complete a theme. The check is stored per entry in `attestedIn` (internal only, never shown to learners). Definitions, examples, collocations, synonyms and Russian translations are all original. Headword occurrences by book: Outcomes Advanced VB 178 · Destination C1&C2 169 · Outcomes Upper-Int VB 138 · Speakout C1–C2 120 · Speakout B2 91 (one entry can occur in several).
* **CEFR levels** are editorial judgements: no source assigns a level per word.
* **Grammar**: the topic list and B2 → C1 progression come from the books (unit references are recorded in each lesson's front matter). All explanations, examples and the 180 practice questions are original. *Articles*, *habits (used to/would)*, *comparison* and *academic register* are areas the readable books cover thinly; they are written from expert judgement.
* **Reading**: 12 original passages. Subject matter is of the kind covered by quality journalism, but no article was used as a model text. Factual claims are kept general and hedged; specific facts (e.g. Yellowstone wolves in the mid-1990s, Australia's compulsory voting from the 1920s) are well established.
* **Writing**: 44 original essay questions; none are copies of published IELTS questions.

## What exists now

| Area | Count |
|---|---|
| Vocabulary themes | 23 |
| Vocabulary entries / senses | 495 / 499 |
| Word-formation families | 48 |
| Lexical distinctions (commonly confused words) | 39 |
| Grammar lessons (theory) | 17 |
| Grammar practice questions | 180 (+ 10 vocabulary collocation questions) |
| Grammar subtopics with a published lesson | 40 of 45 |
| Reading texts | 12 (111 questions in 7 IELTS formats) |
| Essay types | 8, each with a guide |
| Essay questions | 44 |

## Still planned (not yet written)

* Grammar: ellipsis and substitution; indirect questions and question tags; dependent prepositions; prepositional phrases; vague language and fillers.
* Vocabulary: the two unreadable books could add or re-level entries once readable copies are available.
* All AI-assisted content needs human editorial review before public launch (`reviewer: null` in every record).

## How to add content

Write in `content/src/` (formats documented at the top of `scripts/build-content.ts`), then run `npm run content:build` (with `SOURCES_DIR=/path/to/book-texts` to refresh headword checks) and `npm run content:check`. No code changes are needed.
