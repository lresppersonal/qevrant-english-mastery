import { test, expect, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Phase 3 acceptance journey (Demo mode). The same journey runs against Supabase when
 * NEXT_PUBLIC_SUPABASE_* are set at build time, plus a sign-in step on a second browser context.
 */
const ESSAY = `Many people believe that students learn more from failure than from success, and I largely agree with this view. However, failure only teaches something when students receive feedback and a chance to try again.

Firstly, students which fail an exam are forced to think about what went wrong. A setback makes them change the way they study, for example by revising little and often instead of the night before. Many successful people say that this is good for them in the long term.

Secondly, mistakes show teachers exactly what learners have not understood yet. Formative assessment uses this idea: weekly quizzes count for nothing, but they reveal gaps before the final exam.

On the other hand, repeated failure without support can undermine confidence. Learners who are already falling behind may simply give up.

In conclusion, failure is a powerful teacher, but only when it is followed by feedback and a second attempt.`;

// Cookie choice made, so the first-visit banner doesn't cover the page in these tests (it has its own test).
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: true, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3100" }]);
});

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.nodes[0]?.target}`);
}

test("new learner: onboard, study, answer, review the rule, save from text, revise, persist", async ({ page }) => {
  // Onboarding
  await page.goto("/onboarding");
  await page.getByLabel("What should we call you?").fill("Aigerim");
  await page.locator("#main").getByText("Exam preparation", { exact: true }).click();
  await page.getByRole("radio", { name: /^C1/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 2 (self-assessment) is optional
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Aigerim\.$/ })).toBeVisible();
  await expect(page.getByTestId("streak")).toContainText("0 days");

  // Grammar: the lesson opens on its core concept; Practise is a stage of the same lesson; wrong answers link back to the exact rule
  await page.goto("/grammar/relative-clauses");
  await expect(page.getByRole("heading", { name: "Core concept" }).first()).toBeVisible();
  await page.getByTestId("stage-nav").getByRole("link", { name: /Practise/ }).click();
  await expect(page).toHaveURL(/\/grammar\/relative-clauses\?stage=practise$/);
  await page.getByRole("radio", { name: /that/ }).first().click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  // Five-part feedback: your answer, correct answer, why it works, rule to remember, and an on-demand AI explanation
  const fbk = page.getByTestId("answer-feedback");
  await expect(fbk.getByText("Your answer", { exact: true })).toBeVisible();
  await expect(fbk.getByText("Correct answer", { exact: true })).toBeVisible();
  await expect(fbk.getByText("Why it works", { exact: true })).toBeVisible();
  await expect(fbk.getByTestId("rule-summary")).not.toBeEmpty();
  await fbk.getByRole("button", { name: "Why doesn't my answer fit?" }).click();
  await expect(fbk.getByTestId("ai-explanation")).toContainText("Mock explanation");
  await expect(fbk.getByRole("link", { name: "Practise this rule" })).toHaveAttribute("href", "/practice/smart?lesson=relative-clauses");
  await page.getByRole("link", { name: "Review the rule" }).click();
  await expect(page).toHaveURL(/\/grammar\/relative-clauses#form$/);
  await expect(page.getByRole("heading", { name: "Form: choosing the relative word" })).toBeInViewport();

  // Finish the exercise (remaining answers correct)
  await page.goto("/grammar/relative-clauses/practice");
  await page.getByRole("radio", { name: /that/ }).first().click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Next/ }).click();
  const answers: Array<[string, string]> = [["choice", "The candidates who had relevant experience were interviewed."], ["text", "which"], ["text", "whose"], ["text", "whom"], ["choice", "where"], ["choice", "under which"], ["choice", "The essay I wrote was too long."], ["choice", "who"]];
  for (const [kind, a] of answers) {
    if (kind === "text") await page.getByPlaceholder("Type your answer").fill(a);
    else await page.getByRole("radio", { name: new RegExp(`^[A-D]\\s?${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Next|See result/ }).click();
  }
  await expect(page.getByTestId("exercise-summary")).toContainText("8 / 9");
  await expect(page.getByTestId("exercise-summary")).toContainText("Saved to your progress.");

  // Adaptive practice: the missed question comes back in "My mistakes"
  await page.getByTestId("exercise-summary").getByRole("link", { name: "Practise my mistakes" }).click();
  await expect(page).toHaveURL(/\/practice\/smart\?mode=mistakes$/);
  await expect(page.getByRole("link", { name: /My mistakes \(1\)/ })).toBeVisible();
  await expect(page.getByText("Question 1 of 1")).toBeVisible();
  await page.goto("/practice/smart?lesson=relative-clauses");
  await expect(page.getByRole("heading", { name: /Practise: / })).toBeVisible();
  await expect(page.getByText(/Question 1 of \d+/)).toBeVisible();

  // Reading: tap a word, see Russian, save it with its sentence
  await page.goto("/reading/is-failure-the-best-teacher");
  await page.getByRole("button", { name: "setbacks", exact: true }).first().click();
  const panel = page.getByRole("dialog", { name: /Meaning of setbacks/ });
  await expect(panel).toContainText("неудача");
  await panel.getByRole("button", { name: "Save setback" }).click();
  await expect(panel.getByRole("button", { name: "Remove setback from library" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "I've finished reading" }).click();

  // Persisted: reload, library has the word and its context; dashboard numbers match
  await page.reload();
  await page.goto("/library");
  await expect(page.getByTestId("library-list")).toContainText("setback");
  await expect(page.getByTestId("library-list")).toContainText("setbacks build character");
  await page.goto("/dashboard");
  await expect(page.getByTestId("saved-count")).toContainText("1");
  await expect(page.getByTestId("due-count")).toContainText("1");
  await expect(page.getByTestId("streak")).toContainText("1 day");
  await expect(page.getByTestId("continue-card")).toContainText("Is failure the best teacher?"); // continue learning
  await expect(page.getByTestId("recently-studied")).toContainText("Is failure the best teacher?");

  // Review session updates the schedule
  await page.goto("/review");
  await page.getByRole("button", { name: "Start review" }).click();
  await page.getByRole("button", { name: "Show meaning" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText("Session complete")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByTestId("due-count")).toContainText("0");

  // Progress page shows the attempt
  await page.goto("/progress");
  await expect(page.getByTestId("skill-indicators")).toContainText("Vocabulary retention");
  await expect(page.getByTestId("weekly-report")).toContainText("Grammar accuracy");
  await expect(page.getByTestId("weekly-report")).toContainText("Insufficiently assessed");
  await page.getByText("Exercise history").click();
  await expect(page.getByText("Relative clauses in context")).toBeVisible();
});

