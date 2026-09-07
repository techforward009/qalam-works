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
export type BodyGapMode = "manual" | "fill";
export type InvoiceLanguage = "en" | "ur";
export type Alignment = "left" | "center" | "right";
export type SizeOption = "small" | "medium" | "large";

export interface InvoicePrintSettings {
  style: InvoiceStyle;
  skin: WesternSkin;
  pageSize: InvoicePageSize;
  pageOrientation: InvoicePageOrientation;
  bodyGapMode: BodyGapMode;
  bodyGapMm: number;
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

export interface FillPageInput {
  itemCount: number;
  hasDiscount: boolean;
  taxCount: number;
  hasNotes: boolean;
  hasTerms: boolean;
  hasAmountInWords: boolean;
  hasFooter: boolean;
  hasSignatureImage: boolean;
}

export interface BodyGapResult {
  mode: BodyGapMode;
  spacerMm: number;
  blankRowCount: number;
  blankRowMm: number;
  lastBlankRowMm: number;
  leftoverMm: number;
}

export const INVOICE_PAGE_MARGIN_MM = 12;
export const INVOICE_SAFE_BOTTOM_INSET_MM = 4;
export const BODY_GAP_MIN_MM = 0;
export const BODY_GAP_MAX_MM = 60;
export const BODY_GAP_DEFAULT_MM = 12;
export const PAKISTANI_BLANK_ROW_MM = 8;

export const DEFAULT_INVOICE_PRINT: InvoicePrintSettings = {
  style: "western",
  skin: "modern",
  pageSize: "a4",
  pageOrientation: "portrait",
  bodyGapMode: "manual",
  bodyGapMm: BODY_GAP_DEFAULT_MM,
};

/** Western item-table tracks — totals use the same definition. */
export const WESTERN_COL = {
  qtyPx: 40,
  pricePx: 70,
  discPx: 56,
  amountPx: 80,
} as const;

export const PAKISTANI_COL = {
  sno: "7%",
  qty: "8%",
  rate: "12%",
  disc: "10%",
  amount: "14%",
} as const;

/** Deterministic used-height estimates (mm). Gap / blank rows are NOT included. */
export const USED_HEIGHT_MM = {
  western: {
    header: 30,
    billTo: 22,
    tableHeader: 8,
    itemRow: 7.5,
    totalsRow: 6,
    amountInWords: 8,
    notes: 14,
    terms: 12,
    signature: 26,
    signatureWithImage: 34,
    footer: 10,
  },
  pakistani: {
    header: 28,
    meta: 14,
    tableHeader: 7,
    itemRow: 7,
    totalsRow: 6.5,
    amountInWords: 8,
    notes: 12,
    terms: 10,
    signature: 26,
    signatureWithImage: 34,
    footer: 10,
  },
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

export function clampBodyGapMm(value: number): number {
  if (!Number.isFinite(value)) return BODY_GAP_DEFAULT_MM;
  return Math.min(BODY_GAP_MAX_MM, Math.max(BODY_GAP_MIN_MM, Math.round(value)));
}

export function isWesternSkin(value: string): value is WesternSkin {
  return value === "modern" || value === "minimal" || value === "corporate";
}

export function resolveInvoicePrintSettings(
  input?: Partial<InvoicePrintSettings> & { template?: string },
): InvoicePrintSettings {
  const template = input?.template;
  let style: InvoiceStyle = input?.style === "pakistani" ? "pakistani" : "western";
  let skin: WesternSkin = isWesternSkin(input?.skin ?? "") ? (input!.skin as WesternSkin) : "modern";

  if (input?.style == null && template === "classic") style = "pakistani";
  if (input?.skin == null && isWesternSkin(template ?? "")) skin = template as WesternSkin;

  const pageSize: InvoicePageSize = input?.pageSize === "a5" ? "a5" : "a4";
  const pageOrientation: InvoicePageOrientation =
    input?.pageOrientation === "landscape" ? "landscape" : "portrait";
  const bodyGapMode: BodyGapMode = input?.bodyGapMode === "fill" ? "fill" : "manual";

  return {
    style,
    skin,
    pageSize,
    pageOrientation,
    bodyGapMode,
    bodyGapMm: clampBodyGapMm(input?.bodyGapMm ?? BODY_GAP_DEFAULT_MM),
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

export function westernTotalsRowCount(input: Pick<FillPageInput, "hasDiscount" | "taxCount">): number {
  return 1 + (input.hasDiscount ? 1 : 0) + input.taxCount + 1;
}

export function pakistaniTotalsRowCount(input: Pick<FillPageInput, "hasDiscount" | "taxCount">): number {
  return (input.hasDiscount ? 1 : 0) + input.taxCount + 1;
}

export function estimateUsedHeightMm(style: InvoiceStyle, input: FillPageInput): number {
  const H = USED_HEIGHT_MM[style];
  const sig = input.hasSignatureImage ? H.signatureWithImage : H.signature;
  let used = H.tableHeader
    + input.itemCount * H.itemRow
    + (style === "western" ? westernTotalsRowCount(input) : pakistaniTotalsRowCount(input)) * H.totalsRow
    + (input.hasAmountInWords ? H.amountInWords : 0)
    + (input.hasNotes ? H.notes : 0)
    + (input.hasTerms ? H.terms : 0)
    + sig
    + (input.hasFooter ? H.footer : 0)
    + INVOICE_SAFE_BOTTOM_INSET_MM;

  if (style === "western") used += USED_HEIGHT_MM.western.header + USED_HEIGHT_MM.western.billTo;
  else used += USED_HEIGHT_MM.pakistani.header + USED_HEIGHT_MM.pakistani.meta;

  return used;
}

export function resolveBodyGap(
  print: InvoicePrintSettings,
  box: InvoicePageBox,
  input: FillPageInput,
): BodyGapResult {
  if (print.bodyGapMode === "manual") {
    return {
      mode: "manual",
      spacerMm: clampBodyGapMm(print.bodyGapMm),
      blankRowCount: 0,
      blankRowMm: PAKISTANI_BLANK_ROW_MM,
      lastBlankRowMm: 0,
      leftoverMm: 0,
    };
  }

  const used = estimateUsedHeightMm(print.style, input);
  const leftoverMm = Math.max(0, box.contentHeightMm - used);

  if (print.style === "western") {
    return {
      mode: "fill",
      spacerMm: leftoverMm,
      blankRowCount: 0,
      blankRowMm: PAKISTANI_BLANK_ROW_MM,
      lastBlankRowMm: 0,
      leftoverMm,
    };
  }

  if (leftoverMm < 1) {
    return {
      mode: "fill",
      spacerMm: 0,
      blankRowCount: 0,
      blankRowMm: PAKISTANI_BLANK_ROW_MM,
      lastBlankRowMm: 0,
      leftoverMm,
    };
  }

  const count = Math.max(1, Math.floor(leftoverMm / PAKISTANI_BLANK_ROW_MM));
  const lastBlankRowMm = leftoverMm - (count - 1) * PAKISTANI_BLANK_ROW_MM;
  return {
    mode: "fill",
    spacerMm: 0,
    blankRowCount: count,
    blankRowMm: PAKISTANI_BLANK_ROW_MM,
    lastBlankRowMm,
    leftoverMm,
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
    authSig: ur ? "دستخط" : "Authorized Signature",
    stamp: ur ? "مہر" : "STAMP",
    noteLbl: ur ? "نوٹ:" : "Note:",
    termsLbl: ur ? "شرائط:" : "Terms:",
    payterms: ur ? "ادائیگی کی شرائط" : "Payment Terms",
    to: ur ? "بنام" : "To",
    sno: ur ? "نمبر" : "S. No.",
    partic: ur ? "تفصیل" : "Particulars",
    rate: ur ? "نرخ" : "Rate",
    invNum: ur ? "انوائس نمبر" : "Invoice #",
    amountInWords: ur ? "رقم الفاظ میں" : "Amount in words",
    businessFallback: ur ? "آپ کا کاروباری نام" : "Your Business Name",
    clientFallback: ur ? "موصول کنندہ" : "Client Name",
  };
}
