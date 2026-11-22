import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * Functional tests for the Dictionary, Academic Writing reliability, microphone permissions and
 * cookie consent. External services are replaced by local mocks (see playwright.config.ts):
 * mock-dictionary.mjs (Free Dictionary API) and mock-anthropic.mjs (Claude), both of which
 * can be switched into a failing state to test the fallbacks.
 */
const consent = (ctx: BrowserContext) => ctx.addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: false, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3100" }]);

/** Records audio playback and speech synthesis instead of making sound. */
async function stubAudio(page: Page, voices: { lang: string; name: string }[] = []) {
  await page.addInitScript((vs) => {
    (window as unknown as { __played: string[] }).__played = [];
    HTMLMediaElement.prototype.play = function () { (window as unknown as { __played: string[] }).__played.push(this.src); setTimeout(() => this.dispatchEvent(new Event("ended")), 10); return Promise.resolve(); };
    const synth = window.speechSynthesis;
    if (synth) {
      synth.getVoices = () => vs as unknown as SpeechSynthesisVoice[];
      synth.speak = (u: SpeechSynthesisUtterance) => { (window as unknown as { __played: string[] }).__played.push(`voice:${u.lang}:${u.text}`); setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 10); };
    }
  }, voices);
}
const played = (page: Page) => page.evaluate(() => (window as unknown as { __played: string[] }).__played);

