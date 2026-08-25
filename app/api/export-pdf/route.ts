export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";
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
import { deriveDocumentTitle } from "../../tools/document-studio/utils/extractPlainText";
import {
  defaultDocumentSettings,
  parseDocumentSettings,
  type DocumentStudioSettings,
} from "../../tools/document-studio/utils/documentSettings";
import { resolvePageLayout, puppeteerPaperFormat, resolvePhysicalMargins } from "../../tools/document-studio/utils/pageLayout";
import { STUDIO_FONTS } from "../../tools/document-studio/utils/fontRegistry";

// ── PDF header/footer template helpers ───────────────────────────────────────
// Chromium header/footer templates run in a separate renderer context;
// they do NOT automatically share page body styles or embedded fonts.
// We use system-safe fonts (Arial/Tahoma for Arabic script, sans-serif
// otherwise) and `dir="auto"` for direction. No remote resources are fetched.

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Deterministic safe direction: Latin-only text is always ltr. */
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

  if (!hasText) {
    return `<div style="${HF_STYLE}text-align:center;">${pageSpan}</div>`;
  }
  if (!hasNumbers) {
    const d = safeDir(footerText);
    return `<div dir="${d}" style="${HF_STYLE}text-align:center;">${escapeHtml(footerText)}</div>`;
  }
  // Text at one side, number at the other — use flex to keep them both visible.
  const d = safeDir(footerText);
  return `<div dir="${d}" style="${HF_STYLE}display:flex;justify-content:space-between;align-items:center;"><span>${escapeHtml(footerText)}</span><span>${pageSpan}</span></div>`;
}

// ─────────────────────────────────────────────────────────────────────────────

let cachedFaces: Map<string, PdfFontFace> | null = null;

// ── Private-blob integrity constants ─────────────────────────────────────────

/**
 * SHA-256 of the approved Jameel Noori Nastaleeq WOFF2 binary.
 * Computed at conversion time from the licensed TTF source.
 * Neither the font binary nor this hash constitutes a secret — it is an
 * integrity fingerprint only, verifying that whatever was fetched is the
 * exact approved file and has not been tampered with.
 */
const JAMEEL_APPROVED_SHA256 =
  "d12978f4398f1f788d65fa7ccb872cf0e1c43aef89166816243e94487d9cee27";

/** Reasonable upper-bound for a downloaded private font (8 MB). */
const PRIVATE_BLOB_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// ── Approved path roots ───────────────────────────────────────────────────────

/**
 * Resolve a @fontsource (node_modules) or assets/fonts path to an absolute
 * filesystem path, with traversal protection.
 * Returns null if the path would escape its approved root.
 */
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

function sha256hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Read a local or @fontsource font file as base64.
 * Returns null if the file is missing or the path is disallowed.
 */
function readBase64Sync(relPath: string): string | null {
  const full = resolveLocalFontPath(relPath);
  if (!full) return null;
  if (!existsSync(full)) {
    console.warn("[pdf-font] Font file missing:", relPath);
    return null;
  }
  return readFileSync(full).toString("base64");
}

/**
 * Load a `private-blob:<filename>` font source.
 *
 * Loading order:
 *   1. Local dev override — assets/fonts/<filename> if it exists on disk.
 *      Allows local testing without uploading to Blob.
 *   2. Production private Blob — fetched via JAMEEL_FONT_BLOB_URL +
 *      Authorization: Bearer <BLOB_READ_WRITE_TOKEN>.
 *
 * In both cases SHA-256 is verified against the approved fingerprint
 * before the bytes are returned.  Returns null on any failure so the
 * Noto Nastaliq fallback can take over gracefully.
 */
