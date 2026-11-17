# English Mastery by QEVRANT — Advanced English Development System

A structured B2–C2 English learning platform: vocabulary organised by 23 themes (CEFR as metadata), 17 grammar lessons with separate theory and practice pages, a 12-text reading library with IELTS-style tasks, an essay bank of 44 questions across 8 essay types, speaking practice, and AI practice feedback on essays and speaking. See `docs/CONTENT-REPORT.md` for content statistics and provenance.

### On phones (iPhone and Android)
The platform is an installable progressive web app (PWA): a manifest, icons, a service worker (`public/sw.js`) and iPhone settings. Once deployed:
- **Android** (Chrome, Samsung Internet): the app offers **Install**, or use the browser menu ⋮ → *Install app*.
- **iPhone/iPad** (Safari): Share → *Add to Home Screen*.
It then opens full-screen from the home screen. Pages already visited work offline, and a clear offline screen appears for pages not yet opened. Saving progress to the database needs a connection. The layout handles the notch and home bar (safe areas), uses 16 px form fields (no zoom on focus) and 44 px touch targets. Settings → *App on your phone* has install help.
To publish in the App Store and Google Play, the same code can be wrapped with Capacitor (needs an Apple Developer account and a Mac with Xcode for iOS; a Google Play developer account for Android).

### Authoring content
Content is written in compact formats in `content/src/` and compiled with `npm run content:build` (formats are documented at the top of `scripts/build-content.ts`). The build validates every record and cross-reference; content errors stop the build.

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind 4 · Radix UI · Supabase (Postgres + Auth + Storage, EU region) · Vercel · Claude API for AI practice feedback · FSRS for spaced revision.

**New to this? Start with [docs/LAUNCH-GUIDE.md](docs/LAUNCH-GUIDE.md)**: a step-by-step, non-technical guide to putting the app online, creating your account and keeping your data.

## What's new (2026-11-17, fourth update: visual identity)
- **Original typography restored**: Inter (text) and Manrope (headings), with the original sizes, weights, letter-spacing and font features, exactly as in every version before the third update. The temporary Arial Narrow / Archivo Narrow setting has been removed.
- **QEVRANT logo**: a geometric Q whose tail is drawn as the leg of an R (navy ring, amber stroke). Files in `public/brand/` (full logo and symbol for light and dark backgrounds, 1024 px app icon); favicon (`icon.svg`, `favicon.ico`), PWA and maskable icons, Apple touch icon. Regenerate with `python3 scripts/brand/build-brand.py`.
- **Streak flame**: an original drawn flame (not an emoji or character) in the header and on the dashboard; it sways gently when today is done, ignites when the first activity of the day extends the streak (once per day), and changes colour at milestones (7, 30 and 100 days). Daily goal (1–8 activities, Settings) with a ring around the flame, last-7-days strip, best streak and milestone track. Computed from saved activity, so it persists across sessions and devices (`src/lib/streak.ts`, unit-tested).
- **Dashboard**: streak and daily goal next to Today's plan, recently studied topics, activities today.
- Smaller: exercise questions slide in; lesson sections taller than the screen now count as read.

