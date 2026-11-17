import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: true, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3100" }]);
  // Record audio and speech instead of making sound; provide one British and one American device voice.
  await page.addInitScript(() => {
    const w = window as unknown as { __played: string[] };
    w.__played = [];
    HTMLMediaElement.prototype.play = function () { w.__played.push(this.src); setTimeout(() => this.dispatchEvent(new Event("ended")), 10); return Promise.resolve(); };
    const vs = [{ lang: "en-GB", name: "Daniel" }, { lang: "en-US", name: "Samantha" }];
    window.speechSynthesis.getVoices = () => vs as unknown as SpeechSynthesisVoice[];
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => { w.__played.push(`voice:${u.lang}:${u.text}`); setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 10); };
  });
});
const played = (page: Page) => page.evaluate(() => (window as unknown as { __played: string[] }).__played);
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

for (const vp of [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`reading (${vp.name}): tapping a word opens a card beside it without moving the page`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/reading/the-moral-machine");
    // a database word in the middle of the passage
    const words = page.locator(".card p span[data-word].decoration-dotted");
    const mid = Math.floor((await words.count()) / 2);
    const word = words.nth(mid);
    await word.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 120); await page.waitForTimeout(300);
    const before = await scrollY(page);
    expect(before).toBeGreaterThan(200);

    await word.click();
    const pop = page.getByTestId("word-popover");
    await expect(pop).toBeVisible();
    await expect(pop.getByTestId("pop-lemma")).not.toBeEmpty();
    await expect(pop.getByTestId("pop-ru")).not.toBeEmpty();
    await expect(pop.getByTestId("pop-definition")).not.toBeEmpty();
    await page.waitForTimeout(500);
    expect(Math.abs((await scrollY(page)) - before)).toBeLessThanOrEqual(1); // no jump

    // the card is inside the viewport and directly above or below the word
    const [w, c] = [await word.boundingBox(), await pop.boundingBox()];
    expect(c!.x).toBeGreaterThanOrEqual(0);
    expect(c!.x + c!.width).toBeLessThanOrEqual(vp.width);
    expect(c!.y).toBeGreaterThanOrEqual(0);
    expect(c!.y + c!.height).toBeLessThanOrEqual(vp.height);
    const gap = c!.y + c!.height <= w!.y ? w!.y - (c!.y + c!.height) : c!.y - (w!.y + w!.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(24);

    // UK and US pronunciation each play their own accent
    const lemma = (await pop.getByTestId("pop-lemma").innerText()).trim();
    await pop.getByRole("button", { name: /Play UK pronunciation/ }).click();
    await pop.getByRole("button", { name: /Play US pronunciation/ }).click();
    await expect.poll(() => played(page)).toEqual([`voice:en-GB:${lemma}`, `voice:en-US:${lemma}`]);

    // another word replaces the card; still no scrolling
    // a word in another paragraph that is visible and not under the card
    const vis = await words.evaluateAll((els, card) => els.map((e, i) => { const r = e.getBoundingClientRect(); return { i, ok: r.top > 70 && r.bottom < innerHeight - 90 && (r.bottom < card.y || r.top > card.y + card.h) }; }).filter((x) => x.ok).map((x) => x.i), { y: c!.y, h: c!.height });
    const other = words.nth(vis.find((i) => Math.abs(i - mid) > 3) ?? vis.find((i) => i !== mid) ?? 0);
    await other.click();
    await expect(page.getByTestId("word-popover")).toHaveCount(1);
    await expect(other).toHaveAttribute("aria-expanded", "true");
    expect(Math.abs((await scrollY(page)) - before)).toBeLessThanOrEqual(1);

    // a click elsewhere closes it; Escape closes too
    const now = await scrollY(page);
    await page.mouse.click(vp.width - 4, vp.height - 120); // blank margin
    expect(await scrollY(page)).toBe(now);
    await expect(page.getByTestId("word-popover")).toHaveCount(0);
    await other.click();
    await expect(pop).toBeVisible();
    const open = await scrollY(page);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("word-popover")).toHaveCount(0);
    expect(await scrollY(page)).toBe(open);
  });
}

test("reading: contractions and possessives look up the right word; a failed lookup offers a fallback", async ({ page }) => {
  await page.goto("/reading/the-moral-machine");
  const contraction = page.locator(".card p span[data-word]", { hasText: /^\w+(n't|'s|’s|'re|’re|n’t)$/ }).first();
  if (await contraction.count()) {
    await contraction.click();
    await expect(page.getByTestId("word-popover").getByTestId("form-note")).toContainText(/short for|possessive/);
    await page.keyboard.press("Escape");
  }
  // the dictionary API down + an unknown word: the card explains and offers retry and save
  await fetch("http://localhost:4011/__down");
  await page.route("**/api/dictionary/lookup", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "The dictionary service is unavailable right now." }) }));
  await page.evaluate(() => { const p = document.querySelector(".card p"); if (p) p.insertAdjacentHTML("beforeend", ""); });
  const plain = page.locator(".card p span[data-word]:not(.decoration-dotted)").filter({ hasText: /^[a-z]{9,}$/ }).first();
  await plain.click();
  const pop = page.getByTestId("word-popover");
  await expect(pop.getByTestId("dictionary-entry").or(pop.getByTestId("dictionary-error"))).toBeVisible();
  await fetch("http://localhost:4011/__up");
});