test("streak flame: first activity lights it, celebration once, daily goal, persists after reload", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByTestId("streak")).toContainText("0 days");
  await expect(page.getByTestId("streak-chip")).toHaveAttribute("aria-label", /Study streak: 0 days/);
  // Opening and scrolling a lesson is not enough: only completed learning counts.
  await page.goto("/grammar/relative-clauses");
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(800);
  await expect(page.getByTestId("streak-chip")).toHaveAttribute("aria-label", /Study streak: 0 days/);
  // A completed activity (a logged listening session) lights the flame.
  await page.goto("/listening");
  await page.getByTestId("listening-list").getByRole("button", { name: "Log a session" }).first().click();
  await page.getByLabel("Minutes listened").fill("15");
  await page.getByRole("button", { name: /4 · Most details/ }).click();
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByTestId("streak-celebration")).toContainText("Your streak has started");
  await expect(page.getByTestId("streak-chip")).toHaveAttribute("aria-label", /Study streak: 1 day\. Today's goal: 1 of 3/);
  await page.goto("/settings");
  await page.getByTestId("daily-goal").getByRole("radio", { name: "1 activity" }).click();
  await page.goto("/dashboard");
  await expect(page.getByTestId("streak")).toContainText("1 day");
  await expect(page.getByTestId("daily-goal-progress")).toHaveText("1 / 1 activities");
  await expect(page.getByTestId("streak")).toContainText("Today's goal complete");
  await expect(page.getByTestId("streak-celebration")).toHaveCount(0); // no repeat celebration on reload
  await page.reload();
  await expect(page.getByTestId("streak")).toContainText("1 day");
});

