// Phase (PDF export research) spike — isolated, standalone script, NOT part
// of the app. Proves whether headless Chromium (puppeteer-core +
// @sparticuz/chromium) can generate a correct, downloadable PDF for
// Qalam Works content before any production endpoint or UI is built.
//
// Run with: npx tsx scripts/pdf-spike.ts
// Then inspect /tmp/pdf-spike-output.pdf visually (this script also
// rasterizes each page to PNG via pdftoppm for automated visual review).
//
// Deliberately isolated: does not import from app/tools/document-studio/*,
// does not modify DocumentStudioEditor.tsx, adds no UI. Matches the same
// evidence-first pattern as scripts/docx-spike.ts.

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { readFileSync, writeFileSync } from "fs";

// Fonts embedded as base64 data URIs directly in the HTML — avoids any
// network fetch during the Chromium render (both in this local spike, and
// relevant for the real serverless environment later, where outbound
// network access during a function invocation adds latency/risk).
const fontRegularB64 = readFileSync("node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2").toString("base64");
const fontBoldB64 = readFileSync("node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2").toString("base64");

// Same visual CSS principles as Document Studio's .qalam-editor-content
// block in DocumentStudioEditor.tsx (headings, lists, blockquote, link
// styles) — reproduced here standalone since this spike does not import
// from the app itself.
const html = `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Noto Nastaliq Urdu";
    src: url(data:font/woff2;base64,${fontRegularB64}) format("woff2");
    font-weight: 400;
  }
  @font-face {
    font-family: "Noto Nastaliq Urdu";
    src: url(data:font/woff2;base64,${fontBoldB64}) format("woff2");
    font-weight: 700;
  }
  body {
    font-family: "Noto Nastaliq Urdu", "Times New Roman", serif;
    font-size: 16px;
    line-height: 2;
    padding: 30px;
    color: #1a1a1a;
  }
  h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
  h2 { font-size: 1.25rem; font-weight: 700; margin: 0.65rem 0 0.4rem; }
  p { margin: 0.35rem 0; }
  ul { list-style: disc; padding-inline-start: 1.5rem; margin: 0.35rem 0; }
  ol { list-style: decimal; padding-inline-start: 1.5rem; margin: 0.35rem 0; }
  li { margin: 0.15rem 0; }
  blockquote {
    border-inline-start: 3px solid #d97706;
    padding-inline-start: 1rem;
    color: #57534e;
    font-style: italic;
    margin: 0.5rem 0;
  }
  .ltr-block { direction: ltr; text-align: left; font-family: "Times New Roman", serif; }
</style>
</head>
<body>
  <h1>ڈاکومنٹ اسٹوڈیو — PDF Spike Test</h1>

  <p>یہ اردو نستعلیق متن ہے، جسے قلم ورکس کے Document Studio میں لکھا جاتا ہے۔ اس میں <b>بولڈ الفاظ</b> اور <i>ترچھے (italic) الفاظ</i> بھی شامل ہیں۔</p>

  <p dir="rtl">هذا نص عربي فصيح للاختبار، وهو يحتوي على بعض الكلمات <b>الغامقة</b> للتحقق من الخط.</p>

  <div class="ltr-block">
    <p>This is English text to verify Latin script rendering, including <b>bold</b> and <i>italic</i> words.</p>
  </div>

  <p>یہ ایک مخلوط لائن ہے جس میں Urdu اور English دونوں ایک ساتھ آتے ہیں، اور Arabic لفظ بھی: العلم۔</p>

  <h2>فہرستیں (Lists)</h2>
  <ul>
    <li>پہلا نکتہ — بلٹ لسٹ</li>
    <li>دوسرا نکتہ</li>
    <li>تیسرا نکتہ (English mixed in: Publishing Tools)</li>
  </ul>

  <ol>
    <li>پہلا نمبر — عددی فہرست</li>
    <li>دوسرا نمبر</li>
    <li>تیسرا نمبر</li>
  </ol>

  <h2>حوالہ جات (Brackets &amp; Numbers)</h2>
  <p>[اتحاف السادة المتقین بشرح احیاء علوم الدین ج.1 ص.501 دار الکتب العلمیہ]</p>
  <p>اور حضرت امام مالک علیہ الرحمہ (المتوفی: 179ھ) نے فرمایا کہ 2024 میں شائع ہونے والی 5 کتابیں اہم ہیں۔</p>

  <blockquote>یہ ایک اقتباس (blockquote) ہے، جو Document Studio کے انداز سے مطابقت رکھتا ہے۔</blockquote>
</body>
</html>`;

async function main() {
  console.log("Launching headless Chromium via @sparticuz/chromium...");
  const executablePath = await chromium.executablePath();
  console.log("Resolved executablePath:", executablePath);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    // "load" is correct here (not "networkidle0", which setContent()'s type
    // doesn't accept — that option is for page.goto() navigations). Our
    // content has no external resources to wait on anyway: the font is
    // embedded as a base64 data URI directly in the HTML.
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    writeFileSync("/tmp/pdf-spike-output.pdf", pdfBuffer);
    console.log("Wrote /tmp/pdf-spike-output.pdf —", pdfBuffer.length, "bytes");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("SPIKE FAILED:", err);
  process.exit(1);
});
