import { expect, test, type Page } from "@playwright/test";

async function markersStayWithLastWord(page: Page) {
  return page.evaluate(() => {
    const orphans: string[] = [];
    let checked = 0;
    for (const marker of document.querySelectorAll<HTMLElement>("[data-ayah-marker]")) {
      const parent = marker.parentElement;
      if (!parent?.classList.contains("whitespace-nowrap")) {
        orphans.push("nowrap");
        continue;
      }
      const word = marker.previousSibling;
      if (!word) {
        orphans.push("word");
        continue;
      }
      const range = document.createRange();
      if (word.nodeType === Node.TEXT_NODE) range.selectNodeContents(word);
      else range.selectNode(word);
      const wordBox = range.getBoundingClientRect();
      const markBox = marker.getBoundingClientRect();
      if (wordBox.width === 0 || markBox.width === 0) continue;
      checked += 1;
      const wordMid = (wordBox.top + wordBox.bottom) / 2;
      const markMid = (markBox.top + markBox.bottom) / 2;
      if (Math.abs(wordMid - markMid) > 20) orphans.push(parent.textContent?.slice(-16) ?? "line");
    }
    return { orphans, checked };
  });
}

async function lineBoxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-mushaf-line]")].map((line) => ({
      scrollWidth: line.scrollWidth,
      clientWidth: line.clientWidth,
    })),
  );
}

async function expectMadinahFit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-mushaf-line]");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const lines = [...document.querySelectorAll<HTMLElement>("[data-mushaf-line]")];
    return lines.length > 8 && lines.every((line) => line.clientWidth > 0 && line.scrollWidth <= line.clientWidth + 1);
  });
  const boxes = await lineBoxes(page);
  expect(boxes.length).toBeGreaterThan(8);
  expect(boxes.some((line) => line.scrollWidth > line.clientWidth + 1)).toBe(false);
}

async function scrollSettled(page: Page) {
  const token = Date.now() + Math.random();
  await page.waitForFunction((id) => {
    const state = window as Window & { __qalamScroll?: { id: number; y: number; stable: number; started: number } };
    const y = document.scrollingElement?.scrollTop ?? 0;
    if (!state.__qalamScroll || state.__qalamScroll.id !== id) {
      state.__qalamScroll = { id, y, stable: 0, started: performance.now() };
      return false;
    }
    const box = state.__qalamScroll;
    box.stable = box.y === y ? box.stable + 1 : 0;
    box.y = y;
    return performance.now() - box.started > 450 && box.stable >= 4;
  }, token);
}

test.describe("Madinah fit and ayah marker copy", () => {
  test.describe.configure({ timeout: 90_000 });

  test("desktop Madinah lines stay inside a 622px box", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/quran/madinah/2/6", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-mushaf-line]");
    await page.evaluate(() => document.fonts.ready);
    const boxes = await lineBoxes(page);
    expect(boxes.length).toBeGreaterThan(8);
    for (const line of boxes) {
      expect(line.clientWidth).toBe(622);
      expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth + 1);
    }
  });

  for (const width of [360, 390, 412]) {
    for (const scale of ["0.85", "1", "1.12"]) {
      test(`Madinah page fits at ${width}px and size ${scale}`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem("qalam-madinah-display-scale", value);
        }, scale);
        await page.setViewportSize({ width, height: 844 });
        const pages = scale === "1.12" ? ["/quran/madinah/2/6", "/quran/madinah/2/142"] : ["/quran/madinah/2/6"];
        for (const path of pages) await expectMadinahFit(page, path);
      });
    }
  }

  test("marker menu copies the exact ayah on digital and Ahmed", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    for (const path of ["/quran/indopak-digital-khatt/2/6", "/quran/ahmedgraf/2/1", "/quran/ahmedgraf/2/6"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.locator("#quran-tab-quran").click();
      await page.waitForSelector("[data-ayah-marker]");
      await scrollSettled(page);
      await expect(page.locator('button[aria-label^="Copy verse"]')).toHaveCount(0);
      await expect(page.locator('button[title="Copy exact Unicode verse"]')).toHaveCount(0);
      const marker = page.locator("[data-ayah-marker]").first();
      const expected = await marker.evaluate((element) => element.closest("[data-quran-copy]")?.getAttribute("data-quran-copy") ?? "");
      const location = await marker.evaluate((element) => element.closest("[data-quran-location]")?.getAttribute("data-quran-location") ?? "");
      expect(expected.length).toBeGreaterThan(5);
      expect(location).toMatch(/^\d+:\d+$/);
      const stayed = await markersStayWithLastWord(page);
      expect(stayed.orphans).toEqual([]);
      expect(stayed.checked).toBeGreaterThan(0);
      await marker.click();
      const copyAyah = page.getByRole("menuitem", { name: "Copy ayah" });
      const copyReference = page.getByRole("menuitem", { name: "Copy with reference (S:A)" });
      await expect(copyAyah).toBeFocused();
      await copyAyah.click();
      await expect(page.getByRole("status")).toHaveText("Copied");
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await marker.click();
      await expect(copyAyah).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(copyReference).toBeFocused();
      await page.keyboard.press("ArrowUp");
      await expect(copyAyah).toBeFocused();
      expect(page.url()).toContain(path);
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await expect(marker).toBeFocused();
      await marker.click();
      await copyReference.click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${expected} (${location})`);
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await marker.click();
      await page.locator("article.quran-page").click({ position: { x: 10, y: 10 } });
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await marker.click();
      await expect(page.locator("[data-ayah-options]")).toBeVisible();
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        let moved = false;
        const candidates = [document.scrollingElement, document.documentElement, document.body, document.querySelector(".quran-reader-container"), document.querySelector("main")];
        for (const node of candidates) {
          if (!(node instanceof HTMLElement)) continue;
          const before = node.scrollTop;
          node.scrollTop = before + 240;
          if (node.scrollTop !== before) moved = true;
        }
        if (!moved) document.dispatchEvent(new Event("scroll"));
      });
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await page.locator("#quran-tab-translation").click();
      await page.waitForSelector("[data-ayah-marker]");
      await scrollSettled(page);
      await expect(page.locator('button[aria-label^="Copy exact"]')).toHaveCount(0);
      const translationMarker = page.locator("[data-ayah-marker]").first();
      const translationText = await translationMarker.evaluate((element) => element.closest("[data-quran-copy]")?.getAttribute("data-quran-copy") ?? "");
      const translationLocation = await translationMarker.evaluate((element) => element.closest("[data-quran-location]")?.getAttribute("data-quran-location") ?? "");
      expect(translationText.length).toBeGreaterThan(5);
      await translationMarker.click();
      await expect(page.getByRole("menuitem", { name: "Copy ayah" })).toBeFocused();
      await page.getByRole("menuitem", { name: "Copy ayah" }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(translationText);
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await translationMarker.click();
      await page.getByRole("menuitem", { name: "Copy with reference (S:A)" }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${translationText} (${translationLocation})`);
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(page.locator('button[aria-label^="Copy verse"]')).toHaveCount(0);
    }
  });
});
