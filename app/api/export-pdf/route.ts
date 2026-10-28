import { validatePrintFrames, frameTextNode } from "../../tools/document-studio/utils/printableFrames";
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
import { loadPdfUrduFace } from "../../tools/document-studio/utils/pdfUrduFontGuard";
import { guardScriptAwarePdfFonts } from "../../tools/document-studio/utils/pdfScriptAwareFontGuard";
import {
  buildPdfHtml, fontFaceCss,
} from "../../tools/document-studio/utils/buildPdfHtml";
import type { DocNode, Direction } from "../../tools/document-studio/utils/extractPlainText";
import {
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "../../tools/document-studio/utils/documentSettings";
import { resolvePageLayout, resolvePhysicalMargins } from "../../tools/document-studio/utils/pageLayout";
import { verifyPdfUrduEmbedding } from "../../tools/document-studio/utils/pdfEmbeddedFonts";
import { paginatePdfInk } from "../../tools/document-studio/utils/pdfInkPagination";
import { preflightPdfSource } from "../../tools/document-studio/utils/pdfSourcePreflight";
import { restorePdfTextRuns } from "../../tools/document-studio/utils/normalizePdfDocument";
import { clientIp, closePdfBrowser, pdfExportLimiter, type PdfExportDenied } from "./pdfExportLimiter";

interface ExportPdfRequestBody {
  doc: DocNode;
  frames?: unknown;
  dir: Direction;
  settings?: DocumentStudioSettings;
}

function isValidRequestBody(body: unknown): body is ExportPdfRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.doc === "object" && b.doc !== null && (b.dir === "rtl" || b.dir === "ltr");
}

