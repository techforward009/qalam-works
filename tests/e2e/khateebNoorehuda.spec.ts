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
