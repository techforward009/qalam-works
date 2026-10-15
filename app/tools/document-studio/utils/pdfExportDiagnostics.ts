/** Safe, bounded, content-free PDF export diagnostics for the UI. */
export type PdfExportFailureCode =
  | "UNSUPPORTED_GLYPH" | "FONT_FALLBACK" | "FONT_UNAVAILABLE"
  | "SOURCE_MISMATCH" | "INVALID_CONTROL" | "INVALID_PUNCTUATION"
  | "PAGINATION_MISMATCH" | "TIMEOUT" | "DOCUMENT_TOO_LARGE"
  | "SERVICE_UNAVAILABLE" | "EXPORT_FAILED";
export interface PdfExportProblem {
  code: PdfExportFailureCode;
  message: string;
  source?: { path: number[]; paragraphPath: number[]; start: number; end: number; snapshot?: string };
  selectedFont?: string;
  actualFont?: string;
  unicode?: string;
  character?: string;
  reason?: string;
  page?: number;
}
export interface PdfExportFailure {
  version: 1;
  error: string;
  code: PdfExportFailureCode;
  problems: PdfExportProblem[];
}
type Node = { type?: string; text?: string; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: Node[] };
export const pdfRunFingerprint = (text: string): string => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return (h >>> 0).toString(16); };
const selected = (node: Node) => node.marks?.find(m => m.type === "textStyle")?.attrs?.fontFamily;
export function locatePdfFontProblem(doc: Node, font: string, unicode?: string, runIndex?: number): PdfExportProblem["source"] | undefined {
  const codepoint = unicode ? Number.parseInt(unicode.replace(/^U\+/i, ""), 16) : NaN;
  const wanted = Number.isFinite(codepoint) ? String.fromCodePoint(codepoint) : undefined;
  let ordinal = 0;
  const walk = (node: Node, path: number[], paragraphPath: number[]): PdfExportProblem["source"] | undefined => {
    const paragraph = ["paragraph", "heading", "listItem", "tableCell", "tableHeader"].includes(node.type ?? "") ? path : paragraphPath;
    if (node.type === "text" && typeof node.text === "string" && selected(node) === font) {
      const current = ordinal++;
      if (runIndex === undefined || current === runIndex) {
        const start = wanted ? node.text.indexOf(wanted) : 0;
        if (start >= 0) return { path, paragraphPath: paragraph, start, end: start + (wanted?.length ?? node.text.length), snapshot: pdfRunFingerprint(node.text) };
      }
    }
    for (const [i, child] of (node.content ?? []).entries()) {
      const hit = walk(child, [...path, i], paragraph);
      if (hit) return hit;
    }
  };
  return walk(doc, [], []);
}
export function classifyPdfExportFailure(message: string, doc?: Node): PdfExportFailure {
  const glyph = message.match(/(U\+[0-9A-F]{4,6})/i);
  const run = message.match(/(?:at run |glyph fallback at run )(\d+):(\d+)/i);
  const faces = message.match(/faces=([^;]+)/i);
  const font = /Digital Khatt/i.test(message) || run ? "Digital Khatt Indo-Pak" : undefined;
  let code: PdfExportFailureCode = "EXPORT_FAILED";
  if (/Unsupported protected Arabic|Quranic/i.test(message)) code = "UNSUPPORTED_GLYPH";
  else if (/joining\/bidi control/i.test(message)) code = "INVALID_CONTROL";
  else if (/Unverified U\+002E|unapproved|question mark/i.test(message)) code = "INVALID_PUNCTUATION";
  else if (/glyph fallback|Unexpected glyph fallback/i.test(message)) code = "FONT_FALLBACK";
  else if (/font .*could not be loaded/i.test(message)) code = "FONT_UNAVAILABLE";
  else if (/Unicode mismatch|codepoints differ|Unicode modified/i.test(message)) code = "SOURCE_MISMATCH";
  else if (/page count differs/i.test(message)) code = "PAGINATION_MISMATCH";
  else if (/timed?\s*out|timeout/i.test(message)) code = "TIMEOUT";
  else if (/too large|payload too large|request entity too large/i.test(message)) code = "DOCUMENT_TOO_LARGE";
  else if (/unavailable|service/i.test(message)) code = "SERVICE_UNAVAILABLE";
  const descriptions: Record<PdfExportFailureCode, string> = {
    UNSUPPORTED_GLYPH: "منتخب فونٹ میں ایک ضروری عربی یا قرآنی علامت موجود نہیں۔",
    FONT_FALLBACK: "اصل عبارت کسی دوسرے فونٹ میں دکھائی دے رہی ہے، اس لیے محفوظ PDF روکی گئی۔",
    FONT_UNAVAILABLE: "منتخب فونٹ لوڈ نہیں ہوسکا۔",
    SOURCE_MISMATCH: "اصل عبارت اور چھپنے والی عبارت یکساں نہیں۔",
    INVALID_CONTROL: "عبارت میں ایسا پوشیدہ حرف ہے جس کی محفوظ طباعت کی تصدیق نہیں ہوئی۔",
    INVALID_PUNCTUATION: "منتخب فونٹ میں اس علامت کی محفوظ طباعت ثابت نہیں ہوئی۔",
    PAGINATION_MISMATCH: "صفحوں کی تعداد متوقع ترتیب سے مختلف ہے۔",
    TIMEOUT: "PDF بنانے کا مقررہ وقت ختم ہوگیا۔",
    DOCUMENT_TOO_LARGE: "دستاویز کا حجم بہت زیادہ ہے۔",
    SERVICE_UNAVAILABLE: "PDF کی خدمت فی الحال دستیاب نہیں۔",
    EXPORT_FAILED: "PDF نہیں بن سکی۔ خرابی کی نوعیت معلوم نہیں ہوسکی۔"
  };
  const source = font && doc ? locatePdfFontProblem(doc, font, glyph?.[1], run ? Number(run[1]) : undefined) : undefined;
  const problem: PdfExportProblem = { code, message: descriptions[code] };
  if (source) problem.source = source;
  if (font) problem.selectedFont = font;
  if (faces) problem.actualFont = faces[1].trim();
  if (glyph) { problem.unicode = glyph[1].toUpperCase(); problem.character = String.fromCodePoint(parseInt(glyph[1].slice(2), 16)); }
  if (run) problem.reason = "حصہ " + run[1] + ":" + run[2];
  return { version: 1, error: descriptions[code], code, problems: [problem] };
}


