import { decodePDFRawStream, PDFDocument, PDFName, PDFRawStream, PDFRef } from "pdf-lib";
import type { DocNode } from "./extractPlainText";
import { getBlockTexts } from "./extractPlainText";

/**
 * Only the audited simple RTL case. Never rewrite mixed-language, wrapped,
 * multi-page, list/table/image or unknown Chromium PDF content streams.
 * Rendering operators and font resources are left unchanged.
 */
export type LogicalTextResult =
  | { status: "tagged"; lines: number }
  | { status: "unchanged"; lines: 0; reason: string };

const TOKEN = /\/NonStruct\s*<<\s*\/MCID\s+(\d+)\s*>>\s*BDC|\/ReversedChars\s+BMC|\/Span\s*<<\s*\/ActualText\s*(?:\([^)]*\)|<[^>]*>)\s*>>\s*BDC|(?<!\w)EMC(?!\w)/g;

function safeLines(doc: DocNode, dir: "rtl" | "ltr"): string[] | null {
  const allBlocksExplicitRtl = !!doc.content?.every(block => block.attrs?.dir === "rtl");
  if ((dir !== "rtl" && !allBlocksExplicitRtl) || !doc.content?.length || doc.content.length > 70) return null;
  if (!doc.content.every(node =>
    node.type === "paragraph" &&
    node.attrs?.dir !== "ltr" &&
    !!node.content?.length &&
    node.content.every(child => child.type === "text" && typeof child.text === "string")
  )) return null;
  const lines = getBlockTexts(doc);
  if (lines.some(line => !line.trim() || line.length > 1200 ||
    !/^[\p{Script=Arabic}\s۔،؟]+$/u.test(line) ||
    /[0-9\u0660-\u0669\u06f0-\u06f9]/u.test(line))) return null;
  return lines;
}

function taggedActualText(logical: string): string {
  // For Chromium's visual-order RTL glyph streams, reversed codepoints
  // produce the correct logical extraction in Poppler's raw mode.
  const visual = Array.from(logical).reverse().join("");
  const bigEndian = Buffer.from(visual, "utf16le").swap16();
  return "/Span <</ActualText <FEFF" + bigEndian.toString("hex").toUpperCase() + ">>> BDC";
}

export function tagChromeUrduPdfStream(stream: string, lines: readonly string[]): string | null {
  const matches = [...stream.matchAll(TOKEN)];
  const opens = (stream.match(/\\bBDC\\b|\\bBMC\\b/g) ?? []).length;
  const closes = (stream.match(/\\bEMC\\b/g) ?? []).length;
  if (opens !== closes ||
    matches.filter(m => m[0] !== "EMC").length !== opens ||
    matches.filter(m => m[0] === "EMC").length !== closes) return null;

  // Chromium may emit one extra, glyph-free marked-content group at a page
  // break. Detect it by balancing nested tags and checking painted text
  // operators inside each parent. Only one TRAILING empty group is allowed.
  const scan: Array<{ kind: "parent" | "inner"; index?: number; start?: number }> = [];
  const painted: boolean[] = [];
  let groups = 0;
  for (const match of matches) {
    if (match[1] !== undefined) {
      scan.push({ kind: "parent", index: groups++, start: match.index! + match[0].length });
    } else if (match[0] !== "EMC") {
      scan.push({ kind: "inner" });
    } else {
      const opening = scan.pop();
      if (!opening) return null;
      if (opening.kind === "parent") {
        const enclosed = stream.slice(opening.start!, match.index);
        painted[opening.index!] = /\\b(?:Tj|TJ)\\b/.test(enclosed);
      }
    }
  }
  if (scan.length || painted.length !== groups) return null;
  const empty = painted.flatMap((hasGlyphs, index) => hasGlyphs ? [] : [index]);
  if (empty.length > 1 || (empty.length === 1 && empty[0] !== groups - 1) ||
    painted.filter(Boolean).length !== lines.length) return null;

  const stack: ("parent" | "inner" | "empty" | "keep-inner")[] = [];
  let cursor = 0, output = "", count = 0, seen = 0;
  for (const match of matches) {
    output += stream.slice(cursor, match.index);
    const token = match[0];
    if (match[1] !== undefined) {
      if (Number(match[1]) !== seen) return null;
      if (painted[seen]) {
        stack.push("parent");
        output += token + "\\n" + taggedActualText(lines[count++]);
      } else {
        stack.push("empty");
        output += token;
      }
      seen++;
    } else if (token.startsWith("/ReversedChars") || token.startsWith("/Span")) {
      if (stack.includes("empty")) {
        stack.push("keep-inner");
        output += token;
      } else {
        stack.push("inner");
      }
    } else {
      const open = stack.pop();
      if (!open) return null;
      if (open === "parent") output += "EMC\\nEMC";
      else if (open === "empty" || open === "keep-inner") output += "EMC";
    }
    cursor = match.index! + token.length;
  }
  output += stream.slice(cursor);
  return stack.length === 0 && count === lines.length && seen === groups ? output : null;
}

export function tagSimpleUrduPdfLogicalText(
  pdf: PDFDocument, doc: DocNode, dir: "rtl" | "ltr",
  geometry: { pages: number; lines: number; pageLineCounts?: number[] },
): LogicalTextResult {
  const lines = safeLines(doc, dir);
  const counts = geometry.pageLineCounts;
  if (!lines || !counts || geometry.pages < 1 ||
    geometry.lines !== lines.length || pdf.getPageCount() !== geometry.pages ||
    counts.length !== geometry.pages || counts.some(count => !Number.isInteger(count) || count < 1) ||
    counts.reduce((sum, count) => sum + count, 0) !== lines.length) {
    return { status: "unchanged", lines: 0, reason: "unsupported-document" };
  }
  // A multi-page document must be all-or-nothing: never partially retag a PDF.
  try {
    const context = pdf.context;
    const staged: Array<{ page: ReturnType<typeof pdf.getPage>; tagged: string }> = [];
    let start = 0;
    for (const [index, count] of counts.entries()) {
      const page = pdf.getPage(index);
      const contents = page.node.get(PDFName.of("Contents"));
      const original = contents instanceof PDFRef ? context.lookup(contents) : contents;
      if (!(original instanceof PDFRawStream)) {
        return { status: "unchanged", lines: 0, reason: "unknown-stream" };
      }
      const decoded = Buffer.from(decodePDFRawStream(original).decode()).toString("latin1");
      const tagged = tagChromeUrduPdfStream(decoded, lines.slice(start, start + count));
      if (!tagged) return { status: "unchanged", lines: 0, reason: "unknown-chromium-structure" };
      staged.push({ page, tagged });
      start += count;
    }
    if (start !== lines.length) return { status: "unchanged", lines: 0, reason: "line-mismatch" };
    for (const item of staged) {
      const rewritten = context.flateStream(Buffer.from(item.tagged, "latin1"));
      item.page.node.set(PDFName.of("Contents"), context.register(rewritten));
    }
    return { status: "tagged", lines: lines.length };
  } catch {
    return { status: "unchanged", lines: 0, reason: "postprocess-error" };
  }
}
