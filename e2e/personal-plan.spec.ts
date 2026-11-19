import { test, expect, type Page } from "@playwright/test";

/** Personalised Intensive Study Plan (demo mode: the profile is saved in this browser). */
const consent = (page: Page) => page.context().addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: false, analytics: false, at: "2026-11-19T00:00:00Z" })), url: "http://localhost:3100" }]);

async function assess(page: Page, ratings: Record<string, number>, focus: string[]) {
  const form = page.getByTestId("learning-profile");
  for (const [skill, n] of Object.entries(ratings)) await form.getByRole("radiogroup", { name: `${skill}: confidence` }).getByRole("radio", { name: new RegExp(`^${n}:`) }).click();
  for (const f of focus) await form.getByRole("button", { name: f, exact: true }).click();
}

test("onboarding self-assessment → personal priorities → a personal plan that survives a reload", async ({ page }) => {
  await consent(page);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save and go to dashboard" })).toBeDisabled();
  await assess(page, { Grammar: 4, Vocabulary: 4, Reading: 5, Listening: 1, Speaking: 2, "Academic Writing": 3 }, ["Listening", "Speaking"]);
  await page.getByRole("button", { name: "Save and go to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/plan");
  const prio = page.getByTestId("personal-priorities");
  await expect(prio.getByTestId("priority-listening")).toHaveAttribute("data-priority", "high");
  await expect(prio.getByTestId("priority-speaking")).toHaveAttribute("data-priority", "high");
  await expect(prio.getByTestId("priority-reading")).toHaveAttribute("data-priority", "maintenance");
  await expect(prio.getByTestId("priority-listening")).toContainText("You rated your confidence 1 out of 5");
  await page.getByRole("button", { name: "Start the Intensive Study Plan" }).click();
  const today = page.getByTestId("plan-today");
  await expect(page.getByTestId("plan-version")).toHaveText("Personal plan");
  await expect(today).toContainText("Listening focus");
  await expect(today).toContainText("lighter: a stronger area");

  await page.reload();
  await expect(page.getByTestId("plan-version")).toHaveText("Personal plan");
  await expect(page.getByTestId("plan-today")).toContainText("Listening focus");

  // Manual change wins and is remembered
  await page.getByRole("button", { name: /Show/ }).click();
  await page.getByLabel("Reading priority").selectOption("high");
  await expect(page.getByTestId("priority-reading")).toHaveAttribute("data-priority", "high");
  await page.reload();
  await page.getByRole("button", { name: /Show/ }).click();
  await expect(page.getByTestId("priority-reading")).toHaveAttribute("data-priority", "high");

  // The standard plan stays available
  await page.getByRole("button", { name: "Use the standard plan" }).click();
  await expect(page.getByTestId("plan-version")).toHaveText("Standard plan");
  await expect(page.getByTestId("plan-today")).not.toContainText("Listening focus");
  await page.getByRole("button", { name: "Use my personal plan" }).click();
  await expect(page.getByTestId("plan-version")).toHaveText("Personal plan");
});

test("a different learner gets different priorities", async ({ page }) => {
  await consent(page);
  await page.goto("/settings");
  await assess(page, { Grammar: 1, Vocabulary: 5, Reading: 4, Listening: 4, Speaking: 4, "Academic Writing": 2 }, ["Grammar", "Academic Writing"]);
  await page.getByRole("button", { name: "Save my learning profile" }).click();
  await page.goto("/plan");
  await expect(page.getByTestId("priority-grammar")).toHaveAttribute("data-priority", "high");
  await expect(page.getByTestId("priority-writing")).toHaveAttribute("data-priority", "high");
  await expect(page.getByTestId("priority-listening")).not.toHaveAttribute("data-priority", "high");
  await expect(page.getByTestId("priority-vocabulary")).toHaveAttribute("data-priority", "maintenance");
});
