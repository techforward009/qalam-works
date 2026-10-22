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
  // Compare computed styles against the same DOM element with just the new
  // book-font class removed. This catches fixed-size utility overrides.
  const metrics = await arabic.evaluate(element => {
    const book = element as HTMLElement;
    const base = book.cloneNode(false) as HTMLElement;
    base.textContent = book.textContent;
    base.classList.remove("qalam-book-arabic");
    book.parentElement!.appendChild(base);
    const oldSize = parseFloat(getComputedStyle(base).fontSize);
    const newStyle = getComputedStyle(book);
    const newSize = parseFloat(newStyle.fontSize);
    const wordSpacing = parseFloat(newStyle.wordSpacing);
    base.remove();
    const nested = book.querySelector<HTMLElement>(".qalam-book-arabic");
    return {
      oldSize, newSize, wordSpacing,
      nestedSize: nested ? parseFloat(getComputedStyle(nested).fontSize) : null,
    };
  });
  expect(metrics.newSize / metrics.oldSize).toBeGreaterThan(1.20);
  expect(metrics.newSize / metrics.oldSize).toBeLessThan(1.30);
  expect(metrics.wordSpacing).toBeGreaterThan(0);
  // Nested BookPassageText spans must not accumulate a second 1.25x increase.
  if (metrics.nestedSize !== null) expect(metrics.nestedSize).toBeCloseTo(metrics.newSize, 1);

  // Existing text-lg users (KhateebPrimaryArabic) are measured separately,
  // because Tailwind's fixed font size can otherwise mask the relative change.
  const primaryMetrics = await page.evaluate(() => {
    const host = document.createElement("div");
    host.style.visibility = "hidden";
    const control = document.createElement("div");
    control.className = "text-lg";
    control.textContent = "بِسْمِ اللّٰهِ";
    const actual = document.createElement("div");
    actual.className = "text-lg qalam-book-arabic";
    actual.textContent = control.textContent;
    host.append(control, actual);
    document.body.appendChild(host);
    const originalPx = parseFloat(getComputedStyle(control).fontSize);
    const newPx = parseFloat(getComputedStyle(actual).fontSize);
    const spacingPx = parseFloat(getComputedStyle(actual).wordSpacing);
    host.remove();
    return { originalPx, newPx, spacingPx };
  });
  expect(primaryMetrics.newPx / primaryMetrics.originalPx).toBeGreaterThan(1.20);
  expect(primaryMetrics.newPx / primaryMetrics.originalPx).toBeLessThan(1.30);
  expect(primaryMetrics.spacingPx).toBeGreaterThan(0);

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
