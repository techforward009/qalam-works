import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { BookRecord, BookSource } from "../../app/lib/knowledge/bookCorpus";
import { retrieveKnowledge } from "../../app/lib/knowledge/retrieval";
import { synthesizeKnowledgeAnswer } from "../../app/lib/knowledge/researchAnswer";

const corpus = process.env.QALAM_KAFI_CORPUS_DIR;
test.skip(!corpus, "Requires the combined Kafi and foundational corpus");
for (const locale of ["ur", "en"] as const) for (const studio of ["khateeb", "research"] as const) test(`${locale} ${studio}: Kafi reference, complete context, copy/export and draft`, async ({ page }, testInfo) => {
  const ur = locale === "ur"; const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const sources: BookSource[] = JSON.parse(await readFile(`${corpus}/manifest.json`, "utf8")).sources;
  const records: BookRecord[] = (await Promise.all(sources.map(source => readFile(`${corpus}/${source.id}.json`, "utf8").then(JSON.parse)))).flat();
  await page.route("**/api/research/auth", route => route.fulfill({ json: { authenticated: false } }));
  await page.route("**/api/khateeb/library**", route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: params.get("op") === "record" ? { record: records.find(r => r.id === params.get("id")), source: sources.find(s => s.id === params.get("sourceId")) } : { ready: true, sources, recordCount: 4978 } });
  });
  let selectedText = "";
  await page.route("**/api/knowledge/ask", async route => {
    const input = route.request().postDataJSON();
    const result = retrieveKnowledge({ ...input, sources, records, quran: [], quranSha256: "" });
    selectedText = result.passages[0]?.text ?? "";
    result.research = await synthesizeKnowledgeAnswer(result, locale, { id: "must-not-translate", draft: async () => { throw new Error("No supplied translation"); }, review: async () => { throw new Error("must not run"); } });
    return route.fulfill({ json: result });
  });
  await page.goto(`/tools/${studio}-studio`);
  await page.getByRole("button", { name: ur ? "اردو" : "ENG", exact: true }).click();
  if (studio === "khateeb") await page.getByRole("button", { name: ur ? "کتابی ذخیرہ" : "Book library", exact: true }).click();
  const assistant = page.getByTestId("knowledge-assistant");
  await assistant.getByRole("combobox", { name: ur ? "مصادر کا انتخاب" : "Source scope" }).selectOption("kafi");
  await assistant.getByRole("textbox").fill('جلد 6 حدیث 1 "باب فضل الولد"');
  await assistant.getByRole("button", { name: ur ? "سوال کے مصادر تلاش کریں" : "Find sources for this question", exact: true }).click();
  await expect(assistant.locator("article")).toHaveCount(1);
  await expect(assistant.locator("article")).toContainText(ur ? "الکافی، جلد 6" : "Al-Kafi, Volume 6");
  await expect(assistant.getByTestId("knowledge-summary-status")).toContainText(ur ? "فراہم کردہ اردو متن یا ترجمہ دستیاب نہیں" : "no supplied English prose or translation");
  await assistant.locator("article").getByRole("button").click();
  const dialog = assistant.getByRole("dialog");
  await expect(dialog).toBeVisible(); await expect(dialog).toContainText(selectedText);
  await dialog.getByRole("button", { name: ur ? "بند کریں" : "Close", exact: true }).click();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as any).kafiCopy = text; } } }));
  await assistant.getByRole("button", { name: ur ? "منتخب مواد اور حوالے نقل کریں" : "Copy selected sources", exact: true }).click();
  expect(await page.evaluate(() => (window as any).kafiCopy)).toContain(selectedText);
  expect(await page.evaluate(() => (window as any).kafiCopy)).toContain(ur ? "حدیث 1" : "Hadith 1");
  const downloadPromise = page.waitForEvent("download");
  await assistant.getByRole("button", { name: ur ? "تحقیقی فائل محفوظ کریں" : "Save research file", exact: true }).click();
  const download = await downloadPromise; const exportPath = testInfo.outputPath("kafi-research.json");
  await download.saveAs(exportPath);
  const note = JSON.parse(await readFile(exportPath, "utf8"));
  expect(note.result.passages[0].text).toBe(selectedText);
  expect(note.result.passages[0].excerpt.referenceLabelUr).toContain("حدیث 1");
  expect(note.result.research.status).toBe("missing-translation");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath(`kafi-${studio}-${locale}.png`) });
  if (studio === "khateeb") {
    await assistant.getByRole("button", { name: ur ? "منتخب مصادر سے میری مجلس بنائیں" : "Create my sermon from selected sources", exact: true }).click();
    const stored = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("qalam-khateeb-custom-v1:")).map(key => JSON.parse(localStorage[key])));
    expect(stored[0].bookExcerpts[0].referenceLabelUr).toContain("حدیث 1");
    await page.reload();
    await page.getByRole("button", { name: ur ? "میری مجلس / میرا موضوع" : "My sermon / my topic", exact: true }).click();
    await expect(page.getByTestId("custom-sermon-workspace")).toContainText(selectedText);
  }
  expect(errors).toEqual([]);
});
