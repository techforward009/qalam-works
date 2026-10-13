import { deriveDocumentTitle } from "../../tools/document-studio/utils/extractPlainText";
import { buildPdfHeaderTemplate, buildPdfFooterTemplate } from "../../tools/document-studio/utils/pdfHeaderFooter";
import { fontsForDocument } from "../../tools/document-studio/utils/pdfDocumentFonts";
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument } from "pdf-lib";
import { inspectPdfRuntimeFonts, jameelActuallyUsed } from "../../tools/document-studio/utils/pdfFontReady";
import { guardPdfUrduFonts, loadPdfUrduFace } from "../../tools/document-studio/utils/pdfUrduFontGuard";
import {
  requiredPdfEmbedFonts,
} from "../../tools/document-studio/utils/buildPdfHtml";
import type { DocNode, Direction } from "../../tools/document-studio/utils/extractPlainText";
import {
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "../../tools/document-studio/utils/documentSettings";
import { verifyPdfUrduEmbedding } from "../../tools/document-studio/utils/pdfEmbeddedFonts";
import { buildPrintDocumentHtml, readPaintedPdfFonts, requestedFontPaintMismatch } from "../../tools/document-studio/utils/printDocumentHtml";
import { preflightPdfSource } from "../../tools/document-studio/utils/pdfSourcePreflight";

interface ExportPdfRequestBody {
  doc: DocNode;
  dir: Direction;
  settings?: DocumentStudioSettings;
}

function isValidRequestBody(body: unknown): body is ExportPdfRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.doc === "object" && b.doc !== null && (b.dir === "rtl" || b.dir === "ltr");
}

