import { test, expect } from "@playwright/test";
import { mockKhateebBookReader } from "./fixtures/khateebBookReader";

test("Noorehuda loads for non-Quran book Arabic while Quran ayat keep Digital Khatt", async ({ page }) => {
  const fontRequests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("Noorehuda.woff2")) fontRequests.push(request.url());
  });
  await mockKhateebBookReader(page);
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
  await page.goto("/tools/khateeb-studio");
  await page.getByRole("link", { name: "کتاب خانہ — مکمل کتابیں پڑھیں", exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/khateeb-studio\/library$/);
  const library = page.getByTestId("book-reading-page");
  await expect(library).toBeVisible();

  const arabic = library.locator(".khateeb-book-ar.qalam-book-arabic").first();
  await expect(arabic).toBeVisible();
  await expect(arabic).toHaveCSS("font-family", /^"?Noorehuda"?/);
  // Check book sizing against the original library baseline, and measure
  // primary Arabic before/after disabling only the new font-size rules.
  // Also verify that nested book Arabic inherits rather than scaling twice.
  const metrics = await arabic.evaluate(book => {
    const primary = document.createElement("div");
    primary.className = "text-lg qalam-book-arabic";
    primary.textContent = "بِسْمِ اللّٰهِ";
    document.body.appendChild(primary);
    const nested = book.querySelector<HTMLElement>(".qalam-book-arabic");
    const scalingRules: CSSStyleRule[] = [];
    const scan = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule &&
            [".qalam-book-arabic", ".qalam-book-arabic.text-lg", ".qalam-book-arabic.khateeb-book-ar"].includes(rule.selectorText) &&
            rule.style.getPropertyValue("font-size")) scalingRules.push(rule);
        else if ("cssRules" in rule) scan((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try { scan(sheet.cssRules); } catch { /* ignore unrelated cross-origin stylesheets */ }
    }
    if (scalingRules.length < 2) throw new Error("Both Arabic font size rules must be present");
    const old = scalingRules.map(rule => ({
      rule, value: rule.style.getPropertyValue("font-size"),
      priority: rule.style.getPropertyPriority("font-size"),
    }));
    let oldSize = 0, originalPrimaryPx = 0;
    try {
      for (const {rule} of old) rule.style.removeProperty("font-size");
      // Shared book-Arabic sizing scales the original library's 1.15rem
      // to 1.4375rem. The reader itself inherits 22px when this rule is off,
      // so that inherited value is not the old library's sizing baseline.
      oldSize = 1.15 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      originalPrimaryPx = parseFloat(getComputedStyle(primary).fontSize);
    } finally {
      for (const {rule, value, priority} of old) rule.style.setProperty("font-size", value, priority);
    }
    const newSize = parseFloat(getComputedStyle(book).fontSize);
    const wordSpacing = parseFloat(getComputedStyle(book).wordSpacing);
    const nestedSize = nested ? parseFloat(getComputedStyle(nested).fontSize) : null;
    const newPrimaryPx = parseFloat(getComputedStyle(primary).fontSize);
    const primaryWordSpacing = parseFloat(getComputedStyle(primary).wordSpacing);
    primary.remove();
    return {oldSize, newSize, wordSpacing, nestedSize,
      originalPrimaryPx, newPrimaryPx, primaryWordSpacing};
  });
  expect(metrics.newSize / metrics.oldSize).toBeGreaterThan(1.20);
  expect(metrics.newSize / metrics.oldSize).toBeLessThan(1.30);
  expect(metrics.wordSpacing).toBeGreaterThan(0);
  // BookPassageText has a nested qalam-book-arabic span; don't scale twice.
  expect(metrics.nestedSize).not.toBeNull();
  expect(metrics.nestedSize!).toBeCloseTo(metrics.newSize, 1);
  // KhateebPrimaryArabic has a fixed text-lg size; confirm true 25%, not 11%.
  expect(metrics.newPrimaryPx / metrics.originalPrimaryPx).toBeGreaterThan(1.20);
  expect(metrics.newPrimaryPx / metrics.originalPrimaryPx).toBeLessThan(1.30);
  expect(metrics.primaryWordSpacing).toBeGreaterThan(0);

  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() =>
    [...document.fonts].some(face => face.family.replaceAll('"', "") === "Noorehuda" && face.status === "loaded")
  )).toBe(true);
  expect(fontRequests).toHaveLength(1);
  expect(new URL(fontRequests[0]).pathname).toBe("/fonts/Noorehuda.woff2");

  await page.goto("/quran/indopak-digital-khatt/1/1");
  const ayah = page.locator(".quran-flow .quran-ayah").filter({ hasText: /[\u0621-\u064A]/ }).first();
  await expect(ayah).toBeVisible();
  const fontFamily = await ayah.evaluate(el => getComputedStyle(el).fontFamily);
  expect(fontFamily).toContain("DigitalKhattIndoPak");
  expect(fontFamily).not.toContain("Noorehuda");
});
