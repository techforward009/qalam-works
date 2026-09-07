/**
 * Invoice print layout — shared by live preview, HTML, and PDF.
 *
 * Style is the layout engine (western | pakistani). Western skins only
 * change chrome; Pakistani is the press sheet. Page geometry reuses
 * Document Studio's ISO sizes with a fixed 12mm safe print margin.
 */
import {
  puppeteerPaperFormat,
  resolvePageDimensions,
  type PageSizeId,
} from "../../document-studio/utils/pageLayout";

export type InvoiceStyle = "western" | "pakistani";
export type WesternSkin = "modern" | "minimal" | "corporate";
export type InvoicePageSize = "a4" | "a5";
export type InvoicePageOrientation = "portrait" | "landscape";
export type InvoiceLanguage = "en" | "ur";
export type Alignment = "left" | "center" | "right";
export type SizeOption = "small" | "medium" | "large";

export interface InvoicePrintSettings {
  style: InvoiceStyle;
  skin: WesternSkin;
  pageSize: InvoicePageSize;
  pageOrientation: InvoicePageOrientation;
  extraLines: number;
  headerScale: number;
}

export interface InvoicePageBox {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  sizeId: PageSizeId;
  orientation: InvoicePageOrientation;
}

export interface ExtraLinesResult {
  extraLines: number;
  spacerMm: number;
  blankRowCount: number;
  blankRowMm: number;
}

export const INVOICE_PAGE_MARGIN_MM = 12;
export const INVOICE_SAFE_BOTTOM_INSET_MM = 4;
export const EXTRA_LINES_MIN = 0;
export const EXTRA_LINES_MAX = 15;
export const EXTRA_LINES_DEFAULT = 3;
export const HEADER_SCALE_MIN = 0.65;
export const HEADER_SCALE_MAX = 1;
export const HEADER_SCALE_DEFAULT = 0.8;
export const PAKISTANI_BLANK_ROW_MM = 8;
export const WESTERN_EXTRA_LINE_MM = 7.5;

export const DEFAULT_INVOICE_PRINT: InvoicePrintSettings = {
  style: "western",
  skin: "modern",
  pageSize: "a4",
  pageOrientation: "portrait",
  extraLines: EXTRA_LINES_DEFAULT,
  headerScale: HEADER_SCALE_DEFAULT,
};

/** Western item-table tracks — totals use the same definition. */
export const WESTERN_COL = {
  qtyPx: 40,
  pricePx: 70,
  discPx: 48,
  amountPx: 110,
} as const;

export const PAKISTANI_COL = {
  sno: "7%",
  qty: "8%",
  rate: "12%",
  disc: "9%",
  amount: "18%",
} as const;

export interface InvoiceChrome {
  accent: string;
  accentText: string;
  headerBg: string;
  headerText: string;
  label: string;
  labelUr: string;
}

export const WESTERN_SKINS: Record<WesternSkin, InvoiceChrome> = {
  modern:    { accent: "#B45309", accentText: "#92400E", headerBg: "#FFFBEB", headerText: "#78350F", label: "Modern",    labelUr: "جدید" },
  minimal:   { accent: "#374151", accentText: "#1F2937", headerBg: "#F9FAFB", headerText: "#111827", label: "Minimal",   labelUr: "سادہ" },
  corporate: { accent: "#1E3A5F", accentText: "#1E3A5F", headerBg: "#EFF6FF", headerText: "#1E3A5F", label: "Corporate", labelUr: "کارپوریٹ" },
};

export const PAKISTANI_CHROME: InvoiceChrome = {
  accent: "#111827",
  accentText: "#111827",
  headerBg: "#ffffff",
  headerText: "#111827",
  label: "Pakistani",
  labelUr: "پاکستانی",
};

export function invoiceChrome(print: InvoicePrintSettings): InvoiceChrome {
  return print.style === "pakistani" ? PAKISTANI_CHROME : WESTERN_SKINS[print.skin];
}

export function clampExtraLines(value: number): number {
  if (!Number.isFinite(value)) return EXTRA_LINES_DEFAULT;
  return Math.min(EXTRA_LINES_MAX, Math.max(EXTRA_LINES_MIN, Math.round(value)));
}

export function clampHeaderScale(value: number): number {
  if (!Number.isFinite(value)) return HEADER_SCALE_DEFAULT;
  const rounded = Math.round(value * 100) / 100;
  return Math.min(HEADER_SCALE_MAX, Math.max(HEADER_SCALE_MIN, rounded));
}

export function isWesternSkin(value: string): value is WesternSkin {
  return value === "modern" || value === "minimal" || value === "corporate";
}

