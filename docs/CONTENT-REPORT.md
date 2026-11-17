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

---

## Update 2026-11-17 — vocabulary audit, grammar layout, listening, speaking, analytics

### Vocabulary audit (Destination + Outcomes)
Method: `scripts/vocab-audit.ts` extracts only **headword + part of speech + unit** from the readable books (facts, not copyrightable text), maps units to our themes, merges duplicates and compares with the database. Book texts stay outside the repository (`SOURCES_DIR`).

| | Count |
|---|---|
| Headword occurrences found (Outcomes Upper-Int VB 1,266 · Outcomes Advanced VB 1,660 · Destination C1&C2 topic database 1,015) | 3,941 |
| Duplicates across books merged | 895 |
| Unique headwords | 3,046 |
| Already in the database before this update | 182 |
| **New entries written this update** (all headwords that appear in 2+ books) | **444** |
| Covered after this update | 626 |
| Still missing (single-book headwords) | 2,420 |
| **Database size now** | **939 items** (892 compiled entries + education set), 943 senses, 50 word families, 40 distinctions, 24 themes |

Every new entry has English, Russian, an original definition, an original example, part of speech, CEFR (metadata), theme + subtopic, collocations, synonyms and register; word families/distinctions where useful. A new theme **Everyday Life, Home and Shopping** was added for Outcomes' household/shopping units.

**Not extracted automatically:** Destination B2 (image-only scan) and Destination C1&C2's phrasal-verb, phrase, idiom and word-formation databases (layout can't be split reliably). These need a searchable copy or manual review.

**Remaining 2,420 headwords:** `npm run vocab:draft` (needs `ANTHROPIC_API_KEY`) writes original draft entries to `content/drafts/vocabulary/`, never into the live database. After a person reviews them, `npm run vocab:promote` moves them in (duplicates skipped) and `npm run content:build` validates everything.

**Licensing note.** No definitions, examples or exercises were copied from the books. Headword lists are used only to find gaps. A headword's presence or absence isn't copyrightable, but the *selection and arrangement* of a whole published list can be. That's why entries are reorganised by our own themes and the lists themselves aren't reproduced. Before commercial launch, have a lawyer confirm this approach for the UK/EU. Flag for review: `attestedIn` metadata (which book a word appears in) is shown to learners only as "appears in reference books", not as page references.

### Grammar
- Lessons render as textbook parts **A Overview · B Formation · C Main uses · D Time expressions · E Comparison · F Common mistakes · G Advanced usage · H Review & practice**. Learners see one part at a time with previous/next buttons, or can switch to "show all". Parts include sub-section chips, rule boxes, expandable panels and an inline practice exercise.
- New block types: `!rule`, `#### heading`, `+++ title … +++` (expandable).
- Present perfect lesson rebuilt in the A–H format (affirmative/negative/questions/short answers tables, time expressions, for/since/ago).
- Time-expression sections added to narrative tenses, future forms and habits.
- 5 new lessons fill every gap in the grammar map: ellipsis & substitution, indirect questions & question tags, dependent prepositions, prepositional phrases, vague language & fillers. **22 lessons, 349 questions.**

### Listening
18 resources from BBC Learning English, BBC World Service/Radio 4, VOA, NPR, TED-Ed, British Council, ABC Australia, The Economist, Intelligence Squared and National Geographic. Each link was found through a live web search on 2026-11-17 and points to the provider's own page (or, for *More or Less*, a podcast directory page). Nothing is embedded or copied. **Not included:** Cambridge English (no free listening page could be verified) and individual TED talks (only the TED-Ed playlist was verified). *The Intelligence* is partly paywalled; *Overheard at National Geographic* is an archive with no new episodes.

### Speaking
161 original prompts in 16 categories × 4 levels; 1-minute (15 s + 60 s) and 2-minute (60 s + 120 s) modes.
