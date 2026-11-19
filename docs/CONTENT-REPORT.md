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

---

## Update 2026-11-17 (b) — dictionary, writing reliability, microphone, cookies

### Dictionary
- **Built-in lexicon:** `content/src/dictionary/core.txt` holds 282 grammar words and expressions (determiners, pronouns, prepositions, conjunctions and linkers, adverbs, modal and auxiliary verbs, common verbs), with Russian, definition, example, usage note and forms. `general.txt` holds 968 everyday and academic words, with Russian and definition. All of it is original content.
- **Coverage:** every one of the 1,654 different words in the 12 Reading passages now resolves locally (directly or through its base form), except personal and place names.
- **Hybrid lookup:** built-in → cache → Free Dictionary API (Wiktionary: IPA, recordings, parts of speech, synonyms) → Claude (original definitions, Russian, CEFR, register, collocations, forms, usage notes, meaning in the sentence). Base forms come from compromise (in context) plus a rule-based lemmatiser with irregular verbs, nouns and adjectives.
- **Licensing:** Wiktionary text is CC BY-SA 3.0. It is shown with attribution only when no AI-written definition exists, and is never committed to the repository. Recordings are played from Wikimedia servers with attribution.

## Update 2026-11-17 (c) — content expansion, visual writing, Intensive Study Plan

All new learner-facing text is original. No articles or textbook passages were reproduced.

**Grammar: 22 → 36 lessons, about 400 practice questions.** Fourteen new lessons, each with the ten-part structure (overview, theory, formation, uses, explained examples, comparisons, register, common mistakes, advanced applications, summary) and 12 graded questions with explanations:
- stative and dynamic verbs (B2)
- adjectives, adverbs and intensifiers (B2)
- multi-word verbs (B2+)
- noun clauses (B2+)
- purpose and result clauses (B2+)
- anticipatory *it* and *there* (C1)
- cohesion and reference (C1)
- the future in the past (C1)
- negation and focusing (C1)
- the subjunctive and hypothetical forms (C1)
- verbless and absolute clauses (C2)
- subject–verb agreement (C1)
- perfect and passive non-finite forms (C1)
- stance adverbials and discourse markers (C1)

The grammar domain map (`content/grammar/domains.json`) lists every lesson.

**Vocabulary: 939 → 1,172 headwords.**
- Between 9 and 15 entries were added to each of the 24 themes, about 280 in total.
- About 30 word families and 30 synonym distinctions were also added.
- The focus is on C1–C2 collocations, idioms, phrasal verbs and academic expressions.
- Existing entries were kept. The theme files remain the single, unified database.

**Reading: 12 → 21 texts** (6 B2+, 11 C1, 4 C2).

| Text | Level | Subject area |
|---|---|---|
| The planes that came back | B2+ | business |
| Second lives for old buildings | B2+ | architecture and heritage |
| The marshmallow test revisited | C1 | psychology |
| Measuring what matters | C1 | economics |
| The price of attention | C1 | media and digital society |
| The rise of living alone | C1 | sociology |
| When results won't repeat | C1 | science and academia |
| Governing the commons | C2 | environment |
| The moral machine | C2 | ethics and technology |
| The power to attract | C2 | international relations |

Each new text has:
- glossed vocabulary and expressions;
- multiple-choice and True/False/Not Given tasks;
- three critical-thinking questions on the argument, the implications and the writer's position;
- "further reading" links to the original sources (OECD, Tate, Psychological Science, Nature, NobelPrize.org, MIT Media Lab, Foreign Policy, Our World in Data). Every link was checked on 2026-11-17.

Factual claims are limited to well-established facts, for example: the Moral Machine's 40 million decisions published in Nature in 2018; Ostrom's 2009 Nobel; Tate Modern opening in 2000; Nature's 2016 survey of 1,576 researchers.

**Visual Data Description (Academic Writing).** This is QEVRANT's own task format and is not labelled as IELTS. There are four groups:
1. **Charts and graphs:** line graphs, bar charts, pie charts and tables. Generated from 20 templates, each with thousands of seeds.
2. **Diagrams and processes:** processes, natural cycles, objects and mechanisms. Original library illustrations.
3. **Maps and spatial change:** maps, site plans and floor plans. Original library illustrations.
4. **Combined visuals:** line + bar, pie + table, bar + table, and time series + pie.

How consistency is guaranteed:
- A task id always regenerates identical data.
- The figure, the key-feature checklist and the data sent to the AI all come from the same object.
- The server regenerates the task from its id and never trusts figures sent by the browser.
- 725 generated tasks are checked automatically: percentages add up to 100, values are plausible and every plotted number is in the AI's fact sheet.

The data are invented for practice, and each task says so.

**Intensive Study Plan.** Six weeks of 6 themed study days plus a review-and-assessment day.
- The programme refers to existing lessons, themes, readings, listening resources, essays, visual tasks and speaking categories. A test checks that every reference exists.


## Update 2026-11-17 (d) — Academic & Advanced Synonyms, context practice

- `content/synonyms/part1.json` and `part2.json`: 16 synonym groups (important, show, improve, problem, change, increase, help, cause, say, think, examine, effect, difficult, get, many, clear). Each group has 5 members with register, typical collocations, a distinction note and an example, plus 4 exercises (64 in all). The types are replace, most precise, inappropriate, near-synonym, register and collocation, with a note on every option. **All of this is original writing**: no lists, definitions or exercises were copied from the reference textbooks. Like the rest of the content, it is marked for human editorial review.
- Context practice (gap fill, multiple choice, correct form, meaning in context) is **generated from our own vocabulary entries** (examples, collocations, definitions) by `src/lib/vocab-context.ts`. Wrong options come from other topics with the same part of speech and a similar level, so they can't also be correct. No new licensed material is used.
- Synonyms in the reading word card come from our own vocabulary entries or from the open Free Dictionary API (Wiktionary, CC BY-SA). No additional licensing is needed.


## Update 2026-11-19: grammar teaching sequence (all 36 lessons)

- Every lesson now opens with a **Core concept** section: the central meaning in plain English, one rule and two contrasting examples.
- **Common mistakes** sections are rewritten as Incorrect → Correct → Why. There are 4–6 rows per lesson, and each explains why the incorrect version fails.
- Each lesson has three new blocks:
  - a **Recognise** passage: an original mini-text of 6–7 sentences, with the target forms marked and a note on each;
  - a **Quick understanding check**: four or five items, choice and "explain the difference", each with an explanation;
  - a **Produce** task with a self-check list.
- The present perfect lesson's overview was rewritten so it introduces one contrast at a time; the full aspect system moved to a collapsible panel.
- **All new text is original writing**; nothing was copied from the reference textbooks. The source format is described at the top of `scripts/build-content.ts`. Unit tests (`tests/grammar-pedagogy.test.ts`) check that every lesson keeps the full sequence. As with the rest of the content, it is marked for human editorial review.
