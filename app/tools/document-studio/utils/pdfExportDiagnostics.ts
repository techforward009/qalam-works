import type { DocNode } from "./extractPlainText";

export type PdfFailureKind = "FONT_UNSUPPORTED" | "FONT_FALLBACK" | "PDF_LAYOUT" | "TIMEOUT" | "DOCUMENT_LIMIT" | "SERVICE_ERROR" | "UNKNOWN";
export type PdfSourceLocation = { path: number[]; blockPath: number[]; runIndex: number; textOffset: number; expectedText: string };
export type PdfIssue = {
  id: string; kind: PdfFailureKind; reason: string; selectedFont?: string; actualFont?: string;
  codePoint?: string; character?: string; location?: PdfSourceLocation; page?: number;
};
export type PdfFailure = { version: 1; code: PdfFailureKind; messageUr: string; retryable: boolean; issues: PdfIssue[] };
export function issueForPdfFailure(error: unknown, doc: DocNode): PdfFailure {
  const raw = error instanceof Error ? error.message : "";
  const blockedFont = /(?:Unsafe font|Unexpected glyph fallback|Unsupported protected Arabic|Unverified|PDF font|glyph font|could not be loaded)/i.test(raw);
  let kind: PdfFailureKind = blockedFont ? "FONT_FALLBACK" :
    /page count|pagination|layout/i.test(raw) ? "PDF_LAYOUT" :
    /timeout|timed out/i.test(raw) ? "TIMEOUT" :
    /size|too large|memory|payload/i.test(raw) ? "DOCUMENT_LIMIT" : "UNKNOWN";
  if (/Unsupported protected Arabic|could not be loaded/i.test(raw)) kind = "FONT_UNSUPPORTED";
  // Only script-aware errors carry a protected-root index. Ordinary Urdu run indices
  // refer to a different DOM collection and must NEVER be mapped to this tree.
  const m = /(?:Unexpected glyph fallback|Unsupported protected Arabic|Unsafe font at protected run)/i.test(raw)
    ? raw.match(/run (\d+):(\d+)/i) : null;
  const indexed = m ? { root: Number(m[1]), part: Number(m[2]) } : null;
  const actual = raw.match(/(?:faces|actual|platform fonts)=?[:\s]*([A-Za-z ,]+)/i)?.[1]?.trim();
  const codePoint = raw.match(/U\+[0-9A-F]{4,6}/i)?.[0]?.toUpperCase();
  const issues: PdfIssue[] = [];
  if (blockedFont) {
    let index = 0;
    const visit = (node: DocNode, path: number[], blockPath: number[]) => {
      if (node.type === "text" && typeof node.text === "string") {
        const selected = node.marks?.find(mark => mark.type === "textStyle")?.attrs?.fontFamily;
        if (selected === "Digital Khatt Indo-Pak") {
          const matchRun = indexed?.root === index;
          if (indexed ? matchRun : false) {
            const matchOffset = codePoint ? Array.from(node.text).findIndex(ch => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4,"0") === codePoint) : -1;
            const offset = Math.max(0,matchOffset);
            const cp = matchOffset>=0 ? Array.from(node.text)[matchOffset] : undefined;
            issues.push({ id:"font-"+index,kind,reason:kind==="FONT_UNSUPPORTED"?"missing-glyph":"unapproved-painted-font",
              selectedFont:selected,actualFont:actual,codePoint,character:cp,
              location:{ path,blockPath,runIndex:index,textOffset:offset,expectedText:node.text } });
          }
          index++;
        }
      }
      for (const [i,child] of (node.content??[]).entries()) {
        visit(child,[...path,i],node.type==="paragraph"||node.type==="heading"?path:blockPath);
      }
    };
    visit(doc,[],[]);
    if (!issues.length) issues.push({id:"font-unlocated",kind,reason:"location-unverified",
      codePoint,actualFont:actual});
  }
  const messageUr = kind==="FONT_UNSUPPORTED"?"منتخب فونٹ میں مطلوبہ حرف دستیاب نہیں۔ متعلقہ عبارت دیکھ کر مناسب فونٹ منتخب کریں۔":
    kind==="FONT_FALLBACK"?"پی ڈی ایف میں بعض حروف منتخب فونٹ کے بجائے دوسرے فونٹ میں بن رہے ہیں۔ متعلقہ عبارت کی جانچ کریں۔":
    kind==="PDF_LAYOUT"?"صفحوں کی ترتیب کی جانچ مکمل نہیں ہوئی۔ اپنی دستاویز کا حجم اور صفحہ بندی دیکھیں۔":
    kind==="TIMEOUT"?"پی ڈی ایف بنانے میں مقررہ وقت ختم ہوگیا۔ کچھ دیر بعد دوبارہ کوشش کریں۔":
    kind==="DOCUMENT_LIMIT"?"دستاویز کی جسامت یا وسائل کی حد آڑے آئی ہے۔":
    "پی ڈی ایف برآمد مکمل نہیں ہوسکی۔ وجہ کی حتمی شناخت نہیں ہوئی؛ دوبارہ کوشش کریں۔";
  return {version:1,code:kind,messageUr,retryable:!blockedFont,
    issues:issues.slice(0,15)};
}
export function isPdfFailure(value: unknown): value is PdfFailure {
  if(!value || typeof value!=="object")return false;
  const f=value as Partial<PdfFailure>;
  return f.version===1&&typeof f.code==="string"&&typeof f.messageUr==="string"&&Array.isArray(f.issues);
}