export async function POST(request: NextRequest) {
  const exportStarted = Date.now();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body / غلط درخواست۔" }, { status: 400 });
  }
  if (!isValidRequestBody(body)) {
    return NextResponse.json({ error: "Invalid document data / دستاویز کا ڈیٹا غلط ہے۔" }, { status: 400 });
  }
  const { doc, dir } = body;
  const settings = parseDocumentSettings(body.settings);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    preflightPdfSource(doc);
    const resolved = await fontsForDocument(doc, dir, settings.typography);
    for (const def of requiredPdfEmbedFonts(doc, dir, settings.typography)) {
      if (def.id !== "digital-khatt-indo-pak" && def.id !== "noto-naskh-arabic") continue;
      const face = resolved.fonts.faces.find(item => item.familyName === def.pdf.familyName);
      if (!face?.complete) {
        const file = def.pdf.regularFiles?.[0]?.split("/").pop() ?? def.label;
        throw new Error(`PDF font ${def.label} could not be loaded from ${file}; export blocked. Noto Nastaliq Urdu was not substituted.`);
      }
    }
    let printed = buildPrintDocumentHtml(doc, dir, resolved.fonts, settings);
    let { html, fontsUsed, fontFallbacks } = printed;
    const substituted = fontFallbacks.filter(item => item.requested === "Digital Khatt Indo-Pak" || item.requested === "Noto Naskh Arabic");
    if (substituted.length > 0) {
      throw new Error(substituted.map(item => `PDF font ${item.requested} was not embedded; ${item.used} was not substituted; export blocked`).join(" "));
    }
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({ args: chromium.args, executablePath, headless: true });
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) req.continue();
      else req.abort();
    });
    await page.setContent(html, { waitUntil: "load" });
    if (fontsUsed.includes("Jameel Noori Nastaleeq") && !await page.evaluate(loadPdfUrduFace, "Jameel Noori Nastaleeq")) {
      printed = buildPrintDocumentHtml(doc, dir, {
        faces: resolved.fonts.faces.filter(face => face.familyName !== "Jameel Noori Nastaleeq"),
      }, settings);
      ({ html, fontsUsed, fontFallbacks } = printed);
      await page.setContent(html, { waitUntil: "load" });
    }
    const runtime = await page.evaluate(inspectPdfRuntimeFonts, fontsUsed);
    const urduFonts = await guardPdfUrduFonts(page);
    if (urduFonts.fallbackRuns > 0) {
      if (!fontsUsed.includes("Noto Nastaliq Urdu")) fontsUsed.push("Noto Nastaliq Urdu");
      fontFallbacks.push({ requested: "Runtime Urdu font", used: "Noto Nastaliq Urdu" });
    }
    const jameelFallback = fontFallbacks.some(item => item.requested === "Jameel Noori Nastaleeq") || urduFonts.fallbackRuns > 0;
    let actualFont = "unknown";
    try {
      const session = await page.createCDPSession();
      await session.send("DOM.enable");
      await session.send("CSS.enable");
      const pdfDocNode = await session.send("DOM.getDocument");
      const found = await session.send("DOM.querySelector", {
        nodeId: pdfDocNode.root.nodeId,
        selector: '[data-pdf-font="Jameel Noori Nastaleeq"]',
      });
      if (found?.nodeId) {
        const used = await session.send("CSS.getPlatformFontsForNode", { nodeId: found.nodeId });
        const names = (used?.fonts ?? []).map((f: { familyName?: string }) => f.familyName).filter(Boolean);
        if (names.length > 0) actualFont = names.join(",");
      }
    } catch {
      actualFont = "unknown";
    }
    const jameelUsed = jameelActuallyUsed(runtime, actualFont);
    if (resolved.jameelRequested) {
      console.info(
        `[pdf-jameel] requested=yes load=${resolved.jameelLoad} used=${jameelUsed ? "yes" : "no"} fallback=${jameelFallback ? "yes" : "no"} fontsReady=${runtime.allRequestedFontsReady ? "yes" : "no"} faces=${runtime.jameelFaceCount} loaded=${runtime.jameelLoadedFaceCount} loadResults=${runtime.jameelLoadResultCount} actual=${actualFont}`,
      );
    }
    const layout = printed.layout;
    const painted = await readPaintedPdfFonts(page, fontsUsed);
    const mismatch = requestedFontPaintMismatch(fontsUsed, painted);
    if (mismatch) throw new Error(mismatch);
    const headerFooter = settings.headerFooter.headerEnabled || settings.headerFooter.footerEnabled;
    const pdfUint8Array = await page.pdf({
      preferCSSPageSize: true,
      scale: 1,
      printBackground: true,
      displayHeaderFooter: headerFooter,
      headerTemplate: buildPdfHeaderTemplate(settings, doc),
      footerTemplate: buildPdfFooterTemplate(settings),
      margin: {
        top: `${layout.margins.topMm}mm`,
        bottom: `${layout.margins.bottomMm}mm`,
        left: "0mm",
        right: "0mm",
      },
    });
    const pdfDoc = await PDFDocument.load(pdfUint8Array);
    pdfDoc.setTitle(deriveDocumentTitle(doc));
    pdfDoc.setCreator("Qalam Works");
    pdfDoc.setProducer("Qalam Works PDF Export");
    if (fontsUsed.length > 0) pdfDoc.setKeywords(fontsUsed);
    const pageCount = pdfDoc.getPageCount();
    const finalBytes = await pdfDoc.save();
    const embeddedFonts = verifyPdfUrduEmbedding(await PDFDocument.load(finalBytes), urduFonts.actualFamilies);
    const pdfBuffer = Buffer.from(finalBytes);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="qalam-document.pdf"',
        "X-Pdf-Page-Count": String(pageCount),
        "X-Pdf-Layout": "print",
        "X-Pdf-Printable-Width": String(layout.contentWidthMm * 96 / 25.4),
        "X-Pdf-Visual-Lines": "native",
        "X-Pdf-Staging-Height": "0",
        "X-Pdf-Measurement-Screenshots": "0",
        "X-Pdf-Measurement-Ms": "0",
        "X-Pdf-Export-Ms": String(Date.now() - exportStarted),
        "X-Pdf-File-Size-Bytes": String(pdfBuffer.length),
        "X-Pdf-Fonts-Used": JSON.stringify(fontsUsed),
        "X-Pdf-Embedded-Fonts": JSON.stringify(embeddedFonts),
        "X-Pdf-Font-Fallbacks": JSON.stringify(fontFallbacks),
        "X-Pdf-Jameel-Requested": resolved.jameelRequested ? "yes" : "no",
        "X-Pdf-Jameel-Load": resolved.jameelLoad,
        "X-Pdf-Jameel-Used": jameelUsed ? "yes" : "no",
        "X-Pdf-Fonts-Ready": runtime.allRequestedFontsReady ? "yes" : "no",
        "X-Pdf-Urdu-Fallback-Runs": String(urduFonts.fallbackRuns),
        "X-Pdf-Urdu-Actual-Fonts": JSON.stringify(urduFonts.actualFamilies),
        "X-Pdf-Jameel-Face-Count": String(runtime.jameelFaceCount),
        "X-Pdf-Jameel-Loaded-Faces": String(runtime.jameelLoadedFaceCount),
        "X-Pdf-Jameel-Load-Results": String(runtime.jameelLoadResultCount),
        "X-Pdf-Jameel-Actual-Font": actualFont,
      },
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    const blocked = err instanceof Error && err.message.endsWith("export blocked") ? err.message : null;
    return NextResponse.json({ error: blocked ?? "PDF بنانے میں خرابی ہوئی / Failed to generate PDF." }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
