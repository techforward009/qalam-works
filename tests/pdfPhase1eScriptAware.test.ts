import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { urduAyat } from "./fixtures/digitalKhatt/aalImran";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PdfExportTestRequest as NextRequest } from "./helpers/pdfExportRequest";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { POST } from "../app/api/export-pdf/route";

const DIR = join(tmpdir(), "pdf-phase1e-evidence");
const baseArabic = "هٰذَا نَصٌّ عَرَبِيٌّ تَجْرِيبِيٌّ مَعَ الْحَرَكَاتِ وَالشَّدَّةِ وَالْمَدِّ لِفَحْصِ الطِّبَاعَةِ. ";
const style = (font: string, size = "16pt") => [{ type: "textStyle", attrs: { fontFamily: font, fontSize: size } }];
const text = (value: string, font: string, size = "16pt", extra: object[] = []) => ({ type: "text", text: value, marks: [...style(font, size), ...extra] });
const para = (value: string, font: string, size = "16pt") => ({ type: "paragraph", attrs: { dir: "rtl", textAlign: "right", lineHeight: 1.8 }, content: [text(value, font, size)] });
const doc = (content: object[]) => ({ type: "doc", content });
const settings = {
 version: 1, presetId: "default",
 page: { size: "a4", orientation: "portrait", margins: { preset: "normal", topMm: 25.4, bottomMm: 25.4, startMm: 25.4, endMm: 25.4 } },
 typography: { bodyFontSizePt: 12, lineHeight: 1.5, paragraphBeforePt: 0, paragraphAfterPt: 6, firstLineIndentMm: 0, defaultRtlFontId: "noto-nastaliq-urdu", defaultLtrFontId: "inter" },
 headerFooter: { headerEnabled: false, headerMode: "auto-title", headerText: "", footerEnabled: false, footerText: "", pageNumbers: "none" }
};
const originalDoc = doc([
 { type: "heading", attrs: { level: 2, dir: "rtl" }, content: [text("اِخْتِبَارُ الْكِتَابَةِ الْعَرَبِيَّةِ", "Amiri", "20pt")] },
 para(baseArabic.repeat(35), "Amiri"),
 para(baseArabic.repeat(23), "Digital Khatt Indo-Pak")
]);
type Case = { id: string; document: ReturnType<typeof doc>; expected: number; periods?: number; pages?: number; fault?: boolean };
const cases: Case[] = [
 { id: "punctuation-only-digital", document: doc([para("، ؛ ؟", "Digital Khatt Indo-Pak")]), expected: 200 },
 { id: "aal-imran-urdu-markers-punctuation", document: doc(urduAyat.map((value, i) => para(value + (i === 0 ? " ۝۲۶۔" : " ۝۲۷۔"), "Digital Khatt Indo-Pak"))), expected: 200 },
 { id: "naskh-punctuation-and-mark", document: doc([para("ا۔ ، ؛ ؟ ا۫", "Digital Khatt Indo-Pak")]), expected: 200 },
 { id: "unsupported-list", document: doc([para("ا😀🚀", "Digital Khatt Indo-Pak")]), expected: 500 },
 { id: "urdu-digital-aliases", document: doc([para("ی ہ ھ ک", "Digital Khatt Indo-Pak")]), expected: 200 },
 { id: "urdu-digits-aliased", document: doc([para("۰۱۲۳۴۵۶۷۸۹", "Digital Khatt Indo-Pak")]), expected: 200 },
 { id: "original-23-periods", document: originalDoc, expected: 200, periods: 23, pages: 3 },
 { id: "multiple-digital-paragraphs", document: doc([para(baseArabic,"Digital Khatt Indo-Pak"),para(baseArabic,"Digital Khatt Indo-Pak"),para(baseArabic,"Digital Khatt Indo-Pak")]), expected: 200, periods: 3 },
 { id: "nested-alternating-runs", document: doc([{ type: "paragraph", attrs: { dir: "rtl" }, content: [
   text("هٰذَا نَصٌّ. ","Digital Khatt Indo-Pak", "16pt",[{type:"bold"}]),
   text("اردو عبارت ","Gulzar"),
   text("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),
   text("English 2026 ","Inter","12pt"),
   text("وَالْحَمْدُ لِلّٰهِ. ","Digital Khatt Indo-Pak","16pt",[{type:"italic"}])
 ]}]), expected: 200, periods: 3 },
 { id: "later-arabic-substitution", document: doc([para("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),para("هٰذَا نَصٌّ عَرَبِيٌّ. ","Digital Khatt Indo-Pak")]), expected: 500, fault: true },
 { id: "quranic-naskh-later-run", document: doc([para("اَلْعِلْمُ نُورٌ. ","Digital Khatt Indo-Pak"),para("ا\u06D7 ","Digital Khatt Indo-Pak")]), expected: 200 },
 { id: "joining-control", document: doc([para("ا\u200Dب ","Digital Khatt Indo-Pak")]), expected: 200 },
 { id: "unapproved-question-mark", document: doc([para("ا? ","Digital Khatt Indo-Pak")]), expected: 500 },
 { id: "period-wrong-context", document: doc([para("ا.ا ","Digital Khatt Indo-Pak")]), expected: 500 },
 { id: "arabic-12pt", document: doc([para("هٰذَا نَصٌّ عَرَبِيٌّ. ","Digital Khatt Indo-Pak","12pt")]), expected: 200, periods: 1 },
 { id: "arabic-20pt", document: doc([para("اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ. ","Digital Khatt Indo-Pak","20pt")]), expected: 200, periods: 1 },
 { id: "urdu-jameel", document: doc([para("یہ مصنوعی اردو نستعلیق کی جانچ ہے۔ ".repeat(20),"Jameel Noori Nastaleeq")]), expected: 200 },
 { id: "persian-vazirmatn", document: doc([para("این نوشتار برای سنجش فارسی و حروف آن است. ".repeat(20),"Vazirmatn")]), expected: 200 },
 { id: "arabic-amiri", document: doc([para("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ ".repeat(20),"Amiri")]), expected: 200 }
];
describe.runIf(Boolean(process.env.QALAM_PDF_CHROMIUM))("Phase1E actual production PDF route", () => {
 const launch = puppeteer.launch.bind(puppeteer);
 let active = "";
 let fault = false;
 beforeAll(() => {
   mkdirSync(DIR, { recursive: true });
   vi.spyOn(chromium, "executablePath").mockResolvedValue(process.env.QALAM_PDF_CHROMIUM!);
   vi.spyOn(puppeteer, "launch").mockImplementation(async options => {
     const browser = await launch({ ...options, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
     const originalPage = browser.newPage.bind(browser);
     vi.spyOn(browser, "newPage").mockImplementation(async () => {
       const page = await originalPage();
       const nativeSet = page.setContent.bind(page);
       vi.spyOn(page, "setContent").mockImplementation(async (html, options) => {
         const result = await nativeSet(html, options);
         if (fault) {
           await page.$$eval('[data-pdf-font="Digital Khatt Indo-Pak"]', els => {
             const last = els.at(-1) as HTMLElement | undefined;
             if (!last) throw Error("Missing protected run in negative test");
             last.style.fontFamily = '"Liberation Serif"';
           });
         }
         return result;
       });
       const nativePdf = page.pdf.bind(page);
       vi.spyOn(page, "pdf").mockImplementation(async options => {
         if (active === "original-23-periods" || active === "aal-imran-urdu-markers-punctuation") {
           writeFileSync(join(DIR, active + "-final-dom.html"), await page.content());
           await page.screenshot({ path: join(DIR, active + "-chromium.png"), fullPage: true });
         }
         return nativePdf(options);
       });
       return page;
     });
     return browser;
   });
 });
 afterAll(() => vi.restoreAllMocks());
 it.each(cases)("$id", async fixture => {
   active = fixture.id; fault = Boolean(fixture.fault);
   const response = await POST(new NextRequest("http://localhost/api/export-pdf", {
     method: "POST", headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ doc: fixture.document, dir: "rtl", settings })
   }));
   expect(response.status, fixture.id).toBe(fixture.expected);
   if (response.status === 200) {
     const bytes = new Uint8Array(await response.arrayBuffer());
     if (fixture.id === "aal-imran-urdu-markers-punctuation") {
       const extracted = execFileSync("pdftotext", ["-", "-"], { input: bytes }).toString("utf8");
       writeFileSync(join(DIR, "aal-imran-text-layer.txt"), extracted);
       for (const char of ["ی", "ھ", "ہ", "ک", "۝", "۲", "۶", "۷", "۔"]) expect(extracted).toContain(char);
     }
     if (fixture.id === "urdu-digits-aliased") {
       const extracted = execFileSync("pdftotext", ["-", "-"], { input: bytes }).toString("utf8");
       for (const char of "۰۱۲۳۴۵۶۷۸۹") expect(extracted).toContain(char);
     }
     if (fixture.id === "naskh-punctuation-and-mark") {
       const extracted = execFileSync("pdftotext", ["-", "-"], { input: bytes }).toString("utf8");
       for (const char of ["۔", "،", "؛", "؟", "۫"]) expect(extracted).toContain(char);
     }
     const pdf = await PDFDocument.load(bytes);
     expect(pdf.getPageCount()).toBeGreaterThan(0);
     if (fixture.pages) expect(pdf.getPageCount()).toBe(fixture.pages);
     if (fixture.periods !== undefined) {
       expect(response.headers.get("x-pdf-verified-periods")).toBe(String(fixture.periods));
       expect(Number(response.headers.get("x-pdf-protected-runs"))).toBeGreaterThan(0);
     }
     expect(Math.abs(pdf.getPage(0).getWidth() - 595.92)).toBeLessThan(0.12);
     writeFileSync(join(DIR, fixture.id + ".pdf"), bytes);
     const fontResources = pdf.getPage(0).node.Resources()?.lookup(PDFName.of("Font"), PDFDict);
     expect(fontResources).toBeTruthy();
     if (fixture.id === "original-23-periods") {
       const names = pdf.getPages().flatMap(pdfPage => {
         const resources = pdfPage.node.Resources()?.lookup(PDFName.of("Font"), PDFDict);
         return resources?.entries().map(([, val]) =>
           pdf.context.lookup(val, PDFDict).get(PDFName.of("BaseFont"))?.toString() ?? "") ?? [];
       });
       expect(names.some(n => n.replace(/#[0-9a-f]{2}/gi, "").replace(/[^a-z0-9]/gi, "").toLowerCase().includes("digitalkhatt"))).toBe(true);
     }
   } else {
     const body = await response.json() as { error?: string };
     expect(body.error).toMatch(/blocked/i);
     if (fixture.id === "unsupported-list") expect(body.error).toContain("U+1F600, U+1F680");
   }
   fault = false;
 }, 150000);
});