export function resolveInvoicePrintSettings(
  input?: Partial<InvoicePrintSettings> & { template?: string; bodyGapMode?: string; bodyGapMm?: number },
): InvoicePrintSettings {
  const template = input?.template;
  let style: InvoiceStyle = input?.style === "pakistani" ? "pakistani" : "western";
  let skin: WesternSkin = isWesternSkin(input?.skin ?? "") ? (input!.skin as WesternSkin) : "modern";

  if (input?.style == null && template === "classic") style = "pakistani";
  if (input?.skin == null && isWesternSkin(template ?? "")) skin = template as WesternSkin;

  const pageSize: InvoicePageSize = input?.pageSize === "a5" ? "a5" : "a4";
  const pageOrientation: InvoicePageOrientation =
    input?.pageOrientation === "landscape" ? "landscape" : "portrait";

  return {
    style,
    skin,
    pageSize,
    pageOrientation,
    extraLines: clampExtraLines(input?.extraLines ?? EXTRA_LINES_DEFAULT),
    headerScale: clampHeaderScale(input?.headerScale ?? HEADER_SCALE_DEFAULT),
  };
}

export function resolveInvoicePageBox(print: InvoicePrintSettings): InvoicePageBox {
  const dims = resolvePageDimensions(print.pageSize, print.pageOrientation);
  return {
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    marginMm: INVOICE_PAGE_MARGIN_MM,
    contentWidthMm: Math.max(0, dims.widthMm - 2 * INVOICE_PAGE_MARGIN_MM),
    contentHeightMm: Math.max(0, dims.heightMm - 2 * INVOICE_PAGE_MARGIN_MM),
    sizeId: print.pageSize,
    orientation: print.pageOrientation,
  };
}

export function invoiceCssPageSize(box: InvoicePageBox): string {
  return `${box.widthMm}mm ${box.heightMm}mm`;
}

export function invoicePuppeteerFormat(print: InvoicePrintSettings): "A4" | "A5" {
  return puppeteerPaperFormat(print.pageSize) === "A5" ? "A5" : "A4";
}

export function westernColumnTemplate(): string {
  return `minmax(0,1fr) ${WESTERN_COL.qtyPx}px ${WESTERN_COL.pricePx}px ${WESTERN_COL.discPx}px ${WESTERN_COL.amountPx}px`;
}

export function resolveExtraLines(print: InvoicePrintSettings): ExtraLinesResult {
  const extraLines = clampExtraLines(print.extraLines);
  if (print.style === "pakistani") {
    return {
      extraLines,
      spacerMm: 0,
      blankRowCount: extraLines,
      blankRowMm: PAKISTANI_BLANK_ROW_MM,
    };
  }
  return {
    extraLines,
    spacerMm: extraLines * WESTERN_EXTRA_LINE_MM,
    blankRowCount: 0,
    blankRowMm: PAKISTANI_BLANK_ROW_MM,
  };
}

export function displayTaxName(name: string, lang: InvoiceLanguage): string {
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.toLowerCase() === "tax" || trimmed === "ٹیکس") {
    return lang === "ur" ? "ٹیکس" : "Tax";
  }
  return trimmed;
}

export function invoiceVocab(lang: InvoiceLanguage) {
  const ur = lang === "ur";
  return {
    invoice: ur ? "انوائس" : "INVOICE",
    billTo: ur ? "بل وصول کنندہ" : "BILL TO",
    desc: ur ? "تفصیل" : "Description",
    qty: ur ? "مقدار" : "Qty",
    price: ur ? "فی یونٹ قیمت" : "Unit Price",
    disc: ur ? "چھوٹ" : "Disc",
    amount: ur ? "رقم" : "Amount",
    subtotal: ur ? "ذیلی کل" : "Subtotal",
    discount: ur ? "دی گئی چھوٹ" : "Discount Given",
    tax: ur ? "ٹیکس" : "Tax",
    total: ur ? "کل" : "Total",
    totalCls: ur ? "کل رقم" : "TOTAL",
    notes: ur ? "نوٹس" : "Notes",
    terms: ur ? "شرائط و ضوابط" : "Terms & Conditions",
    date: ur ? "تاریخ" : "Date",
    due: ur ? "آخری تاریخ" : "Due Date",
    dDate: ur ? "آخری تاریخ" : "D. Date",
    authSig: ur ? "دستخط" : "Authorized Signature",
    recvSig: ur ? "وصول کنندہ کے دستخط" : "Receiver Signature",
    companySig: ur ? "کمپنی کے دستخط" : "Authorized Signature",
    stamp: ur ? "مہر" : "STAMP",
    noteLbl: ur ? "نوٹ:" : "Note:",
    termsLbl: ur ? "شرائط:" : "Terms:",
    payterms: ur ? "ادائیگی کی شرائط" : "Payment Terms",
    to: ur ? "بنام" : "To",
    ms: ur ? "بنام" : "M/s.",
    sno: ur ? "نمبر" : "S. No.",
    partic: ur ? "تفصیل" : "Particulars",
    rate: ur ? "نرخ" : "Rate",
    invNum: ur ? "انوائس نمبر" : "Invoice #",
    amountInWords: ur ? "رقم الفاظ میں" : "Amount in words",
    advance: ur ? "ایڈوانس" : "Advance",
    balance: ur ? "بقایا" : "Balance",
    businessFallback: ur ? "آپ کا کاروباری نام" : "Your Business Name",
    clientFallback: ur ? "موصول کنندہ" : "Client Name",
  };
}
