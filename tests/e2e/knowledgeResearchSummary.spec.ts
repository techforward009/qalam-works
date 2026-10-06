import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { retrieveKnowledgeWithContext } from "../../app/lib/knowledge/retrieval";
import { ahmedgrafQuranReference } from "../../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { quranTranslationFor, QURAN_TRANSLATION_SOURCES } from "../../app/tools/khateeb-studio/engine/quranTranslationProvider";
import { resolvePatienceMaterials } from "../../app/tools/khateeb-studio/engine/patienceBookGuide";
import type { BookRecord, BookSource } from "../../app/lib/knowledge/bookCorpus";
const corpus = process.env.QALAM_BOOK_CORPUS_DIR;
test.skip(!corpus, "Requires the integrity-checked foundational corpus");
for (const locale of ["ur", "en"] as const) for (const studio of ["khateeb", "research"] as const) test(`${locale} ${studio}: cited summary, exact quotation, export, follow-up and saved draft`, async ({ page }, info) => {
  const ur = locale === "ur"; const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const sources: BookSource[] = JSON.parse(await readFile(`${corpus}/manifest.json`, "utf8")).sources;
  const records: BookRecord[] = (await Promise.all(sources.map(s => readFile(`${corpus}/${s.id}.json`, "utf8").then(JSON.parse)))).flat();
  const summaryText = ur ? "منتخب اصل عبارت صبر کے موضوع سے متعلق ہے۔" : "The selected original passage concerns patience.";
  let lastQuote = "";
  await page.route("**/api/research/auth", route => route.fulfill({ json: { authenticated: false } }));
  await page.route("**/api/khateeb/library**", route => {
    const url = new URL(route.request().url()); const op = url.searchParams.get("op");
    return route.fulfill({ json: op === "record" ? { record: records.find(r => r.id === url.searchParams.get("id")), source: sources.find(s => s.id === url.searchParams.get("sourceId")) } : op === "topic" ? resolvePatienceMaterials(records, sources, locale) : { ready: true, sources, recordCount: 2676 } });
  });
  await page.route("**/api/knowledge/ask", route => {
    const input = route.request().postDataJSON();
    const quran = ahmedgrafQuranReference.listAyahs().map(ayah => { const text = quranTranslationFor(ayah.surah, ayah.ayah, locale); return { ...ayah, ...(text ? { suppliedTranslation: { text, language: locale, translator: ur ? QURAN_TRANSLATION_SOURCES.ur.translatorUr : QURAN_TRANSLATION_SOURCES.en.translatorEn } } : {}) }; });
    const result = retrieveKnowledgeWithContext({ ...input, records, sources, quran, quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
    const passage = result.passages.find(p => p.collection === "nahj" && p.language === "ar") ?? result.passages[0];
    if (input.mode === "research" && passage) { lastQuote = passage.text; result.research = { status: input.question.includes("reject") ? "unverified" : "answered", claims: input.question.includes("reject") ? [] : [{ id: "claim-1", text: summaryText, citations: [{ passageId: passage.id, quote: passage.text }] }], ...(studio === "khateeb" && !input.question.includes("reject") ? { omittedClaimCount: 1 } : {}), generationId: "knowledge-e2e", createdAt: new Date().toISOString(), providerId: "test-fixture" }; }
    return route.fulfill({ json: result });
  });
  await page.goto(`/tools/${studio}-studio`); await page.getByRole("button", { name: ur ? "اردو" : "ENG", exact: true }).click();
  if (studio === "khateeb") await page.getByRole("button", { name: ur ? "کتابی ذخیرہ" : "Book library", exact: true }).click();
  const assistant = page.getByTestId("knowledge-assistant");
  await assistant.getByRole("textbox").fill(ur ? "صبر کے بارے میں کیا مواد ہے؟" : "What source passages discuss patience?");
  await assistant.getByRole("button", { name: ur ? "سوال کے مصادر تلاش کریں" : "Find sources for this question", exact: true }).click();
  const summary = assistant.getByTestId("knowledge-research-summary"); await expect(summary).toContainText(summaryText);
  if (studio === "khateeb") await expect(summary).toContainText(ur ? "یہ جزوی خلاصہ ہے" : "This is a partial summary");
  await summary.getByRole("button").first().click(); const dialog = assistant.getByRole("dialog"); await expect(dialog).toBeVisible(); await expect(dialog.locator("mark")).toHaveText(lastQuote);
  await expect(dialog.locator("mark .khateeb-muhammadi-quranic").first()).toHaveCSS("font-family", /Muhammadi Quranic/);
  await dialog.getByRole("button", { name: ur ? "بند کریں" : "Close", exact: true }).click();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as any).researchCopy = text; } } }));
  await assistant.getByRole("button", { name: ur ? "منتخب مواد اور حوالے نقل کریں" : "Copy selected sources", exact: true }).click();
  const copied = await page.evaluate(() => (window as any).researchCopy); expect(copied).toContain(summaryText); expect(copied).toContain(lastQuote); expect(copied).not.toContain(".docx"); if (studio === "khateeb") expect(copied).toContain(ur ? "جزوی خلاصہ" : "Partial summary");
  const downloaded = page.waitForEvent("download"); await assistant.getByRole("button", { name: ur ? "تحقیقی فائل محفوظ کریں" : "Save research file", exact: true }).click();
  const file = await downloaded; const data = JSON.parse(await readFile((await file.path())!, "utf8")); expect(data.format).toBe("qalam-knowledge-note"); expect(data.result.research.claims[0].text).toBe(summaryText); expect(data.result.research.claims[0].citations[0].quote).toBe(lastQuote);
  await assistant.getByRole("button", { name: ur ? "اسی موضوع پر مزید سوال" : "Ask a follow-up on this topic", exact: true }).click(); await expect(assistant.getByRole("textbox")).toBeFocused();
  await assistant.getByRole("textbox").fill(ur ? "اس کا عملی تعلق واضح کریں" : "Explain its practical application");
  await assistant.getByRole("button", { name: ur ? "سوال کے مصادر تلاش کریں" : "Find sources for this question", exact: true }).click(); await expect(summary).toContainText(summaryText);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await summary.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`${studio}-${locale}-summary.png`) });
  if (studio === "khateeb") {
    await assistant.getByRole("button", { name: ur ? "منتخب مصادر سے میری مجلس بنائیں" : "Create my sermon from selected sources", exact: true }).click();
    const workspace = page.getByTestId("custom-sermon-workspace"); await expect(workspace).toBeVisible();
    const stored = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("qalam-khateeb-custom-v1:")).map(k => JSON.parse(localStorage[k])));
    expect(stored[0].sections.find((s: {kind:string}) => s.kind === "editorial-bridge").provenance).toBe("editorial"); expect(stored[0].sections.find((s: {kind:string}) => s.kind === "editorial-bridge").userText).toContain(summaryText);
    await page.reload(); await page.getByRole("button", { name: ur ? "میری مجلس / میرا موضوع" : "My sermon / my topic", exact: true }).click();
    await page.evaluate(() => { window.print = () => {}; });
    await workspace.getByRole("button", { name: ur ? "مسودہ پرنٹ کریں / PDF محفوظ کریں" : "Print draft / Save PDF", exact: true }).click();
    await expect(page.locator("#khateeb-custom-print-area")).toContainText(summaryText); await expect(page.locator("#khateeb-custom-print-area")).toContainText(lastQuote);
    const pdf = await page.pdf({ path: info.outputPath(`${locale}-research-sermon.pdf`), format: "A4", printBackground: true }); expect(pdf.length).toBeGreaterThan(5000);
  } else {
    await assistant.getByRole("textbox").fill(ur ? "صبر reject" : "patience reject");
    await assistant.getByRole("button", { name: ur ? "سوال کے مصادر تلاش کریں" : "Find sources for this question", exact: true }).click();
    await expect(assistant.getByTestId("knowledge-summary-status")).toBeVisible(); await expect(summary).toHaveCount(0); expect(await assistant.locator("article").count()).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