async function loadPrivateBlob(filename: string): Promise<string | null> {
  const cwd = process.cwd();

  // ── A: Local dev override ─────────────────────────────────────────────────
  const localPath = path.join(cwd, "assets", "fonts", path.basename(filename));
  if (existsSync(localPath)) {
    const buf = readFileSync(localPath);
    const hash = sha256hex(buf);
    if (hash !== JAMEEL_APPROVED_SHA256) {
      console.warn("[pdf-font] Integrity mismatch (local):", filename);
      return null;
    }
    return buf.toString("base64");
  }

  // ── B: Production private Blob ────────────────────────────────────────────
  const blobUrl = process.env.JAMEEL_FONT_BLOB_URL;
  const token   = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobUrl || !token) {
    // Silently degrade — Noto fallback will be used
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(blobUrl);
  } catch {
    console.warn("[pdf-font] JAMEEL_FONT_BLOB_URL is not a valid URL");
    return null;
  }

  if (parsedUrl.protocol !== "https:") {
    console.warn("[pdf-font] JAMEEL_FONT_BLOB_URL must use https");
    return null;
  }

  if (!parsedUrl.hostname.endsWith(".private.blob.vercel-storage.com")) {
    console.warn("[pdf-font] JAMEEL_FONT_BLOB_URL hostname not allowed");
    return null;
  }

  let arrayBuf: ArrayBuffer;
  try {
    const res = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[pdf-font] Blob fetch failed:", res.status);
      return null;
    }
    // Size guard before buffering
    const contentLen = res.headers.get("content-length");
    if (contentLen && parseInt(contentLen, 10) > PRIVATE_BLOB_MAX_BYTES) {
      console.warn("[pdf-font] Blob response too large, rejecting");
      return null;
    }
    arrayBuf = await res.arrayBuffer();
  } catch {
    console.warn("[pdf-font] Blob fetch error");
    return null;
  }

  const buf = Buffer.from(arrayBuf);
  if (buf.byteLength > PRIVATE_BLOB_MAX_BYTES) {
    console.warn("[pdf-font] Downloaded font exceeds size cap, rejecting");
    return null;
  }

  const hash = sha256hex(buf);
  if (hash !== JAMEEL_APPROVED_SHA256) {
    console.warn("[pdf-font] Integrity mismatch (blob):", filename);
    return null;
  }

  return buf.toString("base64");
}

/**
 * Load every declared font subset asynchronously.
 *
 * @fontsource paths are read synchronously (local node_modules files).
 * private-blob: paths are fetched asynchronously (local dev override or Blob).
 *
 * A family is `complete` only when ALL declared regular files load successfully.
 * Incomplete families are excluded so buildPdfHtml falls back deterministically.
 *
 * The result is cached on warm Lambda instances.  Private-blob failures are
 * NOT cached — a later request is allowed to retry.
 */
async function loadAllBundledFaces(): Promise<Map<string, PdfFontFace>> {
  if (cachedFaces) return cachedFaces;

  const map = new Map<string, PdfFontFace>();

  for (const def of STUDIO_FONTS) {
    if (!def.pdf.embedded || !def.pdf.familyName || !def.pdf.regularFiles?.length) continue;

    const declaredRegular = def.pdf.regularFiles.length;
    const declaredBold    = def.pdf.boldFiles?.length ?? 0;
    const isPrivateBlob   = def.pdf.regularFiles.some(f => f.startsWith("private-blob:"));

    const regularSources: string[] = [];
    for (const f of def.pdf.regularFiles) {
      const b = f.startsWith("private-blob:")
        ? await loadPrivateBlob(f.slice("private-blob:".length))
        : readBase64Sync(f);
      if (b) regularSources.push(b);
    }

    const boldSources: string[] = [];
    for (const f of def.pdf.boldFiles ?? []) {
      const b = f.startsWith("private-blob:")
        ? await loadPrivateBlob(f.slice("private-blob:".length))
        : readBase64Sync(f);
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
        ` bold ${boldSources.length}/${declaredBold}` +
        (isPrivateBlob ? " (private-blob source)" : ""),
      );
    }

    map.set(def.pdf.familyName, {
      familyName:     def.pdf.familyName,
      regularSources,
      boldSources:    boldSources.length > 0 ? boldSources : undefined,
      complete,
      declaredRegular,
      declaredBold,
      loadedRegular:  regularSources.length,
      loadedBold:     boldSources.length,
    });
  }

  // Only cache when no private-blob failures occurred — retry is allowed
  const anyPrivateBlobFailed = STUDIO_FONTS
    .filter(d => d.pdf.embedded && d.pdf.regularFiles?.some(f => f.startsWith("private-blob:")))
    .some(d => {
      const face = map.get(d.pdf.familyName ?? "");
      return face && !face.complete;
    });

  if (!anyPrivateBlobFailed) cachedFaces = map;

  return map;
}

async function fontsForDocument(doc: DocNode, dir: Direction, typography?: DocumentStudioSettings["typography"]): Promise<PdfFonts> {
  const all = await loadAllBundledFaces();
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
    const fonts = await fontsForDocument(doc, dir, settings.typography);
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