test("academic essay gets AI practice feedback linked to grammar lessons", async ({ page }) => {
  await page.goto("/writing/learning-from-failure");
  await page.getByLabel("Your essay").fill(ESSAY);
  await expect(page.locator("#wc")).toContainText(/\d+ words/);
  await page.getByRole("button", { name: "Get AI feedback" }).click();
  const fb = page.getByTestId("ai-feedback");
  await expect(fb).toContainText("Educational estimate, not an official IELTS or Cambridge score.");
  await expect(fb.getByTestId("band-estimate")).toContainText("6.0–6.5");
  await expect(fb).toContainText("Argument and structure");
  await expect(fb).toContainText("Grammatical range and accuracy");
  await expect(fb.locator("mark").first()).toContainText("students which fail");
  await fb.getByRole("link", { name: /Review the rule: Form/ }).click();
  await expect(page).toHaveURL(/\/grammar\/relative-clauses#form$/);
  await page.goto("/dashboard");
  await expect(page.getByText("Learning from failure")).toBeVisible();
});

test("writing portfolio: versions, comparison and recurring mistakes", async ({ page }) => {
  await page.goto("/writing/learning-from-failure");
  await page.getByLabel("Your essay").fill(ESSAY);
  await page.getByRole("button", { name: "Get AI feedback" }).click();
  await expect(page.getByTestId("ai-feedback")).toBeVisible();
  await page.getByRole("textbox", { name: "Your essay" }).fill(ESSAY + " Moreover, schools should reward effort as well as results.");
  await page.getByRole("button", { name: "Get AI feedback" }).click();
  await expect(page.getByTestId("submissions").getByRole("listitem")).toHaveCount(2);
  await page.getByRole("link", { name: "Compare versions in your portfolio" }).click();
  await expect(page).toHaveURL(/\/writing\/portfolio$/);
  const pf = page.getByTestId("writing-portfolio");
  await expect(pf.getByRole("button", { name: /Version 2/ })).toBeVisible();
  await expect(page.getByTestId("recurring-mistakes")).toContainText("2 essays");
  await pf.getByRole("button", { name: "Compare versions" }).click();
  const cmp = page.getByTestId("version-compare");
  await expect(cmp).toContainText("Estimated band");
  await expect(cmp.locator("ins")).toContainText("reward effort");
  await pf.getByRole("button", { name: /Version 1/ }).click();
  await expect(page.getByTestId("ai-feedback")).toBeVisible();
});

test("speaking analysis API returns feedback and delivery metrics", async ({ request }) => {
  const transcript = "Well i failed my exam in the first year at university and at first I felt terrible about it but then I realised that I had been studying in the wrong way so I changed my approach and started revising every week";
  const r = await request.post("/api/ai/speaking", { data: { promptSlug: "a-failure-that-taught-you", transcript, durationSeconds: 20 } });
  expect(r.status()).toBe(200);
  const json = await r.json();
  expect(json.attempt.metrics.words).toBe(42);
  expect(json.attempt.feedback.criteria).toHaveLength(3);
  const short = await request.post("/api/ai/speaking", { data: { promptSlug: "a-failure-that-taught-you", transcript: "too short", durationSeconds: 5 } });
  expect(short.status()).toBe(422);
});

test("speaking studio: filters, random topic, timers, recording and AI feedback", async ({ page }) => {
  await page.goto("/speaking");
  await page.getByRole("group", { name: "Level" }).getByRole("button", { name: "C1" }).click();
  await page.getByLabel("2 · Category").selectOption("environment");
  await page.getByRole("radio", { name: /2-minute answer/ }).click();
  await page.getByRole("button", { name: "Generate topic" }).click();
  const topic = page.getByTestId("speaking-topic");
  await expect(topic).toContainText("C1");
  await expect(topic).toContainText("Environment");
  await expect(topic).toContainText("60s + 120s");
  const first = await topic.locator("p").first().textContent();
  await page.getByRole("button", { name: "New topic" }).click();
  await expect(topic.locator("p").first()).not.toHaveText(first ?? "");

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText("Preparation", { exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/^(1:00|0:5\d)$/);
  await page.getByRole("button", { name: "Pause" }).click();
  const frozen = await page.getByRole("timer").textContent();
  await page.waitForTimeout(1500);
  await expect(page.getByRole("timer")).toHaveText(frozen ?? "");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.getByRole("button", { name: "Start speaking now" }).click();
  await expect(page.getByText(/Speaking — recording/)).toBeVisible();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Finish" }).click();
  const box = page.getByLabel(/^Transcript/);
  await expect(box).toBeVisible({ timeout: 15000 });
  await box.fill("I think cities need to adapt to extreme weather because summers are getting hotter and floods are more common so councils should plant more trees build better drainage and protect older people who are very vulnerable during heatwaves which is very important");
  await page.getByRole("button", { name: "Submit for AI feedback" }).click();
  const fb = page.getByTestId("ai-feedback");
  await expect(fb).toContainText("Did you answer the question?");
  await expect(fb).toContainText("Pronunciation is not assessed");
  await expect(fb.getByTestId("band-estimate")).toBeVisible();
  await expect(page.getByText(/Your studio sessions \(1\)/)).toBeVisible();
});

test("listening library filters by level, type and accent and logs a session", async ({ page }) => {
  await page.goto("/listening");
  const list = page.getByTestId("listening-list");
  await page.getByRole("group", { name: "Accent" }).getByRole("button", { name: "Australian" }).click();
  await expect(list.locator("li")).toHaveCount(1);
  await expect(list).toContainText("Conversations");
  await page.getByRole("group", { name: "Accent" }).getByRole("button", { name: "All accents" }).click();
  await page.getByRole("group", { name: "Level" }).getByRole("button", { name: "C2" }).click();
  for (const t of await list.locator("li").allTextContents()) expect(t).toContain("C2");
  const link = list.getByRole("link").first();
  await expect(link).toHaveAttribute("href", /^https:\/\//);
  await expect(link).toHaveAttribute("target", "_blank");
  await list.getByRole("button", { name: "Log a session" }).first().click();
  await page.getByLabel("Minutes listened").fill("25");
  await page.getByRole("button", { name: /4 · Most details/ }).click();
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByText(/25 min this week/)).toBeVisible();
});

test("speaking API rejects unknown topics and over-long recordings", async ({ request }) => {
  const transcript = Array(40).fill("word").join(" ");
  expect((await request.post("/api/ai/speaking", { data: { bankId: "nope", mode: "one", transcript, durationSeconds: 30 } })).status()).toBe(404);
  const bank = (await import("../content/generated/speaking-bank.json", { with: { type: "json" } })).default as { prompts: { id: string }[] };
  const id = bank.prompts[0].id;
  expect((await request.post("/api/ai/speaking", { data: { bankId: id, mode: "one", transcript, durationSeconds: 200 } })).status()).toBe(400);
  expect((await request.post("/api/ai/speaking", { data: { bankId: id, mode: "one", transcript, durationSeconds: 55 } })).status()).toBe(200);
});

test("every navigation item reaches a real page, with no serious accessibility violations in either theme", async ({ page }) => {
  test.setTimeout(300_000);
  // Entrance animations fade content in; audit the settled page (reduced motion skips the fade).
  await page.emulateMedia({ reducedMotion: "reduce" });
  const paths = ["/", "/dashboard", "/practice/smart?mode=mixed", "/writing/portfolio", "/plan", "/writing/visual", "/writing/visual/task?id=line-bar-0-321", "/writing/visual/task?id=map-campus", "/writing/visual/task?id=process-glass", "/grammar/subject-verb-agreement", "/reading/the-moral-machine", "/topics", "/topics/environment", "/grammar", "/grammar/conditionals-and-unreal-past", "/grammar/practice", "/grammar/modals-and-modality/practice",
    "/vocabulary", "/vocabulary/topics/environment", "/vocabulary/scholarship", "/reading", "/reading/rewilding", "/dictionary", "/listening", "/speaking", "/speaking/grades-and-learning",
    "/writing", "/writing/gig-economy", "/review", "/library", "/progress", "/settings", "/learn", "/sign-in"];
  const problems: string[] = [];
  for (const theme of ["light", "dark"]) {
    await page.goto("/");
    await page.evaluate((t) => localStorage.setItem("qevrant.theme", t), theme);
    for (const p of paths) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(200);
      await page.waitForTimeout(400);
      for (const v of await axe(page)) problems.push(`[${theme}] ${p} ${v}`);
    }
  }
  expect(problems).toEqual([]);
});

test("keyboard: skip link, search with Ctrl+K", async ({ page }) => {
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("оценивать");
  await expect(page.getByRole("option").first()).toContainText("assess");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/vocabulary\/assess/);
});

