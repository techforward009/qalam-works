export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { PDFDocument } from "pdf-lib";
import {
  buildPdfHtml,
  requiredPdfEmbedFonts,
  type PdfFonts,
  type PdfFontFace,
} from "../../tools/document-studio/utils/buildPdfHtml";
import type { DocNode, Direction } from "../../tools/document-studio/utils/extractPlainText";
import {
  defaultDocumentSettings,
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "../../tools/document-studio/utils/documentSettings";
import { resolvePageLayout, puppeteerPaperFormat, resolvePhysicalMargins } from "../../tools/document-studio/utils/pageLayout";
import { STUDIO_FONTS } from "../../tools/document-studio/utils/fontRegistry";

let cachedFaces: Map<string, PdfFontFace> | null = null;

function readBase64(relPath: string): string | null {
  const full = path.join(process.cwd(), "node_modules", relPath);
  if (!existsSync(full)) {
    console.warn("PDF font missing:", relPath);
    return null;
  }
  return readFileSync(full).toString("base64");
}

/**
 * Load every declared subset. A family is `complete` only when ALL
 * declared regular files (and bold files, if any were declared) load.
 * Incomplete families are kept out of the available set so buildPdfHtml
 * falls back deterministically instead of partial browser fallback.
 */
function loadAllBundledFaces(): Map<string, PdfFontFace> {
  if (cachedFaces) return cachedFaces;
  const map = new Map<string, PdfFontFace>();
  for (const def of STUDIO_FONTS) {
    if (!def.pdf.embedded || !def.pdf.familyName || !def.pdf.regularFiles?.length) continue;
    const declaredRegular = def.pdf.regularFiles.length;
    const declaredBold = def.pdf.boldFiles?.length ?? 0;
    const regularSources: string[] = [];
    for (const f of def.pdf.regularFiles) {
      const b = readBase64(f);
      if (b) regularSources.push(b);
    }
    const boldSources: string[] = [];
    for (const f of def.pdf.boldFiles ?? []) {
      const b = readBase64(f);
      if (b) boldSources.push(b);
    }
    const complete =
      regularSources.length === declaredRegular &&
      (declaredBold === 0 || boldSources.length === declaredBold) &&
      regularSources.length > 0;

    if (!complete) {
      console.warn(
        `PDF font incomplete: ${def.pdf.familyName} regular ${regularSources.length}/${declaredRegular} bold ${boldSources.length}/${declaredBold}`
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

function fontsForDocument(doc: DocNode, dir: Direction, typography?: DocumentStudioSettings["typography"]): PdfFonts {
  const all = loadAllBundledFaces();
  const needed = requiredPdfEmbedFonts(doc, dir, typography);
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
  // Always include direction default for fallback capacity
  const fallbackName = dir === "ltr" ? "Inter" : "Noto Nastaliq Urdu";
  if (!seen.has(fallbackName) && all.has(fallbackName)) {
    faces.push(all.get(fallbackName)!);
  }
  return { faces };
}

interface ExportPdfRequestBody {
  doc: DocNode;
  dir: Direction;
  settings?: DocumentStudioSettings;
}

function isValidRequestBody(body: unknown): body is ExportPdfRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.doc === "object" &&
    b.doc !== null &&
    (b.dir === "rtl" || b.dir === "ltr")
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body / غلط درخواست۔" },
      { status: 400 }
    );
  }

  if (!isValidRequestBody(body)) {
    return NextResponse.json(
      { error: "Invalid document data / دستاویز کا ڈیٹا غلط ہے۔" },
      { status: 400 }
    );
  }

  const { doc, dir } = body;
  const settings = parseDocumentSettings(body.settings);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    const fonts = fontsForDocument(doc, dir, settings.typography);
    const { html, fontsUsed, fontFallbacks } = buildPdfHtml(doc, dir, fonts, settings.typography);

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.url().startsWith("data:")) req.continue();
      else req.abort();
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (document as any).fonts?.ready;
    });

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
        // Batch 16B — document-level direction only (not per-paragraph).
        left: `${resolvePhysicalMargins(layout.margins, dir).leftMm}mm`,
        right: `${resolvePhysicalMargins(layout.margins, dir).rightMm}mm`,
      },
      displayHeaderFooter: settings.headerFooter.headerEnabled || settings.headerFooter.footerEnabled,
      headerTemplate: settings.headerFooter.headerEnabled
        ? `<div style="font-size:9px;width:100%;text-align:center;color:#444;padding:0 15mm;"></div>`
        : "<div></div>",
      footerTemplate:
        settings.headerFooter.footerEnabled && settings.headerFooter.pageNumbers !== "none"
          ? settings.headerFooter.pageNumbers === "current"
            ? `<div style="font-size:9px;width:100%;text-align:center;color:#444;"><span class="pageNumber"></span></div>`
            : `<div style="font-size:9px;width:100%;text-align:center;color:#444;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`
          : "<div></div>",
    });

    const pdfDoc = await PDFDocument.load(pdfUint8Array);
    pdfDoc.setTitle("Qalam Works Document");
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
      },
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    return NextResponse.json(
      { error: "PDF بنانے میں خرابی ہوئی / Failed to generate PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
