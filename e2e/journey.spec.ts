import { test, expect, type Page } from "@playwright/test";
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
  await page.getByRole("button", { name: "Save and go to dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Good to see you, Aigerim." })).toBeVisible();
  await expect(page.getByTestId("streak")).toContainText("0 days");

  // Grammar: theory and practice are separate pages; wrong answers link back to the exact rule
  await page.goto("/grammar/relative-clauses");
  await expect(page.getByRole("heading", { name: "What relative clauses do" })).toBeVisible();
  await page.getByRole("link", { name: /Practise this topic/ }).click();
  await expect(page).toHaveURL(/\/grammar\/relative-clauses\/practice$/);
  await page.getByRole("radio", { name: /that/ }).first().click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
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
  await expect(page.getByText("Is failure the best teacher?")).toBeVisible(); // continue learning

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
  await expect(page.getByText("Relative clauses in context")).toBeVisible();
});

test("academic essay gets AI practice feedback linked to grammar lessons", async ({ page }) => {
  await page.goto("/writing/learning-from-failure");
  await page.getByLabel("Your essay").fill(ESSAY);
  await expect(page.locator("#wc")).toContainText(/\d+ words/);
  await page.getByRole("button", { name: "Get AI feedback" }).click();
  const fb = page.getByTestId("ai-feedback");
  await expect(fb).toContainText("Practice feedback, not an official score.");
  await expect(fb).toContainText("Grammatical range and accuracy");
  await expect(fb.locator("mark").first()).toContainText("students which fail");
  await fb.getByRole("link", { name: /Review the rule: Form/ }).click();
  await expect(page).toHaveURL(/\/grammar\/relative-clauses#form$/);
  await page.goto("/dashboard");
  await expect(page.getByText("Learning from failure")).toBeVisible();
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

test("every navigation item reaches a real page, with no serious accessibility violations in either theme", async ({ page }) => {
  test.setTimeout(240_000);
  const paths = ["/", "/dashboard", "/topics", "/topics/environment", "/grammar", "/grammar/conditionals-and-unreal-past", "/grammar/practice", "/grammar/modals-and-modality/practice",
    "/vocabulary", "/vocabulary/topics/environment", "/vocabulary/scholarship", "/reading", "/reading/rewilding", "/listening", "/speaking", "/speaking/grades-and-learning",
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
  await page.getByRole("link", { name: /Environment and Climate/ }).click();
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