/** Pre-scan source only; never weakens the Chromium fail-closed guard. */
import digitalKhattCmap from "./digitalKhattCmap.json";
const supportedDigital = new Set<number>(digitalKhattCmap);
const protectedControl = new Set([0x200c, 0x200d, 0x061c, 0x200e, 0x200f]);
const arabicCodepoint = (n: number) =>
  (n >= 0x600 && n <= 0x6ff) || (n >= 0x750 && n <= 0x77f) ||
  (n >= 0x8a0 && n <= 0x8ff) || (n >= 0xfb50 && n <= 0xfdff) ||
  (n >= 0xfe70 && n <= 0xfeff) || (n >= 0x10e60 && n <= 0x10e7f) ||
  (n >= 0x1ee00 && n <= 0x1eeff);
export function inspectProtectedSource(doc: Node, limit = 32): PdfExportProblem[] {
  const issues: PdfExportProblem[] = [];
  const visit = (node: Node, path: number[], parent: number[]) => {
    if (issues.length >= limit) return;
    const paragraph = ["paragraph", "heading", "listItem", "tableCell", "tableHeader"].includes(node.type ?? "") ? path : parent;
    if (node.type === "text" && typeof node.text === "string" && selected(node) === "Digital Khatt Indo-Pak") {
      let index = 0;
      for (const char of node.text) {
        const n = char.codePointAt(0)!;
        const control = protectedControl.has(n);
        const missing = arabicCodepoint(n) && !supportedDigital.has(n);
        if (control || missing) {
          const code = control ? "INVALID_CONTROL" : "UNSUPPORTED_GLYPH";
          const unicode = "U+" + n.toString(16).toUpperCase().padStart(4, "0");
          issues.push({
            code, unicode, character: char,
            message: control ? "اس پوشیدہ حرف کی محفوظ طباعت ثابت نہیں ہوئی۔" : "منتخب فونٹ میں یہ عربی یا قرآنی علامت موجود نہیں۔",
            source: { path, paragraphPath: paragraph, start: index, end: index + char.length, snapshot: pdfRunFingerprint(node.text) },
            selectedFont: "Digital Khatt Indo-Pak",
            reason: control ? "Unverified joining/bidi control" : "Missing from pinned font cmap"
          });
          if (issues.length >= limit) return;
        }
        index += char.length;
      }
    }
    (node.content ?? []).forEach((child, i) => { if (issues.length < limit) visit(child, [...path, i], paragraph); });
  };
  visit(doc, [], []);
  return issues;
}