function deniedResponse(denied: PdfExportDenied) {
  return NextResponse.json({ error: "PDF export is busy. Please try again shortly.", code: denied.code }, {
    status: denied.status,
    headers: { "Retry-After": String(denied.retryAfter), "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  const rateDenied = pdfExportLimiter.checkRate(clientIp(request.headers));
  if (rateDenied) return deniedResponse(rateDenied);
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
  const { dir } = body;
  let frames;
  try { frames = validatePrintFrames(body.frames); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const settings = parseDocumentSettings(body.settings);
  const admission = await pdfExportLimiter.acquireSlot(request.signal);
  if (!("release" in admission)) return deniedResponse(admission);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  // Leave time inside maxDuration=60 for the 10s queue and bounded shutdown.
  const renderAbort = new AbortController();
  const abort = () => renderAbort.abort();
  const renderTimer = setTimeout(abort, 40_000);
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  try {
    preflightPdfSource(body.doc);
    const doc = restorePdfTextRuns(body.doc);
    preflightPdfSource(doc, { skipByteLimit: true });
    const fontDoc = frames.length ? { ...doc, content: [...(doc.content ?? []), ...frames.filter(f => f.kind === "text").map(frameTextNode)] } : doc;
    if (frames.length) preflightPdfSource(fontDoc);
    const resolved = await fontsForDocument(fontDoc, dir, settings.typography);
    const digitalKhatt = resolved.fonts.faces.find(face => face.familyName === "Digital Khatt Indo-Pak");
    if (digitalKhatt && !digitalKhatt.complete) {
      throw new Error("PDF font Digital Khatt Indo-Pak could not be loaded from the bundled PDF compatibility face; export blocked");
    }
    let { html, fontsUsed, fontFallbacks, protectedRuns: originalRuns } = buildPdfHtml(doc, dir, resolved.fonts, settings.typography, frames);
    const executablePath = await chromium.executablePath();
    renderAbort.signal.throwIfAborted();
    browser = await puppeteer.launch({ args: chromium.args, executablePath, headless: true, signal: renderAbort.signal });
    renderAbort.signal.throwIfAborted();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) req.continue();
      else req.abort();
    });
    await page.setContent(html, { waitUntil: "load" });
    if (fontsUsed.includes("Jameel Noori Nastaleeq") && !await page.evaluate(loadPdfUrduFace, "Jameel Noori Nastaleeq")) {
      ({ html, fontsUsed, fontFallbacks, protectedRuns: originalRuns } = buildPdfHtml(doc, dir, {
        faces: resolved.fonts.faces.filter(face => face.familyName !== "Jameel Noori Nastaleeq"),
      }, settings.typography, frames));
      await page.setContent(html, { waitUntil: "load" });
    }
    // Preserve the author-supplied Unicode through HTML construction and Chromium.
    // The adapter records the exact JSON tokens assigned to Digital Khatt,
    // excluding Latin segments intentionally rendered in the English face.
    const sourceCodepoints = originalRuns.flatMap(text => Array.from(text, char => char.codePointAt(0)!));
    const htmlCodepoints = await page.evaluate(sourceHtml => {
      const parsed = new DOMParser().parseFromString(sourceHtml, "text/html");
      return Array.from(parsed.querySelectorAll('[data-pdf-font="Digital Khatt Indo-Pak"]'))
        .flatMap(el => Array.from(el.textContent ?? "", char => char.codePointAt(0)!));
    }, html);
    const chromiumCodepoints = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-pdf-font="Digital Khatt Indo-Pak"]'))
        .flatMap(el => Array.from(el.textContent ?? "", char => char.codePointAt(0)!)));
    const identical = (a: number[], b: number[]) =>
      a.length === b.length && a.every((value, index) => value === b[index]);
    if (!identical(sourceCodepoints, htmlCodepoints) ||
        !identical(sourceCodepoints, chromiumCodepoints)) {
      throw new Error("PDF protected source/HTML/Chromium Unicode mismatch; export blocked");
    }
    const runtime = await page.evaluate(inspectPdfRuntimeFonts, fontsUsed);
    const urduFonts = await guardScriptAwarePdfFonts(page, originalRuns);
    if (urduFonts.warnings.length) fontFallbacks.push({
      requested: `Digital Khatt Indo-Pak (${urduFonts.warnings.slice(0, 64).join(", ")})`,
      used: [...new Set(urduFonts.diagnostics.filter(part => part.kind === "bundled-fallback").flatMap(part => part.actualFaces.map(face => face.familyName)))].join(", ") || "editor fallback",
    });
    const afterCodepoints = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-pdf-font="Digital Khatt Indo-Pak"]'))
        .flatMap(el => Array.from(el.textContent ?? "", char => char.codePointAt(0)!)));
    if (!identical(sourceCodepoints, afterCodepoints)) {
      throw new Error("PDF font segmentation modified source Unicode; export blocked");
    }
    if (originalRuns.length) console.info("[pdf-script-safe]", JSON.stringify({
      runs: originalRuns.length,
      unicodeCodepoints: sourceCodepoints.length,
      verifiedPeriods: urduFonts.diagnostics.filter(run => run.kind === "verified-period").length,
      actualFaces: [...new Set(urduFonts.diagnostics.flatMap(run => run.actualFaces.map(face => face.familyName)))],
      sourceHtmlChromiumExact: true,
    }));
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
    const layout = resolvePageLayout({
      size: settings.page.size,
      orientation: settings.page.orientation,
      marginPreset: settings.page.margins.preset,
      customMargins: settings.page.margins,
    });
    const physical = resolvePhysicalMargins(layout.margins, dir);
    // Guarded text markup is detached before story measurement. It cannot
    // enter the ink-line count, text pagination or authored-break calculations.
    const guardedFrameHtml = frames.length ? await page.evaluate(() => {
      const source = document.querySelector("[data-pdf-frame-source]");
      const html = source ? Array.from(source.children).map(node => node.outerHTML) : [];
      source?.remove(); return html;
    }) : [];
    const inkPagination = await paginatePdfInk(
      page,
      layout.contentWidthMm,
      layout.heightMm - layout.margins.topMm - layout.margins.bottomMm,
      physical.leftMm,
      physical.rightMm,
    );
    if (frames.length) {
      const pageCount = Math.max(inkPagination.pages, ...frames.map(f => f.page));
      await page.evaluate(({ markup, frames, width, height, left, top, contentWidth, contentHeight, pageCount }) => {
        const sheets = Array.from(document.querySelectorAll<HTMLElement>("[data-pdf-ink-page]"));
        document.body.style.cssText += `;width:${width}mm;margin:0;padding:0;`;
        for (let index = 0; index < pageCount; index++) {
          const physical = document.createElement("div"); physical.dataset.pdfPhysicalPage = String(index + 1);
          physical.style.cssText = `position:relative;width:${width}mm;height:${height}mm;overflow:hidden;break-after:${index + 1 === pageCount ? "auto" : "page"};`;
          const story = sheets[index];
          if (story) { story.style.cssText += `;position:absolute;left:${left}mm;top:${top}mm;width:${contentWidth}mm;height:${contentHeight}mm;break-after:auto;`; physical.append(story); }
          const layer = document.createElement("div"); layer.style.cssText = "position:absolute;inset:0;overflow:hidden;z-index:10;";
          markup.forEach((html, i) => { if (frames[i].page === index + 1) layer.insertAdjacentHTML("beforeend", html); });
          physical.append(layer); document.body.append(physical);
        }
      }, { markup: guardedFrameHtml, frames, width: layout.widthMm, height: layout.heightMm, left: physical.leftMm, top: layout.margins.topMm, contentWidth: layout.contentWidthMm, contentHeight: layout.heightMm - layout.margins.topMm - layout.margins.bottomMm, pageCount });
      inkPagination.pages = pageCount;
    }
    const templateFonts = resolved.fonts.faces.filter(face => ["Inter", "Mehr Nastaliq Web", "Noto Nastaliq Urdu"].includes(face.familyName));
    const templateCss = fontFaceCss(templateFonts);
    await page.evaluate(async () => { await document.fonts.load('9px "Inter"'); await document.fonts.ready; });
    const digitalInkBleed = originalRuns.length > 0;
    if (digitalInkBleed && !frames.length) await page.evaluate(({ left, right }) => {
      // Native print margins clip glyphs even when CSS overflow is visible.
      // Reserve the same space inside the body instead: text anchors, wrapping
      // width and vertical pagination stay put, but ink can paint into padding.
      document.body.style.boxSizing = "content-box";
      document.body.style.paddingLeft = `${left}px`;
      document.body.style.paddingRight = `${right}px`;
    }, { left: physical.leftMm * 96 / 25.4, right: physical.rightMm * 96 / 25.4 });
    const pdfUint8Array = await page.pdf({
      width: `${layout.widthMm}mm`,
      height: `${layout.heightMm}mm`,
      scale: 1,
      preferCSSPageSize: false,
      printBackground: true,
      margin: {
        top: frames.length ? "0mm" : `${layout.margins.topMm}mm`,
        bottom: frames.length ? "0mm" : `${layout.margins.bottomMm}mm`,
        left: frames.length || digitalInkBleed ? "0mm" : `${physical.leftMm}mm`,
        right: frames.length || digitalInkBleed ? "0mm" : `${physical.rightMm}mm`,
      },
      displayHeaderFooter: settings.headerFooter.headerEnabled || settings.headerFooter.footerEnabled,
      headerTemplate: buildPdfHeaderTemplate(settings, doc, templateCss),
      footerTemplate: buildPdfFooterTemplate(settings, templateCss),
    });
    const pdfDoc = await PDFDocument.load(pdfUint8Array);
    pdfDoc.setTitle(deriveDocumentTitle(doc));
    pdfDoc.setCreator("Qalam Works");
    pdfDoc.setProducer("Qalam Works PDF Export");
    if (fontsUsed.length > 0) pdfDoc.setKeywords(fontsUsed);
    const pageCount = pdfDoc.getPageCount();
    if (pageCount !== inkPagination.pages) throw new Error("PDF page count differs from the measured ink pagination; export blocked");
    const finalBytes = await pdfDoc.save();
    const embeddedFonts = verifyPdfUrduEmbedding(await PDFDocument.load(finalBytes), urduFonts.actualFamilies);
    const pdfBuffer = Buffer.from(finalBytes);
    renderAbort.signal.throwIfAborted();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="qalam-document.pdf"',
        "X-Pdf-Page-Count": String(pageCount),
        "X-Pdf-Printable-Width": String(layout.contentWidthMm * 96 / 25.4),
        "X-Pdf-Visual-Lines": String(inkPagination.lines),
        "X-Pdf-Staging-Height": String(inkPagination.stagingHeight),
        "X-Pdf-Measurement-Screenshots": String(inkPagination.screenshots),
        "X-Pdf-Measurement-Ms": String(inkPagination.measurementMs),
        "X-Pdf-Export-Ms": String(Date.now() - exportStarted),
        "X-Pdf-File-Size-Bytes": String(pdfBuffer.length),
        "X-Pdf-Fonts-Used": JSON.stringify(fontsUsed),
        "X-Pdf-Embedded-Fonts": JSON.stringify(embeddedFonts),
        "X-Pdf-Font-Fallbacks": JSON.stringify(fontFallbacks),
        "X-Pdf-Warnings": JSON.stringify(urduFonts.warnings.slice(0, 64)),
        "X-Pdf-Jameel-Requested": resolved.jameelRequested ? "yes" : "no",
        "X-Pdf-Jameel-Load": resolved.jameelLoad,
        "X-Pdf-Jameel-Used": jameelUsed ? "yes" : "no",
        "X-Pdf-Fonts-Ready": runtime.allRequestedFontsReady ? "yes" : "no",
        "X-Pdf-Urdu-Fallback-Runs": String(urduFonts.fallbackRuns),
        "X-Pdf-Protected-Runs": String(originalRuns.length),
        "X-Pdf-Verified-Periods": String(urduFonts.diagnostics.filter(run => run.kind === "verified-period").length),
        "X-Pdf-Urdu-Actual-Fonts": JSON.stringify(urduFonts.actualFamilies),
        "X-Pdf-Jameel-Face-Count": String(runtime.jameelFaceCount),
        "X-Pdf-Jameel-Loaded-Faces": String(runtime.jameelLoadedFaceCount),
        "X-Pdf-Jameel-Load-Results": String(runtime.jameelLoadResultCount),
        "X-Pdf-Jameel-Actual-Font": actualFont,
      },
    });
  } catch (err) {
    if (renderAbort.signal.aborted) return deniedResponse({ status: 503, retryAfter: 10, code: "pdf-export-timeout" });
    console.error("PDF export failed:", err);
    const blocked = err instanceof Error && err.message.endsWith("export blocked") ? err.message : null;
    return NextResponse.json({ error: blocked ?? "PDF بنانے میں خرابی ہوئی / Failed to generate PDF." }, { status: 500 });
  } finally {
    clearTimeout(renderTimer);
    request.signal.removeEventListener("abort", abort);
    try { if (browser) await closePdfBrowser(browser); }
    finally { admission.release(); }
  }
}