// The standalone Dictionary page was removed (brief P3); lookup now lives in the in-context word popup.
test.describe.skip("dictionary", () => {
  test.beforeEach(async ({ context }) => { await consent(context); });

  test("reading: common word, database word and inflected form all return entries with context", async ({ page }) => {
    await page.goto("/reading/loneliness");
    const card = page.getByRole("dialog");
    // a common grammar word that used to say "not in the dictionary yet"
    await page.locator("span[role=button]", { hasText: /^many$/i }).first().click();
    await expect(card.getByTestId("pop-ru")).toContainText("много");
    await card.getByRole("button", { name: "More details" }).click();
    const entry = card.getByTestId("dictionary-entry");
    await expect(entry).toContainText(/In this sentence\s*Many people/);
    await expect(entry).toContainText(/Grammar: determiner/);
    await expect(card).not.toContainText("isn't in the English Mastery dictionary");
    await card.getByRole("button", { name: "Close" }).click();

    await page.goto("/reading/rewilding");

    // a word stored in the vocabulary database
    await page.locator("span[role=button]", { hasText: /^habitats?$/i }).first().click();
    await expect(card.getByTestId("dictionary-entry")).toContainText(/habitat/i);
    await card.getByRole("button", { name: "More details" }).click();
    await expect(card.getByRole("link", { name: "Full entry" })).toBeVisible();
    await card.getByRole("button", { name: "Close" }).click();

    // the text's own key-vocabulary gloss is shown with the dictionary entry
    await page.locator("span[role=button]", { hasText: /^rewilding$/i }).first().click();
    await card.getByRole("button", { name: "More details" }).click();
    await expect(card.getByTestId("text-gloss")).toContainText("ревайлдинг");
    await card.getByRole("button", { name: "Close" }).click();

    // every word in the passage opens a useful card (sampled: 25 words)
    const words = page.locator(".card p span[role=button]");
    const n = await words.count();
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 25))) {
      await words.nth(i).click();
      await expect(card.getByTestId("dictionary-entry").or(card.getByTestId("dictionary-error"))).toBeVisible();
      await expect(card.getByTestId("dictionary-entry")).toBeVisible();
      await card.getByRole("button", { name: "Close" }).click();
    }
  });

  test("lookup of words not in the database, inflected forms and contextual meaning", async ({ page }) => {
    await page.goto("/dictionary");
    // "many": built-in
    await page.getByLabel("Word or phrase").fill("many");
    await page.getByRole("button", { name: "Look up" }).click();
    const entry = page.getByTestId("dictionary-entry");
    await expect(entry).toContainText("много");
    await expect(entry).toContainText(/countable/);

    // "running": inflected form of a built-in word
    await page.getByLabel("Word or phrase").fill("running");
    await page.getByLabel(/Sentence it appears in/).fill("She was running late for the meeting.");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(entry.getByTestId("form-note")).toContainText("-ing form of run");
    await expect(entry).toContainText(/Grammar:.*verb/);

    // not in the database: external dictionary + AI (Russian, context)
    await page.getByLabel("Word or phrase").fill("pondered");
    await page.getByLabel(/Sentence it appears in/).fill("She pondered the question for a long time.");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(entry).toContainText("ponder");
    await expect(entry.getByTestId("form-note")).toContainText("past form of ponder");
    await expect(entry.getByTestId("context-note")).toContainText("thought about the question carefully");
    await expect(entry.getByTestId("best-sense")).toContainText("обдумывать");
  });

  test("British and American pronunciation: recordings, device-voice fallback and honest 'unavailable'", async ({ page }) => {
    await stubAudio(page, [{ lang: "en-GB", name: "Test British" }]);
    await page.goto("/dictionary");
    await page.getByLabel("Word or phrase").fill("ubiquitous");
    await page.getByRole("button", { name: "Look up" }).click();
    await page.getByRole("button", { name: /Play UK pronunciation/ }).click();
    await page.getByRole("button", { name: /Play US pronunciation/ }).click();
    await expect.poll(() => played(page)).toEqual(["http://localhost:4011/audio/ubiquitous-uk.mp3", "http://localhost:4011/audio/ubiquitous-us.mp3"]);

    // ponder has only a US recording: UK falls back to the device's British voice
    await page.getByLabel("Word or phrase").fill("ponder");
    await page.getByRole("button", { name: "Look up" }).click();
    await page.getByRole("button", { name: /Play UK pronunciation of ponder/ }).click();
    await expect.poll(() => played(page)).toContain("voice:en-GB:ponder");
  });

  test("no audio and no voice for an accent shows a clear note instead of a dead button", async ({ page }) => {
    await stubAudio(page, []);
    await page.goto("/dictionary");
    await page.getByLabel("Word or phrase").fill("ponder");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByTestId("no-audio-uk")).toContainText("no UK audio available");
    await expect(page.getByRole("button", { name: /Play US pronunciation of ponder/ })).toBeVisible();
  });

  test("when the dictionary and AI are unavailable: built-in words still work, others offer Retry", async ({ page, request }) => {
    await request.get("http://localhost:4011/__down");
    await request.get("http://localhost:4010/__fail?n=5");
    try {
      await page.goto("/dictionary");
      await page.getByLabel("Word or phrase").fill("despite");
      await page.getByRole("button", { name: "Look up" }).click();
      await expect(page.getByTestId("dictionary-entry")).toContainText("несмотря на");

      await page.getByLabel("Word or phrase").fill("serendipity"); // not built in, not cached
      await page.getByRole("button", { name: "Look up" }).click();
      const err = page.getByTestId("dictionary-error");
      await expect(err).toContainText("didn't respond");
      await request.get("http://localhost:4011/__up");
      await request.get("http://localhost:4010/__fail?n=0");
      await err.getByRole("button", { name: "Try again" }).click();
      await expect(page.getByTestId("dictionary-entry")).toContainText(/serendipity/i);
    } finally {
      await request.get("http://localhost:4011/__up");
      await request.get("http://localhost:4010/__fail?n=0");
    }
  });
});

const ESSAY = `Some people think that universities should focus on preparing students for jobs, while others believe their main purpose is to develop critical thinking. In my view, both aims matter, but thinking skills are the foundation.

Firstly, employers increasingly value graduates who can analyse problems and learn quickly, because specific job skills change fast. A course that only teaches current software will soon be out of date.

Secondly, a university education has an impact to the society as a whole. Citizens who can evaluate evidence are less likely to believe false news and more likely to take part in public debate.

However, practical experience is also very important. Internships and projects help students apply theory and make the move into work easier.

In conclusion, universities should combine both aims, but critical thinking should remain their central goal.`;

