import { test, expect, type Page } from "@playwright/test";

/**
 * Flashcard practice: turning the card must never move the page.
 * All clicks and taps here are raw pointer events at fixed coordinates (page.mouse / page.touchscreen),
 * so Playwright never scrolls anything into view on our behalf: any movement measured is the app's own.
 */
const URL = "/vocabulary/topics/environment/practice";
const consent = (page: Page) => page.context().addCookies([{ name: "em_consent", value: encodeURIComponent(JSON.stringify({ v: 1, preferences: false, analytics: false, at: "2026-11-17T00:00:00Z" })), url: "http://localhost:3100" }]);

async function open(page: Page) {
  await consent(page);
  await page.goto(URL);
  await page.getByTestId("flashcard").waitFor();
  // Record every scroll position the page passes through, including mid-animation
  await page.evaluate(() => { (window as any).__ys = []; addEventListener("scroll", () => (window as any).__ys.push(scrollY), { passive: true }); });
}
const geo = (page: Page) => page.evaluate(() => {
  const r = document.querySelector('[data-testid="flashcard"]')!.getBoundingClientRect();
  const p = document.querySelector('[data-testid="practice-progress"]')!.getBoundingClientRect();
  return { y: scrollY, top: Math.round(r.top), h: Math.round(r.height), progressTop: Math.round(p.top), H: document.documentElement.scrollHeight, flipped: document.querySelector('[data-testid="flashcard"]')!.getAttribute("data-flipped") };
});
async function settle(page: Page) { await page.waitForTimeout(700); }
async function scrollTo(page: Page, y: number) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(150); await page.evaluate(() => ((window as any).__ys = [])); }
async function noScrollHappened(page: Page) { expect(await page.evaluate(() => (window as any).__ys)).toEqual([]); }
/** A point on the card that is on screen and not covered by fixed UI (e.g. the phone's bottom navigation): a corner, an edge or the middle */
async function point(page: Page, where: "tl" | "br" | "mid" | "tr") {
  return page.evaluate((where) => {
    const card = document.querySelector('[data-testid="flashcard"]')!;
    const b = card.getBoundingClientRect();
    const onCard = (x: number, y: number) => card.contains(document.elementFromPoint(x, y));
    let top = Math.max(b.top, 0) + 4, bottom = Math.min(b.bottom, innerHeight) - 4;
    while (bottom > top && !onCard(b.left + 4, bottom)) bottom -= 2;
    while (top < bottom && !onCard(b.left + 4, top)) top += 2;
    if (bottom <= top) throw new Error("card not on screen");
    const pts = { tl: { x: b.left + 4, y: top }, tr: { x: b.right - 4, y: top }, br: { x: b.right - 4, y: bottom }, mid: { x: (b.left + b.right) / 2, y: (top + bottom) / 2 } };
    return pts[where];
  }, where);
}

