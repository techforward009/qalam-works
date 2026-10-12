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
  if (dir !== "rtl" || !doc.content?.length || doc.content.length > 70) return null;
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
  const opens = (stream.match(/\bBDC\b|\bBMC\b/g) ?? []).length;
  const closes = (stream.match(/\bEMC\b/g) ?? []).length;
  if (opens !== closes ||
    matches.filter(m => m[0] !== "EMC").length !== opens ||
    matches.filter(m => m[0] === "EMC").length !== closes) return null;

  const stack: ("parent" | "inner")[] = [];
  let cursor = 0, output = "", count = 0;
  for (const match of matches) {
    output += stream.slice(cursor, match.index);
    const token = match[0];
    if (match[1] !== undefined) {
      if (Number(match[1]) !== count || count >= lines.length) return null;
      stack.push("parent");
      output += token + "\n" + taggedActualText(lines[count]);
      count++;
    } else if (token.startsWith("/ReversedChars") || token.startsWith("/Span")) {
      stack.push("inner");
      // Remove only the old fragmented extraction tags, not glyph operators.
    } else {
      const open = stack.pop();
      if (!open) return null;
      if (open === "parent") output += "EMC\nEMC";
    }
    cursor = match.index! + token.length;
  }
  output += stream.slice(cursor);
  return stack.length === 0 && count === lines.length ? output : null;
}

export function tagSimpleUrduPdfLogicalText(
  pdf: PDFDocument, doc: DocNode, dir: "rtl" | "ltr",
  geometry: { pages: number; lines: number },
): LogicalTextResult {
  const lines = safeLines(doc, dir);
  if (!lines || geometry.pages !== 1 || geometry.lines !== lines.length || pdf.getPageCount() !== 1) {
    return { status: "unchanged", lines: 0, reason: "unsupported-document" };
  }
  try {
    const context = pdf.context;
    const page = pdf.getPage(0);
    const contents = page.node.get(PDFName.of("Contents"));
    const original = contents instanceof PDFRef ? context.lookup(contents) : contents;
    if (!(original instanceof PDFRawStream)) return { status: "unchanged", lines: 0, reason: "unknown-stream" };
    const decoded = Buffer.from(decodePDFRawStream(original).decode()).toString("latin1");
    const tagged = tagChromeUrduPdfStream(decoded, lines);
    if (!tagged) return { status: "unchanged", lines: 0, reason: "unknown-chromium-structure" };
    const rewritten = context.flateStream(Buffer.from(tagged, "latin1"));
    page.node.set(PDFName.of("Contents"), context.register(rewritten));
    return { status: "tagged", lines: lines.length };
  } catch {
    return { status: "unchanged", lines: 0, reason: "postprocess-error" };
  }
}