test.describe("academic writing reliability", () => {
  test.beforeEach(async ({ context }) => { await consent(context); });

  test("autosave, refresh, failed assessment keeps the essay, retry succeeds, no duplicates", async ({ page, request }) => {
    await page.goto("/writing/learning-from-failure");
    const box = page.getByLabel("Your essay");
    await expect(box).toBeEnabled();
    await box.fill(ESSAY);
    await expect(page.getByTestId("save-status")).toContainText("Saved on this device");
    await page.reload();
    await expect(page.getByLabel("Your essay")).toHaveValue(ESSAY);

    // the AI provider fails: the essay must survive and be retryable
    await request.get("http://localhost:4010/__fail?n=1");
    let posts = 0;
    page.on("request", (r) => { if (r.url().endsWith("/api/ai/writing") && r.method() === "POST") posts++; });
    const submit = page.getByRole("button", { name: "Get AI feedback" });
    await submit.click();
    await expect(page.getByRole("button", { name: /Analysing/ })).toBeDisabled();
    await page.getByRole("button", { name: /Analysing/ }).click({ force: true }).catch(() => {}); // a hasty second click must not send a second essay
    const err = page.getByTestId("writing-error");
    await expect(err).toContainText("busy or temporarily unavailable");
    await expect(err).toContainText("Your essay is saved");
    expect(posts).toBe(1);
    await expect(page.getByLabel("Your essay")).toHaveValue(ESSAY);
    await expect(page.getByTestId("submissions")).toContainText("Saved · not assessed yet");

    // survives a refresh too
    await page.reload();
    await expect(page.getByLabel("Your essay")).toHaveValue(ESSAY);
    await expect(page.getByTestId("submissions")).toContainText("Saved · not assessed yet");

    // retry from the list
    await page.getByTestId("submissions").getByRole("button", { name: "Retry" }).click();
    const fb = page.getByTestId("ai-feedback");
    await expect(fb).toContainText("Task response");
    await expect(fb.getByTestId("band-estimate")).toBeVisible();
    await expect(page.getByTestId("submissions")).toContainText("Assessed");
    await expect(page.getByTestId("submissions")).not.toContainText("not assessed yet");

    // the Essay Writing page lists the unfinished draft
    await page.goto("/writing/essays");
    await expect(page.getByTestId("unfinished-essays")).toContainText("Learning from failure");
  });

  test("writing API: idempotent request id and clear errors", async ({ request }) => {
    const requestId = crypto.randomUUID();
    const a = await request.post("/api/ai/writing", { data: { promptSlug: "learning-from-failure", body: ESSAY, requestId } });
    expect(a.status()).toBe(200);
    const b = await request.post("/api/ai/writing", { data: { promptSlug: "learning-from-failure", body: ESSAY, requestId } });
    expect((await b.json()).submission.id).toBe((await a.json()).submission.id);
    const short = await request.post("/api/ai/writing", { data: { promptSlug: "learning-from-failure", body: "Too short." } });
    expect(short.status()).toBe(422);
    expect((await short.json()).error).toContain("at least 80 words");
  });
});

/** Replaces the browser microphone with a failing one, as when permission is denied or no device exists. */
async function failingMic(page: Page, name: "NotAllowedError" | "NotFoundError" | "NotReadableError", permission: "denied" | "prompt") {
  await page.addInitScript(([n, p]) => {
    (window as unknown as { __gum: number }).__gum = 0;
    navigator.mediaDevices.getUserMedia = async () => { (window as unknown as { __gum: number }).__gum++; throw new DOMException("mock", n); };
    const q = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = async (d: PermissionDescriptor) => (d.name === ("microphone" as PermissionName) ? ({ state: p, addEventListener() {}, removeEventListener() {} } as unknown as PermissionStatus) : q(d));
  }, [name, permission] as const);
}

