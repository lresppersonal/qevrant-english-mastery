import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Real accounts on a local Supabase: sign-up with email confirmation, sign-in, sign-out, password
 * recovery, persistence across sign-out and devices, and row-level security between users.
 */
const API = "http://127.0.0.1:54321";
const MAIL = "http://127.0.0.1:54324";
const ANON = process.env.SB_ANON_KEY!;
const run = Date.now().toString(36);
const A = { email: `learner-${run}@example.com`, password: "Reading2026" };
const B = { email: `other-${run}@example.com`, password: "Writing2026" };

const consent = (ctx: BrowserContext) => ctx.addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: true, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3200" }]);

/** The newest email to an address, from the local Mailpit inbox. */
async function latestLink(to: string, kind: RegExp) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)).json();
    const msg = list.messages?.find((m: { Subject: string }) => kind.test(m.Subject));
    if (msg) {
      const full = await (await fetch(`${MAIL}/api/v1/message/${msg.ID}`)).json();
      const link = (full.Text as string).match(/https?:\/\/\S+verify\S+/)?.[0];
      if (link) return link.replace(/[)\]>]+$/, "");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No "${kind}" email for ${to}`);
}

/** Fill in the self-assessment (onboarding step 2, Settings or the plan page). */
async function assess(page: Page, ratings: Record<string, number>, focus: string[]) {
  const form = page.getByTestId("learning-profile");
  for (const [skill, n] of Object.entries(ratings)) await form.getByRole("radiogroup", { name: `${skill}: confidence` }).getByRole("radio", { name: new RegExp(`^${n}:`) }).click();
  void focus; // the "areas to improve" question was removed: priorities come from the ratings
}
const LISTENING_WEAK = { Grammar: 4, Vocabulary: 4, Reading: 5, Listening: 1, Speaking: 2, "Academic Writing": 3 };
const GRAMMAR_WEAK = { Grammar: 1, Vocabulary: 5, Reading: 4, Listening: 4, Speaking: 4, "Academic Writing": 2 };

async function signIn(page: Page, u: { email: string; password: string }, next = "") {
  await page.goto(`/sign-in${next}`);
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel(/^Password/).fill(u.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe.configure({ mode: "serial" });

test("sign-up: validation, email confirmation, onboarding, protected pages and the logo", async ({ page, context }) => {
  await consent(context);
  // Private pages and the logo send signed-out visitors to sign-in, and back afterwards
  await page.goto("/");
  await page.getByRole("link", { name: "QEVRANT: open your dashboard" }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
  await page.goto("/vocabulary");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fvocabulary/);

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(A.email);
  await page.getByLabel(/^Password/).fill("short1");
  await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled(); // fewer than 8 characters
  await page.getByLabel(/^Password/).fill(A.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator("form [role=status]")).toContainText("Check your inbox");

  // Not confirmed yet: sign-in explains why
  await signIn(page, A);
  await expect(page.locator("form [role=alert]")).toContainText("confirm your email");

  // Confirm via the real email link → callback → onboarding
  await page.goto(await latestLink(A.email, /confirm/i));
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Continue" }).click();
  // Step 2: the learning-needs self-assessment
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  await assess(page, LISTENING_WEAK, ["Listening"]);
  await page.getByRole("button", { name: "Save and go to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("account-summary")).toContainText(A.email);

  // Registering the same email again is refused clearly
  const other = await context.browser()!.newContext();
  await consent(other);
  const p2 = await other.newPage();
  await p2.goto("http://localhost:3200/sign-up");
  await p2.getByLabel("Email").fill(A.email);
  await p2.getByLabel(/^Password/).fill(A.password);
  await p2.getByRole("button", { name: "Create account" }).click();
  await expect(p2.locator("form [role=alert]")).toContainText("already exists");
  await other.close();
});

test("learning data persists across sign-out, sign-in and a second device", async ({ page, context, browser }) => {
  await consent(context);
  await signIn(page, A);
  await expect(page).toHaveURL(/\/dashboard/);

  // Save a word while reading, finish the text
  await page.goto("/reading/is-failure-the-best-teacher");
  await page.locator(".card p span[data-word]", { hasText: /^setbacks$/ }).first().click();
  const pop = page.getByTestId("word-popover");
  await pop.getByRole("button", { name: "Save setback" }).click();
  await expect(pop.getByRole("button", { name: "Remove setback from library" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "I've finished reading" }).click();
  // Flashcard practice on a topic (stored as review history)
  await page.goto("/vocabulary/topics/education/practice");
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByTestId("practice-progress")).toContainText("1 reviewed");
  // A grammar exercise
  await page.goto("/grammar/relative-clauses/practice");
  for (let i = 0; i < 9; i++) {
    const choice = page.getByRole("radio").first();
    if (await choice.count()) await choice.check(); else await page.getByRole("textbox").first().fill("which");
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: /Next|See result/ }).click();
  }
  await expect(page.getByTestId("exercise-summary")).toContainText("Saved to your progress.");
  // Preferences: daily goal, Intensive Study Plan, collapsed sidebar
  await page.goto("/settings");
  await page.getByTestId("daily-goal").getByRole("radio", { name: "5 activities" }).click();
  await expect(page.getByText("Daily goal: 5 activities a day")).toBeVisible(); // saved
  await page.goto("/plan");
  await page.getByRole("button", { name: "Start the Intensive Study Plan" }).click();
  await expect(page.getByTestId("plan-active")).toBeVisible();

  // Sign out
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText("Your session has ended")).toHaveCount(0); // a deliberate sign-out is not "expired"
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in/);

  // Sign in on a "second device" (fresh browser, no local data) and check everything is restored
  const device2 = await browser.newContext();
  await consent(device2);
  const d = await device2.newPage();
  await d.goto("http://localhost:3200/sign-in?next=/library");
  await d.getByLabel("Email").fill(A.email);
  await d.getByLabel(/^Password/).fill(A.password);
  await d.getByRole("button", { name: "Sign in" }).click();
  await expect(d).toHaveURL(/\/library/);
  await expect(d.getByTestId("library-list")).toContainText("setback");
  await expect(d.getByTestId("library-list")).toContainText("setbacks build character");
  await d.goto("http://localhost:3200/dashboard");
  await expect(d.getByTestId("streak")).toContainText("1 day");
  await expect(d.getByTestId("daily-goal-progress")).toContainText("/ 5 activities");
  await d.goto("http://localhost:3200/progress");
  await expect(d.getByText(/1 started · \d+% accuracy \(9 answers\)/)).toBeVisible(); // the grammar exercise
  await d.goto("http://localhost:3200/plan");
  await expect(d.getByTestId("plan-active")).toBeVisible();
  await d.goto("http://localhost:3200/vocabulary/topics/education/practice");
  await expect(d.getByTestId("practice-progress")).toContainText(/remembered/);
  await device2.close();
});

test("password recovery and expired sessions", async ({ page, context }) => {
  await consent(context);
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(A.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await page.goto(await latestLink(A.email, /reset/i));
  await expect(page).toHaveURL(/\/reset-password/);
  A.password = "Speaking2027";
  await page.getByLabel("New password", { exact: true }).fill(A.password);
  await page.getByLabel("Repeat new password").fill(A.password);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // A session revoked elsewhere (e.g. "sign out everywhere") ends here with a clear message
  await page.goto("/vocabulary");
  await page.evaluate(async () => {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    if (key) localStorage.removeItem(key);
    document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n.includes("auth-token")).forEach((n) => { document.cookie = `${n}=; Max-Age=0; path=/`; });
  });
  await page.goto("/review");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Freview/);
  await signIn(page, A, "?next=%2Freview");
  await expect(page).toHaveURL(/\/review/);
});

test("row-level security: another user cannot read or write this learner's data", async () => {
  // Create and sign in user B through the real auth API
  const signup = await fetch(`${API}/auth/v1/signup`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify(B) });
  expect(signup.ok).toBe(true);
  // confirm B via the email link
  const link = await latestLink(B.email, /confirm/i);
  await fetch(link, { redirect: "manual" });
  const tokenRes = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify(B) });
  const { access_token: tokenB, user: userB } = await tokenRes.json();
  expect(tokenB).toBeTruthy();
  const aRes = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify(A) });
  const { user: userA, access_token: tokenA } = await aRes.json();

  const as = (t: string) => ({ apikey: ANON, authorization: `Bearer ${t}`, "content-type": "application/json" });
  for (const table of ["saved_items", "review_cards", "review_logs", "attempts", "responses", "activity_events", "profiles", "writing_submissions", "speaking_attempts", "listening_logs"]) {
    const mine = await (await fetch(`${API}/rest/v1/${table}?select=*`, { headers: as(tokenA) })).json();
    const theirs = await (await fetch(`${API}/rest/v1/${table}?select=*`, { headers: as(tokenB) })).json();
    expect(Array.isArray(theirs), table).toBe(true);
    // B sees only rows that belong to B (and none of A's)
    const owner = (r: Record<string, unknown>) => (r.user_id ?? r.id) as string;
    expect(theirs.every((r: Record<string, unknown>) => owner(r) === userB.id), table).toBe(true);
    if (["saved_items", "activity_events", "profiles"].includes(table)) expect(mine.length, table).toBeGreaterThan(0);
  }
  // B cannot write into A's account
  const ins = await fetch(`${API}/rest/v1/saved_items`, { method: "POST", headers: as(tokenB), body: JSON.stringify({ user_id: userA.id, item_type: "custom", item_ref: "intrusion", label: "intrusion" }) });
  expect(ins.ok).toBe(false);
  // Anonymous requests see nothing
  const anon = await (await fetch(`${API}/rest/v1/saved_items?select=*`, { headers: { apikey: ANON } })).json();
  expect(anon).toEqual([]);
});

test("personalised plans: two learners with different weaknesses get different priorities, saved in their accounts", async ({ browser }) => {
  // Learner A (listening weak) answered the self-assessment during onboarding; learner B (grammar weak) does it now, from Settings.
  const ctxB = await browser.newContext({ baseURL: "http://localhost:3200" });
  await consent(ctxB);
  const b = await ctxB.newPage();
  await signIn(b, B, "?next=/settings");
  await expect(b).toHaveURL(/\/settings/);
  await assess(b, GRAMMAR_WEAK, ["Grammar", "Academic Writing"]);
  await b.getByRole("button", { name: "Save my learning profile" }).click();
  await expect(b.getByText("Your learning profile is saved")).toBeVisible();
  await b.goto("/plan");
  await expect(b.getByTestId("priority-grammar")).toHaveAttribute("data-priority", "high");
  await expect(b.getByTestId("priority-vocabulary")).toHaveAttribute("data-priority", "maintenance");
  // B starts the personal plan; a reload (a new session read from the database) keeps everything
  await b.getByRole("button", { name: "Start the Intensive Study Plan" }).click();
  await expect(b.getByTestId("plan-version")).toHaveText("Personal plan");
  await expect(b.getByTestId("plan-today")).toContainText("Grammar focus");
  await b.reload();
  await expect(b.getByTestId("plan-version")).toHaveText("Personal plan");
  await expect(b.getByTestId("plan-today")).toContainText("Grammar focus");
  await expect(b.getByTestId("plan-today")).not.toContainText("Listening focus");

  const ctxA = await browser.newContext({ baseURL: "http://localhost:3200" });
  await consent(ctxA);
  const a = await ctxA.newPage();
  await signIn(a, A, "?next=/plan");
  // A started the plan in an earlier test, so the priorities card is folded: open it
  await a.getByTestId("personal-priorities").getByRole("button", { name: /Show/ }).click();
  await expect(a.getByTestId("priority-listening")).toHaveAttribute("data-priority", "high");
  await expect(a.getByTestId("priority-reading")).toHaveAttribute("data-priority", "maintenance");
  await expect(a.getByTestId("priority-grammar")).not.toHaveAttribute("data-priority", "high");
  // A changes a priority by hand; it is saved and survives a reload
  await a.getByLabel("Reading priority").selectOption("high");
  await expect(a.getByTestId("priority-reading")).toHaveAttribute("data-priority", "high");
  await a.reload();
  await a.getByTestId("personal-priorities").getByRole("button", { name: /Show/ }).click();
  await expect(a.getByTestId("priority-reading")).toHaveAttribute("data-priority", "high");
  await expect(a.getByTestId("priority-reading")).toContainText("You set this");
  await ctxA.close(); await ctxB.close();
});
