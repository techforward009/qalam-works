export type PdfExportFailureKind = "font" | "timeout" | "too_large" | "server" | "unknown";
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
  const tooLarge = /too large|size limit|payload/i.test(raw);
  const kind: PdfExportFailureKind = protectedFont ? "font" : timeout ? "timeout" : tooLarge ? "too_large" : raw ? "server" : "unknown";
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
    server: "پی ڈی ایف تیار نہیں ہوسکی۔ دوبارہ کوشش کریں؛ مسئلہ باقی رہے تو اطلاع دیں۔",
    unknown: "پی ڈی ایف بنانے میں ایک نامعلوم مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔",
  };
  const diagnostic: PdfExportDiagnostic = {
    code: kind === "font" ? "PDF_FONT_UNSAFE" : kind === "timeout" ? "PDF_TIMEOUT" : kind === "too_large" ? "PDF_TOO_LARGE" : "PDF_EXPORT_FAILED",
    kind, messageUrdu: messages[kind],
    ...(kind === "font" && digitalRun ? { selectedFont: "Digital Khatt Indo-Pak" } : {}),
    ...(safeFont && kind === "font" ? { actualFont: safeFont } : {}),
    ...(cp && kind === "font" ? { codepoint: cp, character: String.fromCodePoint(parseInt(cp.slice(2), 16)) } : {}),
    ...(match && kind === "font" ? { location: { runIndex: Number(match[1]) } } : {}),
    reason: kind === "font" ? "غیر منظور شدہ یا غیر موجود حرف/متبادل فونٹ" : kind,
  };
  return { error: messages[kind], diagnostics: [diagnostic], retryable: kind !== "font" };
}
