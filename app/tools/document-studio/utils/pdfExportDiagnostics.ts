
import cmap from "./digitalKhattCmap.json";
import type { DocNode } from "./extractPlainText";

const supported = new Set<number>(cmap);
const arabicPoint = (n: number) =>
  (n >= 0x0600 && n <= 0x06ff) || (n >= 0x0750 && n <= 0x077f) ||
  (n >= 0x08a0 && n <= 0x08ff) || (n >= 0xfb50 && n <= 0xfdff) ||
  (n >= 0xfe70 && n <= 0xfeff) || (n >= 0x10e60 && n <= 0x10e7f) ||
  (n >= 0x1ee00 && n <= 0x1eeff);

/** Additional source-only diagnostics, not a substitute for CDP painted-font guard. */
export function identifyUnsupportedProtectedCharacters(doc: DocNode): PdfExportDiagnostic[] {
  const results: PdfExportDiagnostic[] = [];
  let runIndex = 0;
  const walk = (node: DocNode) => {
    if (node.type === "text" && typeof node.text === "string" &&
        node.marks?.some(mark => mark.type === "textStyle" && mark.attrs?.fontFamily === "Digital Khatt Indo-Pak")) {
      const seen = new Set<number>();
      for (const ch of node.text) {
        const cp = ch.codePointAt(0)!;
        const joining = cp === 0x200c || cp === 0x200d || cp === 0x061c || cp === 0x200e || cp === 0x200f;
        if (((arabicPoint(cp) && !supported.has(cp)) || joining) && !seen.has(cp)) {
          seen.add(cp);
          const codepoint = "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
          results.push({
            code: "PDF_FONT_UNSAFE",
            kind: "font",
            messageUrdu: "منتخب فونٹ میں یہ عربی یا قرآنی علامت محفوظ طور پر دستیاب نہیں۔",
            selectedFont: "Digital Khatt Indo-Pak",
            codepoint, character: ch,
            reason: joining ? "غیر تصدیق شدہ جوڑنے یا سمت کی علامت" : "اصل فونٹ کے حروفی نقشے میں موجود نہیں",
            location: { runIndex },
          });
          if (results.length >= 20) return;
        }
      }
      runIndex += 1;
    }
    for (const child of node.content ?? []) {
      if (results.length < 20) walk(child);
    }
  };
  walk(doc);
  return results;
}