## What's new (2026-11-17, third update: Advanced English Development System)
- **Personalised dashboard ("Today")**: a daily plan of up to 4 tasks with reasons and time estimates, revision counts, weakest areas, the next lesson in your path, working-level estimate, "continue where you left off". All computed from the learner's own data (`src/lib/learning.ts`); no AI guesses.
- **Learning cycle** (Understand → Recognise → Practise → Produce → Feedback → Revise) shown on every grammar lesson and the dashboard, with real completion status per stage.
- **Grammar feedback in five parts** for every wrong answer: your answer, correct answer, why it works, the rule to remember (taken from the lesson's own theory) and an optional AI "Why doesn't my answer fit?" explanation (`/api/ai/explain`, server-side question lookup, daily limit `EXPLAIN_DAILY_LIMIT`, hidden when AI is not configured). "Practise this rule" follow-up links.
- **Adaptive practice** (`/practice/smart`): My mistakes (questions stay until answered correctly), Weak areas, Mixed review, per-topic targeted sets.
- **Writing portfolio** (`/writing/portfolio`): drafts, all essays and versions, feedback review, version comparison (bands, criteria, problem types, word-level diff), recurring mistakes with trend, band trend chart.
- **Speaking development** on the Speaking page: band trend, delivery first-vs-latest, recurring problems, same-question comparisons. Guided tasks labelled by IELTS Part 1/2/3 style.
- **Vocabulary review** as flip cards with familiarity labels (new / learning / familiar / well known, from FSRS state).
- **Skill indicators** on Progress: grammar accuracy, collocation problems per 100 words, vocabulary retention, reading, listening, speaking, writing, recurring mistakes and study days, last 30 days vs the 30 before.
- **Design system**: lighter academic palette, page transitions, hover elevation, press feedback, animated progress, answer pop/shake, flashcard flip, skeletons, dialog transitions, toasts, completion effect. All motion respects "reduce motion".
- Fixed: question ids are only unique inside an exercise; the engine now uses qualified keys (`exercise-slug/q1`), so mistakes in different exercises are never mixed up.

## What's new (2026-11-17, second update)
- Dictionary: every Reading word answers (built-in grammar/general lexicon of about 1,250 words + vocabulary), with hybrid lookup for any other word (Free Dictionary API + Claude), base forms, meaning in context and UK/US pronunciation. New **Dictionary** page.
- Academic Writing: drafts autosave (device + account), essays are saved before assessment, failed assessments keep the essay and can be retried, duplicate submissions are prevented, timeouts and errors are explained. Fixed: the "Couldn't reach the server" message (see docs/LAUNCH-GUIDE.md §8).
- Speaking: shared microphone handling with specific messages; Settings ▸ Privacy and permissions (permission status, browser prompt, 4-second test recording, unblock steps).
- Cookie consent banner and settings (essential / preferences / analytics), privacy page updated.
- Migration 4 (`essay_drafts`, `dictionary_cache`, submission status and request id).

## What's new (2026-11-17)
- Speaking studio: random topics (161 prompts, 16 categories, B2–C2), 1- and 2-minute modes with automatic prep/speaking timers, pause/resume/restart, microphone error handling.
- AI feedback: estimated IELTS-style band ranges per criterion (educational estimates), detailed corrections, collocations, repetition, argument/paragraph advice, corrected essay; speaking topic relevance and "fine in speech" notes.
- Listening library (18 verified external resources), listening log.
- Grammar lessons in A–H textbook parts; 5 new lessons (22 total).
- Vocabulary: 444 new entries from the book audit (939 total); AI drafting script for the rest.
- Progress analytics: section progress, weekly report scored out of 100 with transparent criteria, history and trends.
- Accounts: Google sign-in (OAuth), forgot/reset password, change password, bulk deletion of essays/recordings.
- Database migration 3 (`listening_logs`, `weekly_reports`, `profiles.preferences`).

## What's in this release

| Area | Status |
|---|---|
| App shell | Sidebar (desktop) + bottom nav (mobile), light/dark themes, Ctrl/⌘ K search (English or Russian), skip link |
| Accounts | Supabase email + password sign-up/sign-in, onboarding (goals, self-rated level, weekly goal), export all data (JSON), account deletion |
| Education topic hub | Level filter across grammar, vocabulary, reading, practice, speaking, writing |
| Grammar | 18-domain map (45 subtopics, 2 published). Lessons with Theory/Practice; every wrong answer links to the exact rule section |
| Vocabulary | 47 items / 51 level-tagged senses, each with English definition, Russian translation, example, collocations, register |
| Reading | Original 650-word C1 text with tap-to-define (multi-word expressions included), save with sentence context, True/False/Not given |
| Review | FSRS spaced revision of saved words; status (new → mastered) derived from the schedule |
| Library | Personal Vocabulary with context, status filters, CSV export; bookmarked grammar sections |
| Progress | Streak, weekly goal, activity grid, mastery per lesson, exercise history (all computed from raw events) |
| **AI: Academic Writing** | 3 essay tasks. Feedback on 4 criteria, highlighted issues linked to grammar lessons, vocabulary upgrades (saveable), one paragraph rewritten one level up, next steps |
| **AI: Speaking** | 3 tasks with prep and speaking timers, recording + playback, transcription, feedback on fluency, vocabulary and grammar, delivery measures, phrases to try |
| Listening, IELTS pathway | Honest "planned" pages (Phases 4 and 5) |

AI feedback is always labelled **practice feedback, not an official score**. No band scores are produced.

## Run locally

```bash
npm install
cp .env.example .env.local        # leave Supabase empty for Demo mode
npm run dev                        # http://localhost:3000
```

**Demo mode** (no Supabase variables): no accounts; progress is stored in the browser and a banner says so. AI is off unless `AI_DEMO_ALLOW=true` (local development only).

## Production setup

1. **Supabase**: create a project in an EU region (e.g. Frankfurt). In SQL editor, run `supabase/migrations/*.sql` in order (or `supabase db push`). Under Auth → URL configuration, set the site URL and add `https://<your-domain>/auth/callback` as a redirect URL.
2. **Vercel**: import the repo and set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (required for AI feedback), optionally `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`)
   - `OPENAI_API_KEY` (optional): server-side speech-to-text, which works in every browser. Without it, speaking uses the browser's own speech recognition (Chrome, Edge, Safari).
   - `AI_DAILY_LIMIT` (default 20 analyses per learner per day)
   - Choose the Frankfurt (`fra1`) function region to keep processing in the EU.