test.describe("mouse and keyboard", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("flashcards: the card is first, progress below; loading a card does not scroll", async ({ page }) => {
    await open(page);
    const g = await geo(page);
    expect(g.y).toBe(0); // no autofocus jump on load
    expect(g.progressTop).toBeGreaterThan(g.top + g.h); // progress panel sits below the card
    const ratings = await page.getByTestId("flashcard-ratings").boundingBox();
    expect(ratings!.y).toBeGreaterThan(g.top + g.h);
  });

  test("flashcards: clicking anywhere on the card turns it both ways without moving the page", async ({ page }) => {
    await open(page);
    const max = (await geo(page)).H - 720;
    for (const y of [0, Math.round(max / 2), max]) {
      await scrollTo(page, y);
      const before = await geo(page);
      for (const [where, flipped] of [["tl", "true"], ["br", "false"], ["tr", "true"], ["mid", "false"]] as const) {
        const p = await point(page, where);
        await page.mouse.click(p.x, p.y);
        await settle(page);
        const after = await geo(page);
        expect(after.flipped, `${where} at y=${y}`).toBe(flipped);
        expect(after.y).toBe(before.y);
        expect(after.top).toBe(before.top);
        expect(after.h).toBe(before.h); // same size on both sides: no layout shift
        expect(after.progressTop).toBe(before.progressTop);
        expect(after.H).toBe(before.H);
      }
      await noScrollHappened(page);
    }
  });

  test("flashcards: Show answer, space and rating never scroll; ratings appear in reserved space", async ({ page }) => {
    await open(page);
    await scrollTo(page, 120);
    const before = await geo(page);
    const btn = (await page.getByRole("button", { name: "Show answer" }).boundingBox())!;
    await page.mouse.click(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await settle(page);
    let g = await geo(page);
    expect(g.flipped).toBe("true"); // the button turns the card exactly once (not twice via the card)
    expect([g.y, g.top, g.h, g.H]).toEqual([before.y, before.top, before.h, before.H]);
    await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
    // Space turns it back and over again; it never scrolls the page down a screen
    await page.keyboard.press("Space"); await settle(page);
    expect((await geo(page)).flipped).toBe("false");
    await page.keyboard.press("Space"); await settle(page);
    expect((await geo(page)).flipped).toBe("true");
    // Ratings still available after turning back and forth; rating moves to the next card without scrolling
    const first = await page.getByTestId("flashcard-front").innerText();
    const good = (await page.getByRole("button", { name: /^Good/ }).boundingBox())!;
    await page.mouse.click(good.x + good.width / 2, good.y + good.height / 2);
    await expect(page.getByTestId("practice-progress")).toContainText("1 reviewed");
    await settle(page);
    g = await geo(page);
    expect(g.flipped).toBe("false");
    expect(await page.getByTestId("flashcard-front").innerText()).not.toBe(first);
    expect(g.y).toBe(before.y);
    expect(g.top).toBe(before.top);
    await noScrollHappened(page);
    // Keyboard flow from the Show answer button: Enter turns once, focus stays on the card, no scroll
    await page.getByRole("button", { name: "Show answer" }).focus({ preventScroll: true } as never);
    await page.keyboard.press("Enter"); await settle(page);
    expect((await geo(page)).flipped).toBe("true");
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("flashcard-face-back");
    await page.keyboard.press("3"); // Good
    await expect(page.getByTestId("practice-progress")).toContainText("2 reviewed");
    await settle(page);
    expect((await geo(page)).y).toBe(before.y);
    await noScrollHappened(page);
  });

  test("flashcards: selecting text on the card does not turn it", async ({ page }) => {
    await open(page);
    const box = (await page.getByTestId("flashcard-front").boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(box.width, 120), box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await settle(page);
    expect((await geo(page)).flipped).toBe("false");
  });
});

test.describe("touch", () => {
  test.use({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });

  test("flashcards (touch): tapping anywhere on the card turns it both ways without moving the page", async ({ page }) => {
    await open(page);
    expect((await geo(page)).y).toBe(0);
    const max = (await geo(page)).H - 700;
    for (const y of [0, 90, max]) {
      await scrollTo(page, y);
      const before = await geo(page);
      const visible = await page.evaluate(() => { const b = document.querySelector('[data-testid="flashcard"]')!.getBoundingClientRect(); return b.bottom > 40 && b.top < innerHeight - 120; });
      if (!visible) continue; // the card is scrolled off screen at this position on a tall phone page
      for (const [where, flipped] of [["tl", "true"], ["br", "false"], ["mid", "true"], ["tr", "false"]] as const) {
        const p = await point(page, where);
        await page.touchscreen.tap(p.x, p.y);
        await settle(page);
        const after = await geo(page);
        expect(after.flipped, `${where} at y=${y}`).toBe(flipped);
        expect([after.y, after.top, after.h, after.H]).toEqual([before.y, before.top, before.h, before.H]);
      }
      await noScrollHappened(page);
    }
    // Tapping Show answer turns the card once; tapping a rating moves on without scrolling
    await scrollTo(page, 260); // as a learner would: Show answer is below the fold on a small phone
    const y0 = (await geo(page)).y;
    const btn = (await page.getByRole("button", { name: "Show answer" }).boundingBox())!;
    await page.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await settle(page);
    expect((await geo(page)).flipped).toBe("true");
    await scrollTo(page, 480); // bring the ratings above the bottom navigation, as a learner would
    const y1 = (await geo(page)).y;
    const easy = (await page.getByRole("button", { name: /^Easy/ }).boundingBox())!;
    await page.touchscreen.tap(easy.x + easy.width / 2, easy.y + easy.height / 2);
    await expect(page.getByTestId("practice-progress")).toContainText("1 reviewed");
    await settle(page);
    expect((await geo(page)).y).toBe(y1);
    expect(y0).toBeGreaterThan(0);
    await noScrollHappened(page);
  });
});
