import { expect, test, type Page } from "@playwright/test";

async function lineBoxes(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-mushaf-line]")].map((line) => ({
      scrollWidth: line.scrollWidth,
      clientWidth: line.clientWidth,
    })),
  );
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
        await page.goto("/quran/madinah/2/6", { waitUntil: "domcontentloaded" });
        await page.waitForSelector("[data-mushaf-line]");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
          const lines = [...document.querySelectorAll<HTMLElement>("[data-mushaf-line]")];
          return lines.length > 8 && lines.every((line) => line.clientWidth > 0 && line.scrollWidth <= line.clientWidth + 1);
        });
        const boxes = await lineBoxes(page);
        expect(boxes.some((line) => line.scrollWidth > line.clientWidth + 1)).toBe(false);
      });
    }
  }

  test("marker menu copies the exact ayah on digital and Ahmed", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    for (const path of ["/quran/indopak-digital-khatt/2/6", "/quran/ahmedgraf/2/6"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.locator("#quran-tab-quran").click();
      await page.waitForSelector("[data-ayah-marker]");
      await expect(page.locator('button[aria-label^="Copy verse"]')).toHaveCount(0);
      await expect(page.locator('button[title="Copy exact Unicode verse"]')).toHaveCount(0);
      const marker = page.locator("[data-ayah-marker]").first();
      const expected = await marker.evaluate((element) => element.closest("[data-quran-copy]")?.getAttribute("data-quran-copy") ?? "");
      const location = await marker.evaluate((element) => element.closest("[data-quran-location]")?.getAttribute("data-quran-location") ?? "");
      expect(expected.length).toBeGreaterThan(5);
      expect(location).toMatch(/^\d+:\d+$/);
      await marker.click();
      await page.getByRole("menuitem", { name: "Copy ayah" }).click();
      await expect(page.getByRole("status")).toHaveText("Copied");
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await marker.click();
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await marker.click();
      await page.locator("article.quran-page").click({ position: { x: 10, y: 10 } });
      await expect(page.locator("[data-ayah-options]")).toHaveCount(0);
      await marker.click();
      await page.getByRole("menuitem", { name: "Copy with reference (S:A)" }).click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${expected} (${location})`);
      await page.locator("#quran-tab-translation").click();
      await expect(page.locator('button[aria-label^="Copy exact"]')).toHaveCount(0);
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(page.locator('button[aria-label^="Copy verse"]')).toHaveCount(0);
    }
  });
});