3. Deploy. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## Quality checks

```bash
npm run typecheck
npm run content:check     # schema + cross-reference validation of all content
npm run contrast          # WCAG AA contrast of every colour pair, both themes
npm test                  # unit tests (27): progress maths, FSRS, tokenizer, search, AI guards
npm run build
npm run e2e               # Playwright: full learner journey, AI feedback, a11y (axe) on 22 pages × 2 themes, keyboard, 375px
```

E2E uses a stand-in AI server (`e2e/mock-anthropic.mjs`), so no API key is needed. If Playwright browsers aren't installed, set `PW_CHROME_PATH=/usr/bin/google-chrome`.

Database security can be tested on plain Postgres: load `supabase/tests/auth_stub.sql`, the migrations, then `supabase/tests/rls_test.sql` (checks that one learner can't read or change another's rows).

## Architecture notes

- **Content** lives in `content/` as versioned JSON, validated by Zod (`src/lib/content/schema.ts`) at build time. One canonical record per item; vocabulary uses item → level-tagged senses → per-language translations. Adding a topic, lesson or exercise is data only.
- **Learner state** goes through the `LearnerStore` interface (`src/lib/store`): Supabase in production, browser storage in Demo mode.
- **Honest numbers:** streaks, weekly goal, mastery and due counts are computed in `src/lib/progress.ts` from raw events, responses and review cards, never stored as counters.
- **AI** (`src/lib/ai`): server-only; keys never reach the browser. Structured output is validated by schema; invented quotes and references are dropped so every highlight and link resolves. Each issue links to a lesson section or grammar area from our own graph.
- **Privacy:** speaking audio is never stored unless the learner opts in (Settings). Opted-in audio goes to a private per-learner Storage folder. Note: account deletion removes database rows; stored audio files should also be removed by a scheduled cleanup (Phase 6 task).

## Known limits / next steps

- Content is AI-assisted and marked `reviewer: null`: it needs human editorial sign-off before public launch.
- Speaking can't assess pronunciation (it works from a transcript), and the UI says so.
- Brand colour values in `src/lib/tokens.ts` are provisional; swap in final brand hexes there and in `globals.css`, then run `npm run contrast`.
- Phase 4: remaining grammar domains, more topics, Listening, Postgres full-text search.
