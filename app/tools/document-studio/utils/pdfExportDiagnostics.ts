/** Safe, bounded, content-free PDF export diagnostics for the UI. */
export type PdfExportFailureCode =
  | "UNSUPPORTED_GLYPH" | "FONT_FALLBACK" | "FONT_UNAVAILABLE"
  | "SOURCE_MISMATCH" | "INVALID_CONTROL" | "INVALID_PUNCTUATION"
  | "PAGINATION_MISMATCH" | "TIMEOUT" | "DOCUMENT_TOO_LARGE"
  | "SERVICE_UNAVAILABLE" | "EXPORT_FAILED";
export interface PdfExportProblem {
  code: PdfExportFailureCode;
  message: string;
  source?: { path: number[]; paragraphPath: number[]; start: number; end: number };
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
        if (start >= 0) return { path, paragraphPath: paragraph, start, end: start + (wanted?.length ?? node.text.length) };
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
