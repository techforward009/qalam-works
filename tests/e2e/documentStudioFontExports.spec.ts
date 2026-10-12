import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

const cases = [
  { family: "Alvi Nastaleeq", expected: "AlviNastaleeq" },
  { family: "Jameel Noori Nastaleeq", expected: "JameelNooriNastaleeq" },
  { family: "Gulzar", expected: "Gulzar" },
  { family: "Noto Nastaliq Urdu", expected: "NotoNastaliqUrdu" },
] as const;
const sample = "یہ قلم ورکس کے اردو فونٹ کی جانچ ہے۔";
const reportDir = path.resolve("test-results/font-export-audit");
mkdirSync(reportDir, { recursive: true });
const compact = (v: string) => v.replace(/^[A-Z]{6}\+/, "").replace(/#[0-9a-f]{2}/gi, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const content = async (download: { createReadStream(): Promise<NodeJS.ReadableStream | null> }) => {
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Download stream was empty");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

function inspectPdf(pdf: PDFDocument) {
  const fonts: Array<{ name: string; embedded: boolean; unicode: boolean }> = [];
  for (const page of pdf.getPages()) {
    const resources = page.node.Resources()?.lookup(PDFName.of("Font"));
    if (!(resources instanceof PDFDict)) continue;
    for (const [, ref] of resources.entries()) {
      const font = pdf.context.lookup(ref);
      if (!(font instanceof PDFDict)) continue;
      const name = font.get(PDFName.of("BaseFont"))?.toString().replace(/^\//, "") ?? "";
      const descend = font.lookup(PDFName.of("DescendantFonts"));
      const descendant = descend instanceof PDFArray ? descend.lookup(0) : font;
      const descriptor = descendant instanceof PDFDict ? descendant.lookup(PDFName.of("FontDescriptor")) : null;
      const embedded = descriptor instanceof PDFDict && ["FontFile","FontFile2","FontFile3"].some(key => {
        const obj = descriptor.lookup(PDFName.of(key));
        return obj instanceof PDFRawStream && obj.getContentsSize() > 0;
      });
      fonts.push({ name, embedded, unicode: font.lookup(PDFName.of("ToUnicode")) instanceof PDFRawStream });
    }
  }
  return fonts;
}

for (const [index, entry] of cases.entries()) {
  test(`PDF and DOCX retain selected Urdu font: ${entry.family}`, async ({ page }) => {
    test.setTimeout(175_000);
    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "ur"));
    await page.goto("/tools/document-studio");
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeEditable();
    await expect(page.locator('[data-studio-save-status="saved"]')).toBeAttached({timeout: 15_000});
    await editor.fill(sample);
    await editor.press("ControlOrMeta+A");
    const select = page.locator('[data-studio-font-family="true"]');
    await select.selectOption(entry.family);
    await expect(editor.locator('span[style*="font-family"]').first()).toBeVisible();
    await expect(select).toHaveValue(entry.family);
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.screenshot({ path: path.join(reportDir, `${index+1}-${entry.expected}-editor.png`), fullPage: false });

    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    const [wordDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('[data-menu-action="file.downloadDocx"]').click(),
    ]);
    const wordBytes = await content(wordDownload);
    writeFileSync(path.join(reportDir, `${index+1}-${entry.expected}-document.docx`), wordBytes);
    const zip = await JSZip.loadAsync(wordBytes);
    const xml = await zip.file("word/document.xml")?.async("text");
    if (!xml) throw new Error("Missing document.xml");
    const docxRunFonts = [...xml.matchAll(/<w:rFonts[^>]+>/g)].map(m => m[0]);
    const docxFamilyFound = docxRunFonts.some(run => run.includes(`w:cs="${entry.family}"`));

    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-submenu="file.download"]').hover();
    const responsePromise = page.waitForResponse(r => r.url().includes("/api/export-pdf") && r.request().method() === "POST", {timeout: 120_000});
    const downloadPromise = page.waitForEvent("download", {timeout: 120_000}).catch(() => null);
    await page.locator('[data-menu-action="file.downloadPdf"]').click();
    const response = await responsePromise;
    let pdfFonts: ReturnType<typeof inspectPdf> = [];
    let pdfBytes = Buffer.alloc(0);
    if (response.status() === 200) {
      const downloaded = await downloadPromise;
      if (!downloaded) throw new Error("Missing PDF download");
      pdfBytes = await content(downloaded);
      writeFileSync(path.join(reportDir, `${index+1}-${entry.expected}-document.pdf`), pdfBytes);
      pdfFonts = inspectPdf(await PDFDocument.load(pdfBytes));
    } else {
      // An HTTP failure sends no download event; skip its timeout.
    }
    const pdfMatch = pdfFonts.find(f => compact(f.name).includes(compact(entry.expected)));
    const fallbacks = response.headers()["x-pdf-font-fallbacks"] ?? "[]";
    const audit = {
      family: entry.family,
      pdfStatus: response.status(),
      docxBytes: wordBytes.length,
      pdfBytes: pdfBytes.length,
      docxFamilyFound,
      docxRunFonts,
      pdfMatch,
      pdfFonts,
      pdfReportedFonts: response.headers()["x-pdf-fonts-used"] ?? null,
      pdfFallbacks: fallbacks,
      pdfActualUrduFonts: response.headers()["x-pdf-urdu-actual-fonts"] ?? null,
    };
    writeFileSync(path.join(reportDir, `${index+1}-${entry.expected}-report.json`), JSON.stringify(audit, null, 2));
    console.log("[font-export-audit]", JSON.stringify({family:entry.family,docx:docxFamilyFound,pdfStatus:response.status(),pdfMatch,fallbacks}));
    expect(docxFamilyFound, "DOCX should retain the selected font in a text run").toBe(true);
    expect(response.status(), "PDF generation must succeed").toBe(200);
    expect(pdfMatch, "Final PDF must contain the requested embedded font, not a fallback").toBeDefined();
    expect(pdfMatch?.embedded, "Selected PDF font program must be embedded").toBe(true);
    expect(pdfMatch?.unicode, "Selected PDF font must have ToUnicode mapping").toBe(true);
  });
}
