import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: true, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3100" }]);
});

const RESPONSE = "The line graph compares the percentage of households with broadband access in four countries between 2000 and 2020. Overall, access rose steadily in every country, although one country remained well behind the others throughout the period. In 2000, fewer than a quarter of households had a connection in any of the countries. Over the following two decades the figures climbed considerably, with the three leading countries finishing the period with a large majority of homes connected. By contrast, the fourth country started from a very low base and, despite rapid growth after 2012, still had the lowest level of access in 2020. The gap between the highest and lowest figures therefore widened in the middle of the period before narrowing slightly at the end. In summary, broadband became widespread, but at different speeds.";

test("visual data description: four groups, a real figure, consistent task, AI feedback with data check", async ({ page }) => {
  await page.goto("/writing/visual");
  for (const g of ["Charts and graphs", "Diagrams and processes", "Maps and spatial change", "Combined visuals"]) await expect(page.getByRole("heading", { name: g })).toBeVisible();
  await expect(page.getByText(/IELTS/)).toHaveCount(0);
  // A generated chart task: same id → same figure and instruction
  await page.goto("/writing/visual/task?id=line-0-12345");
  const task = page.getByTestId("visual-task");
  await expect(task.getByRole("img", { name: /Line graph of % of households/ })).toBeVisible();
  const instruction = await task.locator("blockquote").innerText();
  await page.reload();
  await expect(task.locator("blockquote")).toHaveText(instruction);
  // Library diagram and map tasks render as figures too
  await page.goto("/writing/visual/task?id=cycle-water");
  await expect(page.getByTestId("visual-task").getByRole("img", { name: /a cycle/ })).toBeVisible();
  await page.goto("/writing/visual/task?id=map-campus");
  await expect(page.getByTestId("visual-task").getByRole("img").first()).toBeVisible();
  // Submit and receive feedback that checks the facts against the figure
  await page.goto("/writing/visual/task?id=line-0-12345");
  await page.getByTestId("key-features").getByRole("button", { name: "Show the checklist" }).click();
  await expect(page.getByTestId("key-features")).toContainText("Overview");
  await page.getByRole("textbox", { name: "Your response" }).fill(RESPONSE);
  await page.getByRole("button", { name: "Get AI feedback" }).click();
  await expect(page.getByTestId("ai-feedback")).toBeVisible();
  await expect(page.getByTestId("data-accuracy")).toContainText("does not match the figure");
  await expect(page.getByTestId("band-estimate")).toBeVisible();
  // It appears in the writing portfolio
  await page.goto("/writing/portfolio");
  await expect(page.getByTestId("writing-portfolio")).toContainText("Households with broadband access");
  // Unknown ids are handled
  await page.goto("/writing/visual/task?id=nope");
  await expect(page.getByText("This task doesn't exist.")).toBeVisible();
});

test("intensive study plan: enrol, see an integrated day, completion comes only from real activity", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByTestId("plan-intro")).toBeVisible();
  await page.getByRole("button", { name: "Start the Intensive Study Plan" }).click();
  const today = page.getByTestId("plan-today");
  await expect(today).toContainText("Week 1 · Day 1");
  for (const label of ["Grammar", "Vocabulary", "Reading", "Listening", "Academic Writing", "Speaking", "Revision"]) await expect(today.getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByTestId("plan-day-progress")).toHaveText(/^0 \/ \d+ done$/);
  // Links go to real modules
  await expect(today.getByRole("link", { name: /Start/ }).first()).toHaveAttribute("href", /^\/(grammar|practice)\//);
  // Log a listening session → the listening block completes, nothing else does
  await page.goto("/listening");
  await page.getByTestId("listening-list").getByRole("button", { name: "Log a session" }).first().click();
  await page.getByLabel("Minutes listened").fill("15");
  await page.getByRole("button", { name: /4 · Most details/ }).click();
  await page.getByRole("button", { name: "Save session" }).click();
  await page.goto("/plan");
  await expect(page.getByTestId("plan-day-progress")).toHaveText(/^1 \/ \d+ done$/);
  // Enrolment persists after reload
  await page.reload();
  await expect(page.getByTestId("plan-active")).toBeVisible();
});

test("speaking topics come with a language kit from the vocabulary themes, and suggestions follow saved words", async ({ page }) => {
  await page.goto("/speaking");
  const bank = (await import("../content/generated/speaking-bank.json", { with: { type: "json" } })).default as { prompts: { id: string; category: string }[] };
  const p = bank.prompts.find((x) => x.category === "environment")!;
  await page.goto(`/speaking?topic=${p.id}`);
  const kit = page.getByTestId("topic-language");
  await kit.locator("summary").click();
  await expect(kit.getByRole("link").first()).toBeVisible();
  // Save a word from a theme, then the speaking page suggests a related topic
  await page.goto("/vocabulary/topics/psychology-behaviour");
  await page.getByRole("button", { name: /^Save/ }).first().click();
  await page.goto("/speaking");
  await expect(page.getByTestId("speaking-suggestions")).toBeVisible();
});
