import { test, expect } from "@playwright/test";

test("Noorehuda loads for non-Quran book Arabic while Quran ayat keep Digital Khatt", async ({ page }) => {
  const source = {
    id: "sahifa-ar", book: "sahifa", language: "ar",
    filename: "sahifa-ar.docx", translator: null, sha256: "a".repeat(64),
  };
  const id = "sahifa-ar:supplication:1";
  const paragraph = { id: `${id}:p1`, text: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ وَقَالَ عَلَيْهِ السَّلَامُ" };
  const record = {
    id, sourceId: source.id, book: "sahifa", language: "ar",
    kind: "supplication", number: 1, title: "دعاء ١",
    reference: { sourceId: source.id, section: "supplication", number: 1, locator: "fixture", printPage: null },
    paragraphs: [paragraph], textSha256: "b".repeat(64),
  };
  const fontRequests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("Noorehuda.woff2")) fontRequests.push(request.url());
  });
  await page.route("**/api/khateeb/library**", route => {
    const op = new URL(route.request().url()).searchParams.get("op");
    const data = op === "search"
      ? { total: 1, page: 1, pageSize: 20, hits: [{ id, sourceId: source.id, title: record.title, kind: "supplication", number: 1, language: "ar", snippet: paragraph.text }] }
      : op === "record" ? { record, source }
      : { ready: true, sources: [source], recordCount: 1 };
    return route.fulfill({ json: data });
  });

  await page.goto("/tools/khateeb-studio");
  await page.getByRole("button", { name: "کتابی ذخیرہ", exact: true }).click();
  const library = page.getByTestId("book-library");
  await expect(library).toBeVisible();
  await library.getByRole("combobox", { name: "زبان", exact: true }).selectOption("ar");
  await library.getByRole("button", { name: "کتاب میں تلاش کریں", exact: true }).click();

  const arabic = library.locator(".khateeb-book-ar.qalam-book-arabic").first();
  await expect(arabic).toBeVisible();
  await expect(arabic).toHaveCSS("font-family", /^"?Noorehuda"?/);
  // Measure the actual element before/after temporarily disabling only
  // the new font-size CSS declarations. Cloning and removing the class is
  // insufficient: its nested Arabic parent may already inherit that scale.
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
            [".qalam-book-arabic", ".qalam-book-arabic.text-lg"].includes(rule.selectorText) &&
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
      oldSize = parseFloat(getComputedStyle(book).fontSize);
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
  if (metrics.nestedSize !== null) expect(metrics.nestedSize).toBeCloseTo(metrics.newSize, 1);
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