export type PdfExportFailureKind = "font" | "layout" | "complexity" | "timeout" | "too_large" | "server" | "unknown";
export interface PdfSourceLocation {
  /** Source document's ordered Digital Khatt text run (zero based). */
  runIndex: number;
}
export interface PdfExportDiagnostic {
  code: string;
  kind: PdfExportFailureKind;
  messageUrdu: string;
  selectedFont?: string;
  actualFont?: string;
  codepoint?: string;
  character?: string;
  reason?: string;
  location?: PdfSourceLocation;
  /** Page number is omitted unless pagination has completed successfully. */
  page?: number;
}
export interface PdfExportErrorResponse {
  error: string;
  diagnostics: PdfExportDiagnostic[];
  retryable: boolean;
}
const marker = /(?:run|root)\s+(\d+)(?::(\d+))?/i;
const point = /U\+[0-9A-F]{4,6}/i;
/** Safe diagnostics: no document excerpt or personal text sent to logs or telemetry. */
export function classifyPdfExportFailure(err: unknown): PdfExportErrorResponse {
  const raw = err instanceof Error ? err.message : "";
  const protectedFont = /Digital Khatt|Quranic|Arabic|glyph|font|fallback|U\+|Unicode|protected run|joining/i.test(raw);
  const timeout = /timed?\s*out|timeout|deadline/i.test(raw);
  const tooLarge = /too large|size limit|payload|98304-byte limit/i.test(raw);
  const layout = /printable horizontal boundary|staging limit|visual-line limit/i.test(raw);
  const complexity = /code-point single-text-node limit|2500-node limit/i.test(raw);
  const kind: PdfExportFailureKind = layout ? "layout" : complexity ? "complexity" :
    tooLarge ? "too_large" : protectedFont ? "font" : timeout ? "timeout" : raw ? "server" : "unknown";
  const knownCode = /printable horizontal boundary/i.test(raw) ? "PDF_LAYOUT_OVERFLOW" :
    /300 visual-line limit/i.test(raw) ? "PDF_LIMIT_VISUAL_LINES" :
    /40000px staging limit/i.test(raw) ? "PDF_LIMIT_STAGING_HEIGHT" :
    /98304-byte limit/i.test(raw) ? "PDF_LIMIT_SOURCE_BYTES" :
    /20000 code-point single-text-node limit/i.test(raw) ? "PDF_LIMIT_NODE_CODEPOINTS" :
    /2500-node limit/i.test(raw) ? "PDF_LIMIT_NODE_COUNT" : undefined;
  const match = marker.exec(raw);
  const cp = point.exec(raw)?.[0]?.toUpperCase();
  const fontName = /actual=([^;]+?)(?:;|\s*export blocked|$)/.exec(raw)?.[1]
    ?? /faces=([^;]+?)(?:;|\s*export blocked|$)/.exec(raw)?.[1];
  const platformFaces = /platform fonts:\s*([^);]+?)(?:\)|;|$)/i.exec(raw)?.[1];
  const actual = fontName ?? platformFaces;
  const safeFont = actual && /^[A-Za-z0-9 ,._-]{1,120}$/.test(actual) ? actual : undefined;
  const digitalRun = /Digital Khatt|Quranic|protected run|protected Arabic/i.test(raw);
  const messages: Record<PdfExportFailureKind, string> = {
    font: "اس عبارت کے کچھ حروف منتخب فونٹ میں محفوظ طریقے سے نہیں بن رہے۔ متعلقہ عبارت اور فونٹ دیکھیں۔",
    timeout: "پی ڈی ایف بنانے میں وقت زیادہ لگ گیا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔",
    too_large: "دستاویز کا حجم مقررہ حد سے زیادہ ہے۔ تصاویر یا فائل کا حجم دیکھیں۔",
    layout: "اس صفحے پر عبارت یا سطریں دستیاب جگہ سے باہر جارہی ہیں۔ صفحے کی ترتیب یا متعلقہ فارمیٹنگ دیکھیں۔",
    complexity: "دستاویز میں متن یا اجزا کی تعداد مقررہ حد سے زیادہ ہے۔ اسے چھوٹے حصوں میں تقسیم کریں۔",
    server: "پی ڈی ایف تیار نہیں ہوسکی۔ دوبارہ کوشش کریں؛ مسئلہ باقی رہے تو اطلاع دیں۔",
    unknown: "پی ڈی ایف بنانے میں ایک نامعلوم مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔",
  };
  const diagnostic: PdfExportDiagnostic = {
    code: knownCode ?? (kind === "font" ? "PDF_FONT_UNSAFE" : kind === "timeout" ? "PDF_TIMEOUT" : kind === "too_large" ? "PDF_TOO_LARGE" : "PDF_EXPORT_FAILED"),
    kind, messageUrdu: messages[kind],
    ...(kind === "font" && digitalRun ? { selectedFont: "Digital Khatt Indo-Pak" } : {}),
    ...(safeFont && kind === "font" ? { actualFont: safeFont } : {}),
    ...(cp && kind === "font" ? { codepoint: cp, character: String.fromCodePoint(parseInt(cp.slice(2), 16)) } : {}),
    ...(match && kind === "font" ? { location: { runIndex: Number(match[1]) } } : {}),
    reason: kind === "font" ? "غیر منظور شدہ یا غیر موجود حرف/متبادل فونٹ" : kind,
  };
  return { error: messages[kind], diagnostics: [diagnostic], retryable: kind === "timeout" || kind === "server" || kind === "unknown" };
}
