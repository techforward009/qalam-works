// Document Studio's PDF Export v1 endpoint — visual/print quality only.
// See docs/KNOWN-LIMITATIONS.md's "PDF Export" section for the full
// investigation behind this decision: five independently-tested PDF
// engines (Chromium, WeasyPrint, LibreOffice, Typst, XeLaTeX) all failed
// at producing searchable/copyable Urdu/Arabic text; a follow-up hybrid
// invisible-text-layer approach only worked in one of five real
// extraction tools. v1 deliberately does not attempt a searchable text
// layer — this route renders and returns a plain visual PDF.
//
// Must run on the Node.js runtime (not Edge) — puppeteer-core and
// @sparticuz/chromium require a native binary the Edge runtime can't run.
export const runtime = "nodejs";
// Longer than the 10s default on some Vercel plans — Chromium cold start
// + render can approach that. See docs/KNOWN-LIMITATIONS.md for the
// Vercel "Large Functions" deployment assumption this endpoint requires
// (VERCEL_SUPPORT_LARGE_FUNCTIONS=1), needed because @sparticuz/chromium
// itself is ~67MB, over the standard function bundle limit.
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { buildPdfHtml, type PdfFonts } from "../../tools/document-studio/utils/buildPdfHtml";
import type { DocNode, Direction } from "../../tools/document-studio/utils/extractPlainText";

// Read once per cold start, not per request — these are small (a few
// hundred KB each) and never change at runtime.
let cachedFonts: PdfFonts | null = null;
function loadFonts(): PdfFonts {
  if (cachedFonts) return cachedFonts;
  const base = path.join(process.cwd(), "node_modules", "@fontsource", "noto-nastaliq-urdu", "files");
  cachedFonts = {
    nastaliqRegularBase64: readFileSync(path.join(base, "noto-nastaliq-urdu-arabic-400-normal.woff2")).toString("base64"),
    nastaliqBoldBase64: readFileSync(path.join(base, "noto-nastaliq-urdu-arabic-700-normal.woff2")).toString("base64"),
  };
  return cachedFonts;
}

interface ExportPdfRequestBody {
  doc: DocNode;
  dir: Direction;
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

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const fonts = loadFonts();
    // buildPdfHtml only ever emits tags/attributes from our own fixed set
    // (p/h1/h2/ul/ol/li/blockquote/strong/em/a/br) built from structured
    // DocNode JSON, not raw client-supplied HTML — this bounds what can
    // ever appear in the rendered page considerably before Puppeteer is
    // even involved.
    const html = buildPdfHtml(doc, dir, fonts);

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Defense in depth: block every network request during rendering.
    // Nothing in buildPdfHtml's output ever needs one (the font is
    // embedded as a base64 data URI, there's no external stylesheet,
    // script, or image) — blocking outright means a maliciously crafted
    // href or any future markup change can never turn this into an SSRF
    // vector, rather than relying solely on "we don't currently emit
    // fetchable tags."
    await page.setRequestInterception(true);
    page.on("request", (req) => req.abort());

    await page.setContent(html, { waitUntil: "load" });

    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    // page.pdf() returns a Uint8Array in this puppeteer-core version;
    // convert to a Node Buffer (safe — this route explicitly runs on the
    // Node.js runtime, not Edge) since that's a type NextResponse's
    // BodyInit accepts directly.
    const pdfBuffer = Buffer.from(pdfUint8Array);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="qalam-document.pdf"',
      },
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    return NextResponse.json(
      { error: "PDF بنانے میں خرابی ہوئی / Failed to generate PDF." },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
