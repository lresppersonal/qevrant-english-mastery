import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: true, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3100" }]);
});

test("vocabulary: every topic offers list, flashcards and in-context practice", async ({ page }) => {
  await page.goto("/vocabulary");
  const card = page.getByTestId("topic-environment");
  await expect(card.getByRole("link", { name: /Practise .* with flashcards/ })).toHaveAttribute("href", "/vocabulary/topics/environment/practice");
  await expect(card.getByRole("link", { name: "In context" })).toHaveAttribute("href", "/vocabulary/topics/environment/context");
  await expect(page.getByRole("link", { name: "Academic & Advanced Synonyms" })).toBeVisible();
  await card.getByRole("link", { name: /Practise/ }).click();
  await expect(page.getByTestId("topic-modes").getByRole("link", { name: "Flashcards" })).toHaveAttribute("aria-current", "page");
});

test("flashcards: active recall, four ratings, spaced scheduling stored and shared with Review", async ({ page }) => {
  await page.goto("/vocabulary/topics/education/practice");
  const progress = page.getByTestId("practice-progress");
  const total = Number((await progress.innerText()).match(/of (\d+) items/)![1]);
  await expect(progress).toContainText("0 reviewed");
  // Answer hidden until revealed
  await expect(page.getByTestId("flashcard-front")).toBeVisible();
  await expect(page.getByTestId("flashcard-back")).toHaveCount(0);
  const first = await page.getByTestId("flashcard-front").innerText();
  await page.keyboard.press("Space");
  const back = page.getByTestId("flashcard-back");
  await expect(back).toContainText(first);
  await expect(back.locator('[lang="ru"]')).not.toBeEmpty();
  for (const r of ["Again", "Difficult", "Good", "Easy"]) await expect(page.getByRole("button", { name: new RegExp(`^${r}`) })).toBeVisible();
  // "Again" → the card returns later in the same session
  await page.getByRole("button", { name: /^Again/ }).click();
  await expect(progress).toContainText("1 reviewed");
  await expect(progress).toContainText("need more practice");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Show answer" }).click();
    if ((await page.getByTestId("flashcard-front").innerText()) === first) break;
    await page.getByRole("button", { name: /^Good/ }).click();
  }
  await expect(page.getByTestId("flashcard-front")).toHaveText(first);
  await page.getByRole("button", { name: /^Easy/ }).click();
  // Stored: the words are now in the learner's deck and library, with a schedule
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("qevrant.em.demo.v1") ?? "{}"));
  const cards = (stored.cards ?? stored.reviewCards ?? []) as { due: string; reps: number }[];
  expect(cards.length).toBeGreaterThanOrEqual(2);
  expect(cards.some((c) => new Date(c.due).getTime() > Date.now() + 3600_000)).toBe(true); // an Easy card is scheduled days ahead
  await page.goto("/library");
  await expect(page.getByTestId("library-list")).toContainText(first);
  // Reload: progress survives and new remaining has gone down
  await page.goto("/vocabulary/topics/education/practice");
  await expect(progress).toContainText("remembered");
  const remaining = Number((await progress.innerText()).match(/(\d+)\s*new remaining/)![1]);
  expect(remaining).toBeLessThan(total);
});

test("vocabulary in context: formats, explained feedback, production task, saved result", async ({ page }) => {
  await page.goto("/vocabulary/topics/environment/context");
  const kinds = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const kind = await page.getByTestId("context-kind").innerText();
    kinds.add(kind);
    if (kind === "Active production") {
      const lemma = (await page.locator(".font-display.text-2xl").first().innerText()).trim();
      await page.getByLabel("Your sentence").fill(`I think the word ${lemma} is useful when we discuss the environment.`);
      await page.getByRole("button", { name: "Check my sentence" }).click();
      await page.getByRole("button", { name: "Get AI feedback on my sentence" }).click();
      await expect(page.getByTestId("sentence-feedback")).toContainText("Mock improved sentence");
    } else {
      const radio = page.getByRole("radio");
      if (await radio.count()) await radio.first().check(); else await page.getByLabel("Your answer").fill("wrong");
      await page.getByRole("button", { name: "Check", exact: true }).click();
      const fb = page.getByTestId("context-feedback");
      await expect(fb).toContainText("Correct answer");
      await expect(fb).toContainText("Why it fits here");
      if (await radio.count()) await expect(fb).toContainText("Why the other options don't fit");
    }
    await page.getByRole("button", { name: /Next|See result/ }).click();
  }
  expect(kinds.size).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId("context-summary")).toContainText("Saved to your progress.");
});

test("synonyms: groups explain differences; contextual exercises explain every option", async ({ page }) => {
  await page.goto("/vocabulary/synonyms");
  await page.getByRole("link", { name: /improve/ }).first().click();
  await expect(page.getByTestId("synonym-members")).toContainText("facilitate");
  await expect(page.getByText("Are they interchangeable?")).toBeVisible();
  const ex = page.getByTestId("synonym-exercise");
  await expect(ex.getByTestId("synonym-sentence")).toContainText("enhance");
  await ex.getByRole("radio", { name: "Improve" }).check().catch(() => ex.getByRole("radio").first().check());
  await ex.getByRole("button", { name: "Check" }).click();
  const fb = page.getByTestId("synonym-feedback");
  await expect(fb).toContainText("Correct");
  await expect(fb.getByRole("list", { name: "Each option explained" }).getByRole("listitem")).toHaveCount(4);
  await expect(fb).toContainText("In other contexts");
  await page.goto("/vocabulary/synonyms/practice");
  await page.getByRole("button", { name: "Formal or informal?" }).click();
  await expect(page.getByTestId("synonym-exercise").locator(".chip").first()).toHaveText("Formal or informal?");
});

test("sidebar: stays in every module, collapses to icons with tooltips, remembers the choice", async ({ page }) => {
  for (const path of ["/grammar", "/vocabulary", "/reading", "/listening", "/speaking", "/writing", "/plan"]) {
    await page.goto(path);
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(page.getByTestId("sidebar").locator("a[aria-current=page]")).toHaveCount(1);
  }
  const sidebar = page.getByTestId("sidebar");
  const wide = (await sidebar.boundingBox())!.width;
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(90);
  expect(wide).toBeGreaterThan(200);
  // labels are still the links' accessible names; active item still marked
  await expect(sidebar.getByRole("link", { name: "Intensive plan" })).toHaveAttribute("aria-current", "page");
  await sidebar.getByRole("link", { name: "Reading" }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Reading");
  await sidebar.getByRole("link", { name: "Reading" }).click();
  await expect(page).toHaveURL(/\/reading$/);
  await page.reload();
  await expect.poll(async () => (await page.getByTestId("sidebar").boundingBox())!.width).toBeLessThan(90);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect.poll(async () => (await page.getByTestId("sidebar").boundingBox())!.width).toBeGreaterThan(200);
  // Mobile: compact bottom navigation instead of the sidebar
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("sidebar")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main" }).last()).toBeVisible();
});

test("landing: animated logo on the right, still with reduced motion, logo opens the dashboard", async ({ page }) => {
  await page.goto("/");
  const mark = page.getByTestId("hero-mark");
  await expect(mark).toBeVisible();
  const [h1, m] = [await page.locator("h1").boundingBox(), await mark.boundingBox()];
  expect(m!.x).toBeGreaterThan(h1!.x + h1!.width * 0.6); // right-hand side
  expect(await mark.locator(".hero-ring").evaluate((el) => getComputedStyle(el).animationName)).toBe("hero-ring");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await mark.locator(".hero-ring").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("link", { name: "QEVRANT: open your dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("account-summary")).toBeVisible();
});
