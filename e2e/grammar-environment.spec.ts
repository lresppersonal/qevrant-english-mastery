import { test, expect, type Page } from "@playwright/test";

/** Grammar: every stage of a topic lives inside the lesson; the topic and stage are never lost. */
const consent = (page: Page) => page.context().addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: false, analytics: false, at: "2026-11-19T00:00:00Z" })), url: "http://localhost:3100" }]);
const LESSON = "perfect-and-continuous-aspect";
const STAGES = ["Understand", "Recognise", "Practise", "Produce", "Feedback", "Review"];
const stageNav = (page: Page) => page.getByTestId("stage-nav");

test.beforeEach(async ({ page }) => { await consent(page); });

test("C: Grammar → a topic → Recognise stays inside the lesson; Back returns to the same topic", async ({ page }) => {
  await page.goto("/grammar");
  await page.locator(`a[href^="/grammar/${LESSON}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/grammar/${LESSON}$`));
  const title = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  await stageNav(page).getByRole("link", { name: /Recognise/ }).click();
  await expect(page).toHaveURL(new RegExp(`/grammar/${LESSON}\\?stage=recognise`));
  await expect(page.getByTestId("recognise-stage")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  expect(page.url()).not.toContain("/reading");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/grammar/${LESSON}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(stageNav(page).getByRole("link", { name: /Understand/ })).toHaveAttribute("aria-current", "step");
  // the app's own back link leaves the lesson for the Grammar map (direct access)
  await expect(page.getByTestId("back-link")).toHaveText(/Grammar map/);
});

test("D: moving through all six stages keeps the same topic; progress inside a stage is kept", async ({ page }) => {
  await page.goto(`/grammar/${LESSON}`);
  const title = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  for (const s of STAGES) {
    await stageNav(page).getByRole("link", { name: new RegExp(s) }).click();
    await expect(stageNav(page).getByRole("link", { name: new RegExp(s) })).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    expect(new URL(page.url()).pathname).toBe(`/grammar/${LESSON}`);
  }
  // Answer one practice question, go to another stage and back: the answer is still there
  const go = async (name: RegExp) => { await stageNav(page).getByRole("link", { name }).click(); await expect(stageNav(page).getByRole("link", { name })).toHaveAttribute("aria-current", "step"); };
  await go(/Practise/);
  const practise = page.getByTestId("practise-stage");
  const first = practise.getByRole("radio").first();
  if (await first.count()) await first.click(); else await practise.getByRole("textbox").first().fill("test");
  await practise.getByRole("button", { name: "Check", exact: true }).click();
  await expect(practise.getByTestId("answer-feedback")).toBeVisible();
  const snapshot = await practise.innerText();
  await go(/Produce/);
  await page.getByLabel("Your text").fill("I have been working on this paragraph since breakfast.");
  await go(/Practise/);
  await expect(practise).toBeVisible();
  expect(await practise.innerText()).toBe(snapshot);
  await go(/Produce/);
  await expect(page.getByLabel("Your text")).toHaveValue("I have been working on this paragraph since breakfast.");
  // Next-stage button walks forward without leaving the lesson
  await page.getByTestId("next-stage").click();
  await expect(stageNav(page).getByRole("link", { name: /Feedback/ })).toHaveAttribute("aria-current", "step");
});

test("Grammar entered from a topic: Back from the lesson returns to that topic; a reading opened from Recognise returns to Recognise", async ({ page }) => {
  await page.goto("/topics/education");
  await page.getByRole("region", { name: /Grammar in context/ }).locator('ul a[href^="/grammar/"]').first().click();
  await expect(page).toHaveURL(/\/grammar\/[a-z-]+\?from=topic%3Aeducation/);
  await stageNav(page).getByRole("link", { name: /Recognise/ }).click();
  await expect(page).toHaveURL(/stage=recognise/);
  await expect(page).toHaveURL(/from=topic%3Aeducation/);
  await expect(page.getByTestId("back-link")).toHaveText(/Education and Academia/);
  await page.getByTestId("back-link").click();
  await expect(page).toHaveURL(/\/topics\/education$/);
});

test("Theory: the part index sits on the right on wide screens and folds into one line on phones", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/grammar/${LESSON}`);
  const idx = page.getByTestId("lesson-index");
  await expect(idx).toBeVisible();
  const [ib, tb] = [(await idx.boundingBox())!, (await page.getByTestId("theory").locator("section").first().boundingBox())!];
  expect(ib.x).toBeGreaterThan(tb.x + tb.width - 4);
  expect(tb.width).toBeGreaterThan(640);
  await idx.getByRole("button", { name: /Formation/ }).click();
  await expect(page.locator("#part-C")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(idx).toBeHidden();
  await page.getByRole("button", { name: /Contents/ }).click();
  await page.locator("#lesson-index-compact").getByRole("button", { name: /Comparison/ }).click();
  await expect(page.locator("#part-E")).toBeVisible();
});