test.describe("microphone permissions", () => {
  test.beforeEach(async ({ context }) => { await consent(context); });

  test("is never requested until the learner asks", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __gum: number }).__gum = 0;
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (c) => { (window as unknown as { __gum: number }).__gum++; return orig(c); };
    });
    for (const path of ["/speaking", "/settings", "/reading/rewilding", "/dashboard"]) {
      await page.goto(path);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => (window as unknown as { __gum: number }).__gum), path).toBe(0);
    }
  });

  test("granted: Settings shows the state and a test recording plays back", async ({ page }) => {
    await page.goto("/settings#privacy");
    const mic = page.getByTestId("mic-permission");
    await expect(mic.getByTestId("mic-state")).toHaveAttribute("data-state", "granted");
    await mic.getByRole("button", { name: /Test microphone/ }).click();
    await expect(mic.getByTestId("mic-test-result")).toContainText("Recording works", { timeout: 10000 });
  });

  test("denied: Studio and Settings explain how to unblock, with no generic error", async ({ page }) => {
    await failingMic(page, "NotAllowedError", "denied");
    await page.goto("/speaking");
    await page.getByRole("button", { name: "Generate topic" }).click();
    await expect(page.getByTestId("mic-hint")).toContainText("currently blocked");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    const problem = page.getByTestId("mic-problem");
    await expect(problem).toHaveAttribute("data-code", "denied");
    await expect(problem).toContainText("Microphone access was blocked");
    await expect(problem).toContainText("Microphone");
    await expect(page.getByText("Preparation", { exact: true })).toHaveCount(0); // preparation never started

    await page.goto("/settings#privacy");
    await expect(page.getByTestId("mic-state")).toHaveText("Blocked");
    await expect(page.getByTestId("mic-help")).toContainText("Allow");
  });

  test("no microphone and busy microphone get their own messages", async ({ page }) => {
    await failingMic(page, "NotFoundError", "prompt");
    await page.goto("/speaking");
    await page.getByRole("button", { name: "Generate topic" }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByTestId("mic-problem")).toHaveAttribute("data-code", "not-found");
    await expect(page.getByTestId("mic-problem")).toContainText("No microphone was found");
  });

  test("busy microphone", async ({ page }) => {
    await failingMic(page, "NotReadableError", "granted" as never);
    await page.goto("/settings#privacy");
    await page.getByRole("button", { name: /Test microphone/ }).click();
    await expect(page.getByTestId("mic-help")).toContainText("another app");
  });
});

test.describe("cookie consent", () => {
  test("banner on first visit; essential-only choice is remembered and blocks optional storage", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("no analytics are active");
    await banner.getByRole("button", { name: "Essential only" }).click();
    await expect(banner).toBeHidden();
    const cookie = (await page.context().cookies()).find((c) => c.name === "em_consent");
    expect(JSON.parse(decodeURIComponent(cookie!.value))).toMatchObject({ preferences: false, analytics: false });
    await page.reload();
    await expect(page.getByTestId("cookie-banner")).toBeHidden();

    // optional "preferences" storage is not written without consent
    await page.goto("/grammar/relative-clauses");
    await expect(page.getByTestId("continue-recognise")).toBeVisible(); // the whole theory is on one page
    expect(await page.evaluate(() => localStorage.getItem("em-lesson-view"))).toBeNull();

    // the choice can be changed later, separately from the microphone
    await page.goto("/privacy#cookies");
    await page.getByTestId("cookie-settings").getByLabel(/Preferences/).check();
    await page.getByRole("button", { name: "Save cookie choices" }).click();
    const updated = (await page.context().cookies()).find((c) => c.name === "em_consent");
    expect(JSON.parse(decodeURIComponent(updated!.value)).preferences).toBe(true);
  });
});