test.describe("mobile 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("bottom navigation replaces the sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    const bottom = page.getByRole("navigation", { name: "Main" }).last();
    await expect(bottom).toBeVisible();
    await bottom.getByRole("link", { name: "Learn" }).click();
    await expect(page).toHaveURL(/\/learn$/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

test("vocabulary is organised by theme with lexical classes and CEFR filters", async ({ page }) => {
  await page.goto("/vocabulary");
  await page.getByRole("link", { name: "Environment and Climate", exact: true }).click();
  await expect(page).toHaveURL(/\/vocabulary\/topics\/environment$/);
  await expect(page.getByTestId("theme-entries")).toContainText("detrimental");
  await page.getByRole("tab", { name: /Phrasal verbs/ }).click();
  await expect(page.getByTestId("theme-entries")).toContainText("phase out");
  await expect(page.getByTestId("theme-entries")).not.toContainText("detrimental");
  await page.getByRole("tab", { name: /^All/ }).click();
  await page.getByRole("button", { name: "C1" }).click();
  await expect(page.getByTestId("theme-entries")).toContainText("detrimental");
  await expect(page.getByTestId("theme-entries")).not.toContainText("sustainable");
  await page.getByRole("tab", { name: /Word formation/ }).click();
  await expect(page.getByText("sustainability", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Synonyms/ }).click();
  await expect(page.getByText("climate vs weather")).toBeVisible();
});

test("reading library filters and multi-task texts; essay bank by type", async ({ page }) => {
  await page.goto("/reading");
  await page.getByLabel("Topic").selectOption("environment");
  await expect(page.getByTestId("reading-list")).toContainText("Letting nature take back control");
  await page.getByRole("link", { name: /Letting nature take back control/ }).click();
  await expect(page.getByText("Key vocabulary")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Matching information" })).toBeVisible();
  await page.getByRole("button", { name: "Show points to consider" }).first().click();
  await expect(page.getByText(/farmers' livelihoods/)).toBeVisible();

  await page.goto("/writing");
  await page.getByRole("tab", { name: /Cause, problem and solution/ }).click();
  await expect(page.getByRole("heading", { name: /how to approach them/ })).toBeVisible();
  await expect(page.getByTestId("essay-list")).toContainText("Plastic in the oceans");
  await page.getByRole("link", { name: /Plastic in the oceans/ }).click();
  await expect(page.getByText("Suggested plan")).toBeVisible();
  await page.getByRole("button", { name: "Show ideas" }).click();
  await expect(page.getByText(/International cooperation/)).toBeVisible();
});

test("the IELTS pathway is removed but Academic Writing remains", async ({ page }) => {
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await expect(nav.getByText("IELTS Academic")).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Academic Writing" })).toBeVisible();
  await expect(nav.getByRole("link", { name: /Listening/ })).toBeVisible();
  expect((await page.goto("/ielts"))?.status()).toBe(404);
});

for (const [name, device] of [["iPhone 14", "iPhone 14"], ["Pixel 7", "Pixel 7"]] as const) {
  test.describe(`phone: ${name}`, () => {
    const d = devices[device];
    test.use({ viewport: d.viewport, userAgent: d.userAgent, deviceScaleFactor: d.deviceScaleFactor, isMobile: d.isMobile, hasTouch: d.hasTouch });
    test("every main page fits the screen, with bottom navigation and no zoom-on-focus inputs", async ({ page }) => {
      test.setTimeout(120_000);
      const paths = ["/dashboard", "/learn", "/topics/environment", "/vocabulary", "/vocabulary/topics/crime-law", "/grammar", "/grammar/verb-patterns",
        "/grammar/practice", "/grammar/verb-patterns/practice", "/reading", "/reading/loneliness", "/speaking/your-studies", "/writing", "/writing/gig-economy", "/review", "/library", "/progress", "/settings"];
      for (const p of paths) {
        await page.goto(p);
        await page.waitForTimeout(300);
        const r = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          smallInputs: [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea")].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length,
        }));
        expect(r, p).toEqual({ overflow: false, smallInputs: 0 });
        await expect(page.getByRole("navigation", { name: "Main" }).last()).toBeVisible();
      }
    });
  });
}

test("installable app: manifest, icons and service worker", async ({ page, request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.display).toBe("standalone");
  expect(m.icons.some((i: { sizes: string; purpose: string }) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
  for (const i of m.icons) expect((await request.get(i.src)).status(), i.src).toBe(200);
  expect((await request.get("/apple-touch-icon.png")).status()).toBe(200);
  expect((await request.get("/offline.html")).status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').first()).toHaveCount(1);
  expect(await page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active))).toBe(true);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "App on your phone" })).toBeVisible();
});
