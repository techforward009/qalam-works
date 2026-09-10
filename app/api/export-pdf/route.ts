export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument } from "pdf-lib";
import { inspectPdfRuntimeFonts, jameelActuallyUsed } from "../../tools/document-studio/utils/pdfFontReady";
import {
  applyJameelFace,
  resolveRequestScopedJameelFace,
} from "../../tools/document-studio/utils/pdfJameelRequest";
import {
  buildPdfHtml,
  requiredPdfEmbedFonts,
  type PdfFonts,
  type PdfFontFace,
} from "../../tools/document-studio/utils/buildPdfHtml";
import type { DocNode, Direction } from "../../tools/document-studio/utils/extractPlainText";
import { deriveDocumentTitle } from "../../tools/document-studio/utils/extractPlainText";
import {
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "../../tools/document-studio/utils/documentSettings";
import { resolvePageLayout, puppeteerPaperFormat, resolvePhysicalMargins } from "../../tools/document-studio/utils/pageLayout";
import { STUDIO_FONTS } from "../../tools/document-studio/utils/fontRegistry";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function safeDir(text: string): string {
  return /^[\x20-\x7E]*$/.test(text) ? "ltr" : "auto";
}

const HF_STYLE = "font-family:Arial,Tahoma,sans-serif;font-size:9px;color:#444;width:100%;padding:0 10mm;box-sizing:border-box;";

export function buildPdfHeaderTemplate(settings: DocumentStudioSettings, doc: DocNode): string {
  if (!settings.headerFooter.headerEnabled) return "<div></div>";
  const text =
    settings.headerFooter.headerMode === "custom" && settings.headerFooter.headerText
      ? settings.headerFooter.headerText
      : deriveDocumentTitle(doc);
  const d = safeDir(text);
  return `<div dir="${d}" style="${HF_STYLE}text-align:center;">${escapeHtml(text)}</div>`;
}

export function buildPdfFooterTemplate(settings: DocumentStudioSettings): string {
  if (!settings.headerFooter.footerEnabled) return "<div></div>";
  const { footerText, pageNumbers } = settings.headerFooter;
  const hasText = footerText.trim().length > 0;
  const hasNumbers = pageNumbers !== "none";
  if (!hasText && !hasNumbers) return "<div></div>";
  const pageSpan =
    pageNumbers === "current"
      ? `<span class="pageNumber"></span>`
      : `<span class="pageNumber"></span> / <span class="totalPages"></span>`;
  if (!hasText) return `<div style="${HF_STYLE}text-align:center;">${pageSpan}</div>`;
  if (!hasNumbers) {
    const d = safeDir(footerText);
    return `<div dir="${d}" style="${HF_STYLE}text-align:center;">${escapeHtml(footerText)}</div>`;
  }
  const d = safeDir(footerText);
  return `<div dir="${d}" style="${HF_STYLE}display:flex;justify-content:space-between;align-items:center;"><span>${escapeHtml(footerText)}</span><span>${pageSpan}</span></div>`;
}

let cachedFaces: Map<string, PdfFontFace> | null = null;

function resolveLocalFontPath(relPath: string): string | null {
  const cwd = process.cwd();
  let full: string;
  if (relPath.startsWith("assets/fonts/")) {
    const filename = path.basename(relPath.slice("assets/fonts/".length));
    if (!filename || filename.includes("..")) return null;
    full = path.join(cwd, "assets", "fonts", filename);
    const root = path.join(cwd, "assets", "fonts");
    if (!full.startsWith(root + path.sep) && full !== root) return null;
  } else {
    full = path.join(cwd, "node_modules", relPath);
    const root = path.join(cwd, "node_modules");
    if (!full.startsWith(root + path.sep) && full !== root) {
      console.warn("[pdf-font] Path outside approved root, skipping:", relPath);
      return null;
    }
  }
  return full;
}

function readBase64Sync(relPath: string): string | null {
  const full = resolveLocalFontPath(relPath);
  if (!full) return null;
  if (!existsSync(full)) {
    console.warn("[pdf-font] Font file missing:", relPath);
    return null;
  }
  return readFileSync(full).toString("base64");
}

async function loadAllBundledFaces(): Promise<Map<string, PdfFontFace>> {
  if (cachedFaces) return cachedFaces;
  const map = new Map<string, PdfFontFace>();
  for (const def of STUDIO_FONTS) {
    if (!def.pdf.embedded || !def.pdf.familyName || !def.pdf.regularFiles?.length) continue;
    const declaredRegular = def.pdf.regularFiles.length;
    const declaredBold = def.pdf.boldFiles?.length ?? 0;
    const isPrivateBlob = def.pdf.regularFiles.some(f => f.startsWith("private-blob:"));
    if (isPrivateBlob) continue;
    const regularSources: string[] = [];
    for (const f of def.pdf.regularFiles) {
      const b = readBase64Sync(f);
      if (b) regularSources.push(b);
    }
    const boldSources: string[] = [];
    for (const f of def.pdf.boldFiles ?? []) {
      const b = readBase64Sync(f);
      if (b) boldSources.push(b);
    }
    const complete =
      regularSources.length === declaredRegular &&
      (declaredBold === 0 || boldSources.length === declaredBold) &&
      regularSources.length > 0;
    if (!complete) {
      console.warn(
        `[pdf-font] Incomplete: ${def.pdf.familyName}` +
        ` regular ${regularSources.length}/${declaredRegular}` +
        ` bold ${boldSources.length}/${declaredBold}`,
      );
    }
    map.set(def.pdf.familyName, {
      familyName: def.pdf.familyName,
      regularSources,
      boldSources: boldSources.length > 0 ? boldSources : undefined,
      complete,
      declaredRegular,
      declaredBold,
      loadedRegular: regularSources.length,
      loadedBold: boldSources.length,
    });
  }
  cachedFaces = map;
  return map;
}

export async function fontsForDocument(
  doc: DocNode,
  dir: Direction,
  typography?: DocumentStudioSettings["typography"],
): Promise<{ fonts: PdfFonts; jameelRequested: boolean; jameelLoad: string }> {
  const needed = requiredPdfEmbedFonts(doc, dir, typography);
  const jameel = await resolveRequestScopedJameelFace(needed);
  const all = await loadAllBundledFaces();
  const faces: PdfFontFace[] = [];
  const seen = new Set<string>();
  for (const def of needed) {
    const name = def.pdf.familyName;
    if (!name || seen.has(name)) continue;
    const face = all.get(name);
    if (face) {
      faces.push(face);
      seen.add(name);
    }
  }
  const fallbackName = dir === "ltr" ? "Inter" : "Noto Nastaliq Urdu";
  if (!seen.has(fallbackName) && all.has(fallbackName)) {
    faces.push(all.get(fallbackName)!);
  }
  return {
    fonts: { faces: applyJameelFace(faces, jameel.face) },
    jameelRequested: jameel.requested,
    jameelLoad: jameel.loadReason,
  };
}

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
    const resolved = await fontsForDocument(doc, dir, settings.typography);
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(doc, dir, resolved.fonts, settings.typography);
    const jameelFallback = fontFallbacks.some((item) => item.requested === "Jameel Noori Nastaleeq");
    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({ args: chromium.args, executablePath, headless: true });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) req.continue();
      else req.abort();
    });
    await page.setContent(html, { waitUntil: "load" });
    const runtime = await page.evaluate(inspectPdfRuntimeFonts, fontsUsed);
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
    const pdfUint8Array = await page.pdf({
      format: settings.page.orientation === "portrait" ? puppeteerPaperFormat(settings.page.size) : undefined,
      width: settings.page.orientation === "landscape" ? `${layout.widthMm}mm` : undefined,
      height: settings.page.orientation === "landscape" ? `${layout.heightMm}mm` : undefined,
      printBackground: true,
      margin: {
        top: `${layout.margins.topMm}mm`,
        bottom: `${layout.margins.bottomMm}mm`,
        left: `${resolvePhysicalMargins(layout.margins, dir).leftMm}mm`,
        right: `${resolvePhysicalMargins(layout.margins, dir).rightMm}mm`,
      },
      displayHeaderFooter: settings.headerFooter.headerEnabled || settings.headerFooter.footerEnabled,
      headerTemplate: buildPdfHeaderTemplate(settings, doc),
      footerTemplate: buildPdfFooterTemplate(settings),
    });
    const pdfDoc = await PDFDocument.load(pdfUint8Array);
    pdfDoc.setTitle(deriveDocumentTitle(doc));
    pdfDoc.setCreator("Qalam Works");
    pdfDoc.setProducer("Qalam Works PDF Export");
    if (fontsUsed.length > 0) pdfDoc.setKeywords(fontsUsed);
    const pageCount = pdfDoc.getPageCount();
    const finalBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(finalBytes);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="qalam-document.pdf"',
        "X-Pdf-Page-Count": String(pageCount),
        "X-Pdf-File-Size-Bytes": String(pdfBuffer.length),
        "X-Pdf-Fonts-Used": JSON.stringify(fontsUsed),
        "X-Pdf-Font-Fallbacks": JSON.stringify(fontFallbacks),
        "X-Pdf-Jameel-Requested": resolved.jameelRequested ? "yes" : "no",
        "X-Pdf-Jameel-Load": resolved.jameelLoad,
        "X-Pdf-Jameel-Used": jameelUsed ? "yes" : "no",
        "X-Pdf-Fonts-Ready": runtime.allRequestedFontsReady ? "yes" : "no",
        "X-Pdf-Jameel-Face-Count": String(runtime.jameelFaceCount),
        "X-Pdf-Jameel-Loaded-Faces": String(runtime.jameelLoadedFaceCount),
        "X-Pdf-Jameel-Load-Results": String(runtime.jameelLoadResultCount),
        "X-Pdf-Jameel-Actual-Font": actualFont,
      },
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    return NextResponse.json({ error: "PDF بنانے میں خرابی ہوئی / Failed to generate PDF." }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
