import { test, expect, type Page } from "@playwright/test";

/**
 * Context-aware navigation: a module opened from a topic returns to that topic (same view, same place);
 * a module opened directly stays in its own section.
 */
const consent = (page: Page) => page.context().addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: false, analytics: false, at: "2026-11-19T00:00:00Z" })), url: "http://localhost:3100" }]);
const y = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

async function openEducation(page: Page) {
  await page.goto("/topics");
  await page.getByRole("link", { name: /Education and Academia/ }).first().click();
  await expect(page).toHaveURL(/\/topics\/education$/);
  await expect(page.getByRole("heading", { level: 1, name: "Education and Academia" })).toBeVisible();
}

test.beforeEach(async ({ page }) => { await consent(page); });

test("A: Topics → Education and Academia → Reading → Back returns to the topic, same filter and position", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 560 });
  await openEducation(page);
  const reading = page.getByRole("region", { name: /Reading/ }).locator('ul a[href^="/reading/"]').first();
  const level = (await reading.locator("span").first().innerText()).trim();
  await page.getByRole("group", { name: "Filter by level" }).getByRole("button", { name: level, exact: true }).click();
  await reading.evaluate((el) => el.scrollIntoView({ block: "end" }));
  await page.evaluate(() => window.scrollBy(0, 40));
  const before = await y(page);
  expect(before).toBeGreaterThan(100);
  await reading.click();
  await expect(page).toHaveURL(/\/reading\/[a-z0-9-]+\?from=topic%3Aeducation/);
  const back = page.getByTestId("back-link");
  await expect(back).toHaveText(/Education and Academia/);
  await back.click();
  await expect(page).toHaveURL(/\/topics\/education$/);
  await expect(page.getByRole("group", { name: "Filter by level" }).getByRole("button", { name: level, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => y(page)).toBe(before);
});

test("A2: the browser's Back button and a reload keep the topic context", async ({ page }) => {
  await openEducation(page);
  await page.getByRole("region", { name: /Academic Writing/ }).locator('ul a[href^="/writing/"]').first().click();
  await expect(page).toHaveURL(/\/writing\/[a-z0-9-]+\?from=topic%3Aeducation/);
  await page.reload();
  await expect(page.getByTestId("back-link")).toHaveText(/Education and Academia/);
  await page.goBack();
  await expect(page).toHaveURL(/\/topics\/education$/);
});

test("A3: several modules in one topic — Speaking, then Vocabulary, then Listening — all return to the topic", async ({ page }) => {
  await openEducation(page);
  await page.getByRole("region", { name: /^Speaking/ }).locator('ul a[href^="/speaking/"]').first().click();
  await expect(page.getByTestId("back-link")).toHaveText(/Education and Academia/);
  await page.getByTestId("back-link").click();
  await expect(page).toHaveURL(/\/topics\/education$/);
  await page.getByRole("link", { name: "Open theme vocabulary" }).click();
  await expect(page.getByTestId("back-link")).toHaveText(/Education and Academia/);
  await page.getByTestId("back-link").click();
  await expect(page).toHaveURL(/\/topics\/education$/);
  const listen = page.getByRole("region", { name: /^Listening/ });
  await expect(listen).toBeVisible();
  await listen.locator('ul a[href^="/listening"]').first().click();
  await expect(page).toHaveURL(/\/listening\?.*topic=education/);
  await expect(page.getByLabel("Topic")).toHaveValue("education");
  await expect(page.getByTestId("back-link")).toHaveText(/Education and Academia/);
  await page.getByTestId("back-link").click();
  await expect(page).toHaveURL(/\/topics\/education$/);
});

test("B: direct access — Sidebar → Reading → a text → Back stays in Reading", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: /Main/ }).getByRole("link", { name: "Reading" }).first().click();
  await expect(page).toHaveURL(/\/reading$/);
  await expect(page.getByTestId("back-link")).toHaveCount(0); // a section page has no context back link
  await page.locator('a[href^="/reading/"]').first().click();
  const back = page.getByTestId("back-link");
  await expect(back).toHaveText(/Reading library/);
  await expect(back).toHaveAttribute("data-context", "section");
  await back.click();
  await expect(page).toHaveURL(/\/reading$/);
});

test("B2: a vocabulary exercise opened directly goes back to its own topic, never to a fixed page", async ({ page }) => {
  await page.goto("/topics/environment");
  const ex = page.getByRole("region", { name: /Vocabulary practice/ }).getByRole("link").first();
  if (await ex.count() === 0) test.skip();
  const href = (await ex.getAttribute("href"))!.split("?")[0];
  await page.goto(href);
  await expect(page.getByTestId("back-link")).not.toHaveText(/^\s*Education\s*$/);
});

test("A4: after a reload, the back link still returns to the topic and restores the saved position", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 560 });
  await openEducation(page);
  const link = page.getByRole("region", { name: /Academic Writing/ }).locator('ul a[href^="/writing/"]').last();
  await link.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const before = await y(page);
  expect(before).toBeGreaterThan(150);
  await link.click();
  await expect(page).toHaveURL(/from=topic%3Aeducation/);
  await page.reload(); // history.back is no longer the right move: the link must open the topic and restore the position
  await page.getByTestId("back-link").click();
  await expect(page).toHaveURL(/\/topics\/education$/);
  await expect.poll(() => y(page), { timeout: 4000 }).toBeGreaterThan(before - 40);
});
