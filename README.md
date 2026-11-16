# English Mastery by QEVRANT

A structured B2–C2 English learning platform. Phase 2 (design system + app shell) and Phase 3 (Education vertical slice with accounts, persistence and AI feedback) are complete.

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind 4 · Radix UI · Supabase (Postgres + Auth + Storage, EU region) · Vercel · Claude API for AI practice feedback · FSRS for spaced revision.

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
