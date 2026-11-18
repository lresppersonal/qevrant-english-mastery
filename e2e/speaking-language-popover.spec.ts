import { test, expect, type Page } from "@playwright/test";

/**
 * "Language for this topic" in Speaking: tapping an item opens the Reading dictionary card in place.
 * The speaking session (topic, phase, timer, recording) must carry on untouched, with no navigation.
 */
const consent = (page: Page) => page.context().addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: false, analytics: false, at: "2026-11-18T00:00:00Z" })), url: "http://localhost:3100" }]);

test("speaking: topic words open a dictionary card in place; saving keeps the session and avoids duplicates", async ({ page }) => {
  await consent(page);
  await page.goto("/speaking");
  await page.getByRole("group", { name: "Level" }).getByRole("button", { name: "C1" }).click();
  await page.getByLabel("2 · Category").selectOption("environment");
  await page.getByRole("radio", { name: /2-minute answer/ }).click();
  await page.getByRole("button", { name: "Generate topic" }).click();
  const topic = page.getByTestId("speaking-topic");
  const title = (await topic.locator("p").first().textContent())!.trim();
  expect(title.length).toBeGreaterThan(10);
  const url = page.url();

  // A live session: preparation done, now recording
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Start speaking now" }).click();
  await expect(page.getByText(/Speaking — recording/)).toBeVisible();

  const kit = page.getByTestId("topic-language");
  await kit.locator("summary").click();
  const chip = kit.getByRole("button").first();
  const word = (await chip.textContent())!.replace("★ ", "").trim();
  await chip.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120)); // keep the word clear of the sticky header
  const y = await page.evaluate(() => window.scrollY);
  const cb0 = (await chip.boundingBox())!;
  await page.mouse.click(cb0.x + cb0.width / 2, cb0.y + cb0.height / 2);

  const pop = page.getByTestId("word-popover");
  await expect(pop).toBeVisible();
  await expect(pop.getByTestId("pop-lemma")).toHaveText(word);
  await expect(pop.getByTestId("pop-ru")).not.toBeEmpty();
  await expect(pop.getByTestId("pop-definition")).not.toBeEmpty();
  await expect(pop.getByTestId("pop-source")).toHaveText(`Source: Speaking — ${title}`);
  // The card sits next to the word (above it when there is room)
  const [cb, pb] = [(await chip.boundingBox())!, (await pop.boundingBox())!];
  expect(pb.y + pb.height <= cb.y || pb.y >= cb.y + cb.height).toBe(true);
  expect(Math.abs(pb.x + pb.width / 2 - (cb.x + cb.width / 2))).toBeLessThan(200);

  // Save it: stored as the vocabulary sense, with the topic as context and Speaking as the source
  await pop.getByRole("button", { name: `Save ${word}` }).click();
  await expect(pop.getByRole("button", { name: `Remove ${word} from library` })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("qevrant.em.demo.v1")!).saved as { itemType: string; itemRef: string; label: string; context: string; sourceRef: string }[]);
  const mine = saved.filter((s) => s.label === word);
  expect(mine).toHaveLength(1);
  expect(mine[0].itemType).toBe("sense");
  expect(mine[0].context).toBe(title);
  expect(mine[0].sourceRef).toMatch(/^speaking:/);

  // Close with Escape: focus returns to the word, the page has not moved or navigated, the session is intact
  await page.keyboard.press("Escape");
  await expect(pop).toHaveCount(0);
  await expect(chip).toBeFocused();
  await expect(chip).toContainText("★");
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  await expect(topic.locator("p").first()).toHaveText(title);
  await expect(page.getByText(/Speaking — recording/)).toBeVisible();
  const t1 = await page.getByRole("timer").textContent();
  await page.waitForTimeout(1200);
  expect(await page.getByRole("timer").textContent()).not.toBe(t1); // the timer kept running

  // Another word switches the card; an outside click closes it; the same word toggles
  const second = kit.getByRole("button").nth(1);
  await chip.click();
  await expect(pop.getByTestId("pop-lemma")).toHaveText(word);
  await second.click();
  await expect(pop).toHaveCount(1);
  await expect(pop.getByTestId("pop-lemma")).not.toHaveText(word);
  await page.mouse.click(5, 300);
  await expect(pop).toHaveCount(0);
  await second.click();
  await expect(pop).toBeVisible();
  await second.click();
  await expect(pop).toHaveCount(0);

  // Opening the saved word again shows it as saved (no second entry); finishing the answer still works
  await chip.click();
  await expect(pop.getByRole("button", { name: `Remove ${word} from library` })).toBeVisible();
  await page.keyboard.press("Escape");
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("qevrant.em.demo.v1")!).saved as { label: string }[])).filter((s) => s.label === word)).toHaveLength(1);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByLabel(/^Transcript/)).toBeVisible({ timeout: 15000 });
  expect(page.url()).toBe(url);

  // The Library shows where it came from
  await page.goto("/library");
  await expect(page.getByTestId("library-list")).toContainText(`${title}” · Speaking`);
});

test("speaking: the topic word card works with touch", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://localhost:3100" });
  const page = await context.newPage();
  await consent(page);
  await page.goto("/speaking");
  await page.getByRole("button", { name: "Generate topic" }).click();
  const kit = page.getByTestId("topic-language");
  await kit.locator("summary").tap();
  const chip = kit.getByRole("button").first();
  await chip.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  await chip.tap();
  const pop = page.getByTestId("word-popover");
  await expect(pop).toBeVisible();
  await expect(pop.getByTestId("pop-source")).toContainText("Source: Speaking —");
  const box = (await pop.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  await pop.getByRole("button", { name: "Close" }).tap();
  await expect(pop).toHaveCount(0);
  await expect(page).toHaveURL(/\/speaking/);
  await context.close();
});
