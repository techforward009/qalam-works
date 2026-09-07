/**
 * Shared invoice document HTML (no filesystem). Used by live preview and PDF.
 * Preview and PDF therefore share page geometry, column tracks, signature
 * stack, footer, and fill-page / manual-gap behaviour.
 */
import {
  calculateInvoice,
  combinedDiscount,
  fromMinor,
  lineDiscountLabel,
  type Invoice,
} from "./invoiceEngine";
import {
  displayTaxName,
  invoiceChrome,
  invoiceCssPageSize,
  invoiceVocab,
  resolveBodyGap,
  resolveInvoicePageBox,
  resolveInvoicePrintSettings,
  WESTERN_COL,
  PAKISTANI_COL,
  INVOICE_PAGE_MARGIN_MM,
  INVOICE_SAFE_BOTTOM_INSET_MM,
  type Alignment,
  type BodyGapResult,
  type FillPageInput,
  type InvoiceLanguage,
  type InvoicePageBox,
  type InvoicePrintSettings,
  type SizeOption,
} from "./invoiceLayout";

export interface LogoState {
  src: string | null;
  align: Alignment;
  size: SizeOption;
}
export interface SigState {
  name: string;
  designation: string;
  image: string | null;
  stampImage: string | null;
  align: Alignment;
  size: SizeOption;
}

export interface InvoiceExportPayload {
  invoice: Invoice;
  invoiceLang: InvoiceLanguage;
  logo: LogoState;
  sig: SigState;
  print?: Partial<InvoicePrintSettings>;
  /** @deprecated use print.style / print.skin — classic maps to pakistani */
  template?: "modern" | "minimal" | "corporate" | "classic";
}

const LOGO_H: Record<SizeOption, number> = { small: 36, medium: 52, large: 72 };
const SIG_H: Record<SizeOption, number> = { small: 50, medium: 90, large: 140 };

export function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function fmtNum(n: number, lang: InvoiceLanguage): string {
  try {
    return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", {
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toString();
  }
}

function fmtPrice(n: number, lang: InvoiceLanguage): string {
  try {
    return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

function fmt(minor: number, currency: string, lang: InvoiceLanguage): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", {
      style: "currency", currency: currency || "USD", minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${fromMinor(minor, 2)} ${currency}`;
  }
}

function alignFlex(align: Alignment): string {
  return align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
}

function fillInputFromInvoice(invoice: Invoice, result: ReturnType<typeof calculateInvoice>, sig: SigState): FillPageInput {
  const shownDiscount = combinedDiscount(result);
  return {
    itemCount: Math.max(1, invoice.items?.length || 1),
    hasDiscount: shownDiscount > 0,
    taxCount: result.taxes.filter(t => t.amount !== 0).length,
    hasNotes: Boolean(invoice.notes?.trim()),
    hasTerms: Boolean(invoice.terms?.trim()),
    hasAmountInWords: Boolean(invoice.amountInWords?.trim()),
    hasFooter: Boolean(invoice.footer?.trim()),
    hasSignatureImage: Boolean(sig.image),
  };
}

function logoHtml(logo: LogoState, marginBottom: number): string {
  if (!logo.src) return "";
  return `<div style="display:flex;justify-content:${alignFlex(logo.align)};margin-bottom:${marginBottom}px;">
    <img src="${esc(logo.src)}" alt="logo" style="height:${LOGO_H[logo.size]}px;max-width:180px;object-fit:contain;" />
  </div>`;
}

/** image → line → caption → name / title → stamp */
function sigHtml(sig: SigState, lang: InvoiceLanguage, naskh: string): string {
  const V = invoiceVocab(lang);
  const h = SIG_H[sig.size];
  const ta = sig.align;
  const imgPart = sig.image
    ? `<div style="display:flex;justify-content:${alignFlex(sig.align)};margin-bottom:0;">
        <img src="${esc(sig.image)}" alt="signature"
          style="height:${h}px;max-width:180px;max-height:${h}px;object-fit:contain;object-position:bottom;display:block;" /></div>`
    : `<div data-sig-space="true" style="height:${Math.round(h * 0.4)}px;"></div>`;
  const stampPart = sig.stampImage
    ? `<div style="margin-top:8px;display:flex;justify-content:${alignFlex(sig.align)};">
        <img src="${esc(sig.stampImage)}" alt="stamp" style="height:60px;max-width:80px;object-fit:contain;opacity:0.85;display:block;" /></div>`
    : "";
  return `
  <div data-sig-block="true" data-sig-caption="below-line" style="display:flex;justify-content:${alignFlex(sig.align)};">
    <div style="text-align:${ta};min-width:180px;">
      ${imgPart}
      <div style="border-bottom:1.5px solid #374151;margin:0 0 4px;max-width:180px;"></div>
      <p data-sig-caption-text="true" style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:#374151;margin:0 0 2px;${naskh}">${esc(V.authSig)}</p>
      ${sig.name ? `<p style="font-size:11px;font-weight:700;color:#111827;margin:2px 0;${naskh}">${esc(sig.name)}</p>` : ""}
      ${sig.designation ? `<p style="font-size:10px;color:#6B7280;margin:1px 0;${naskh}">${esc(sig.designation)}</p>` : ""}
      ${stampPart}
    </div>
  </div>`;
}

function footerHtml(text: string, naskh: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return `<div data-invoice-footer="true" style="margin-top:auto;padding-top:8px;padding-bottom:${INVOICE_SAFE_BOTTOM_INSET_MM}mm;border-top:1px solid #E5E7EB;font-size:10px;color:#4B5563;text-align:center;white-space:pre-wrap;${naskh}">${esc(trimmed)}</div>`;
}

function amountInWordsBlock(text: string, lang: InvoiceLanguage, naskh: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const V = invoiceVocab(lang);
  return `<div data-amount-in-words="true" style="margin-top:10px;font-size:11px;color:#374151;${naskh}"><strong>${esc(V.amountInWords)}:</strong> ${esc(trimmed)}</div>`;
}

function westernColgroup(): string {
  return `<colgroup>
    <col>
    <col style="width:${WESTERN_COL.qtyPx}px">
    <col style="width:${WESTERN_COL.pricePx}px">
    <col style="width:${WESTERN_COL.discPx}px">
    <col style="width:${WESTERN_COL.amountPx}px">
  </colgroup>`;
}

function pakistaniColgroup(): string {
  return `<colgroup>
    <col style="width:${PAKISTANI_COL.sno}">
    <col>
    <col style="width:${PAKISTANI_COL.qty}">
    <col style="width:${PAKISTANI_COL.rate}">
    <col style="width:${PAKISTANI_COL.disc}">
    <col style="width:${PAKISTANI_COL.amount}">
  </colgroup>`;
}

function westernInner(
  invoice: Invoice,
  invoiceLang: InvoiceLanguage,
  logo: LogoState,
  sig: SigState,
  print: InvoicePrintSettings,
  gap: BodyGapResult,
): string {
  const result = calculateInvoice(invoice);
  const P = invoiceChrome(print);
  const dir = invoiceLang === "ur" ? "rtl" : "ltr";
  const naskh = invoiceLang === "ur" ? `font-family:'Noto Nastaliq Urdu',serif;line-height:2.2;` : "";
  const V = invoiceVocab(invoiceLang);
  const shownDiscount = combinedDiscount(result);
  const hasDiscount = shownDiscount > 0;
  const taxes = result.taxes.filter(t => t.amount !== 0);
  const headerFlexDir = dir === "rtl" ? "row-reverse" : "row";
  const docTextAlign = dir === "rtl" ? "left" : "right";
  const billPad = dir === "rtl" ? "padding-right:24px;" : "padding-left:24px;";

  const itemRows = invoice.items.map((it, i) => `
    <tr style="border-bottom:1px solid #F3F4F6;">
      <td style="padding:7px 4px;color:#374151;text-align:start;${naskh}">${esc(it.description || "—")}</td>
      <td style="padding:7px 4px;color:#6B7280;text-align:right;" dir="ltr">${fmtNum(it.quantity, invoiceLang)}</td>
      <td style="padding:7px 4px;color:#6B7280;text-align:right;" dir="ltr">${fmtPrice(it.unitPrice, invoiceLang)}</td>
      <td style="padding:7px 4px;text-align:right;${lineDiscountLabel(it) === "—" ? "color:#9CA3AF;" : "color:#DC2626;"}" dir="ltr">${esc(lineDiscountLabel(it))}</td>
      <td data-col="amount" style="padding:7px 4px;font-weight:600;color:#111827;text-align:right;" dir="ltr">${fmtPrice(parseFloat(fromMinor(result.lineTotals[i] || 0, 2)), invoiceLang)}</td>
    </tr>`).join("");

  const totalsRows = `
    <tr data-totals-row="subtotal">
      <td colspan="4" style="padding:6px 8px;text-align:end;color:#6B7280;font-size:12px;${naskh}">${esc(V.subtotal)}</td>
      <td data-col="amount" style="padding:6px 4px;text-align:right;color:#6B7280;font-size:12px;" dir="ltr">${fmt(result.grossSubtotal, invoice.currency, invoiceLang)}</td>
    </tr>
    ${hasDiscount ? `
    <tr data-totals-row="discount">
      <td colspan="4" style="padding:6px 8px;text-align:end;color:#6B7280;font-size:12px;${naskh}">${esc(V.discount)}</td>
      <td data-col="amount" style="padding:6px 4px;text-align:right;color:#DC2626;font-size:12px;" dir="ltr">−${fmt(shownDiscount, invoice.currency, invoiceLang)}</td>
    </tr>` : ""}
    ${taxes.map(t => `
    <tr data-totals-row="tax">
      <td colspan="4" style="padding:6px 8px;text-align:end;color:#6B7280;font-size:12px;${naskh}">${esc(displayTaxName(t.name, invoiceLang))}</td>
      <td data-col="amount" style="padding:6px 4px;text-align:right;color:#6B7280;font-size:12px;" dir="ltr">${fmt(t.amount, invoice.currency, invoiceLang)}</td>
    </tr>`).join("")}
    <tr data-totals-row="total">
      <td colspan="4" style="padding:8px 8px 4px;text-align:end;font-weight:800;font-size:14px;color:${P.accent};border-top:2px solid ${P.accent};${naskh}">${esc(V.total)}</td>
      <td data-col="amount" style="padding:8px 4px 4px;text-align:right;font-weight:800;font-size:14px;color:${P.accent};border-top:2px solid ${P.accent};" dir="ltr">${fmt(result.total, invoice.currency, invoiceLang)}</td>
    </tr>`;

  return `
    <div style="background:${P.headerBg};border-bottom:3px solid ${P.accent};margin:${-INVOICE_PAGE_MARGIN_MM}mm ${-INVOICE_PAGE_MARGIN_MM}mm 16px;padding:16px ${INVOICE_PAGE_MARGIN_MM}mm 14px;">
      ${logoHtml(logo, 8)}
      <div style="display:flex;flex-direction:${headerFlexDir};justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <h2 style="font-size:18px;font-weight:800;color:${P.headerText};margin:0 0 4px;${naskh}">
            ${esc(invoice.seller.name || V.businessFallback)}
          </h2>
          ${invoice.seller.address ? `<p style="font-size:11px;color:#6B7280;margin:0 0 2px;white-space:pre-wrap;${naskh}">${esc(invoice.seller.address)}</p>` : ""}
          <p style="font-size:11px;color:#9CA3AF;margin:0;" dir="ltr">
            ${esc([invoice.seller.phone, invoice.seller.email].filter(Boolean).join("  ·  "))}
          </p>
          ${invoice.seller.website ? `<p style="font-size:10px;color:#9CA3AF;margin:0;" dir="ltr">${esc(invoice.seller.website)}</p>` : ""}
          ${invoice.seller.taxNumber ? `<p style="font-size:10px;color:#9CA3AF;margin:0;" dir="ltr">${esc(invoice.seller.taxNumber)}</p>` : ""}
        </div>
        <div style="flex-shrink:0;${billPad}text-align:${docTextAlign};">
          <p style="font-size:24px;font-weight:900;color:${P.accent};margin:0 0 4px;letter-spacing:-0.02em;${naskh}">${esc(V.invoice)}</p>
          <p style="font-size:12px;font-weight:600;color:#374151;margin:0 0 4px;" dir="ltr">${esc(invoice.number)}</p>
          <p style="font-size:11px;color:#6B7280;margin:0;"><span style="${naskh}font-weight:600;">${esc(V.date)}: </span><span dir="ltr">${esc(invoice.issueDate)}</span></p>
          ${invoice.dueDate ? `<p style="font-size:11px;color:#6B7280;margin:0;"><span style="${naskh}font-weight:600;">${esc(V.due)}: </span><span dir="ltr">${esc(invoice.dueDate)}</span></p>` : ""}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;direction:${dir};">
      <div>
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;">${esc(V.billTo)}</p>
        <p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 2px;${naskh}">${esc(invoice.client.name || V.clientFallback)}</p>
        ${invoice.client.contactPerson ? `<p style="font-size:11px;color:#374151;margin:1px 0;${naskh}">${esc(invoice.client.contactPerson)}</p>` : ""}
        ${invoice.client.address ? `<p style="font-size:11px;color:#6B7280;white-space:pre-wrap;margin:1px 0;${naskh}">${esc(invoice.client.address)}</p>` : ""}
        ${invoice.client.email ? `<p style="font-size:11px;color:#6B7280;margin:1px 0;" dir="ltr">${esc(invoice.client.email)}</p>` : ""}
        ${invoice.client.phone ? `<p style="font-size:11px;color:#6B7280;margin:1px 0;" dir="ltr">${esc(invoice.client.phone)}</p>` : ""}
      </div>
      ${invoice.terms ? `
      <div>
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;">${esc(V.payterms)}</p>
        <p style="font-size:11px;color:#374151;${naskh}">${esc(invoice.terms)}</p>
      </div>` : ""}
    </div>

    <table data-invoice-table="western" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;direction:${dir};">
      ${westernColgroup()}
      <thead>
        <tr style="border-bottom:2px solid ${P.accent};">
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:start;${naskh}">${esc(V.desc)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;">${esc(V.qty)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;">${esc(V.price)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;">${esc(V.disc)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;">${esc(V.amount)}</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div data-body-gap="true" data-gap-mode="${gap.mode}" data-gap-mm="${gap.spacerMm}" style="height:${gap.spacerMm}mm;flex-shrink:0;"></div>

    <table data-totals="column-aligned" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;direction:${dir};">
      ${westernColgroup()}
      <tbody>${totalsRows}</tbody>
    </table>

    ${amountInWordsBlock(invoice.amountInWords || "", invoiceLang, naskh)}

    ${invoice.notes?.trim() ? `
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #F3F4F6;">
      <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;${naskh}">${esc(V.notes)}</p>
      <p style="font-size:11px;color:#374151;white-space:pre-wrap;${naskh}">${esc(invoice.notes)}</p>
    </div>` : ""}

    <div style="margin-top:24px;padding-top:8px;">
      ${sigHtml(sig, invoiceLang, naskh)}
    </div>
    ${footerHtml(invoice.footer || "", naskh)}
  `;
}

function pakistaniInner(
  invoice: Invoice,
  invoiceLang: InvoiceLanguage,
  logo: LogoState,
  sig: SigState,
  _print: InvoicePrintSettings,
  gap: BodyGapResult,
): string {
  const result = calculateInvoice(invoice);
  const dir = invoiceLang === "ur" ? "rtl" : "ltr";
  const naskh = invoiceLang === "ur" ? `font-family:'Noto Nastaliq Urdu',serif;line-height:2.2;` : "";
  const V = invoiceVocab(invoiceLang);
  const shownDiscount = combinedDiscount(result);
  const hasDiscount = shownDiscount > 0;
  const taxes = result.taxes.filter(t => t.amount !== 0);
  const cell = "border:1px solid #111827;padding:6px 8px;";

  const blankRows = Array.from({ length: gap.blankRowCount }).map((_, i) => {
    const h = i === gap.blankRowCount - 1 ? gap.lastBlankRowMm : gap.blankRowMm;
    return `<tr data-blank-row="true" style="height:${h}mm;">
      ${Array.from({ length: 6 }).map(() => `<td style="${cell}height:${h}mm;">&nbsp;</td>`).join("")}
    </tr>`;
  }).join("");

  const itemRows = invoice.items.map((it, i) => `
    <tr>
      <td style="${cell}text-align:center;" dir="ltr">${i + 1}</td>
      <td style="${cell}text-align:start;${naskh}">${esc(it.description || "—")}</td>
      <td style="${cell}text-align:center;" dir="ltr">${fmtNum(it.quantity, invoiceLang)}</td>
      <td style="${cell}text-align:right;" dir="ltr">${fmtPrice(it.unitPrice, invoiceLang)}</td>
      <td style="${cell}text-align:right;${lineDiscountLabel(it) === "—" ? "color:#6B7280;" : "color:#DC2626;"}" dir="ltr">${esc(lineDiscountLabel(it))}</td>
      <td data-col="amount" style="${cell}text-align:right;font-weight:600;" dir="ltr">${fmtPrice(parseFloat(fromMinor(result.lineTotals[i] || 0, 2)), invoiceLang)}</td>
    </tr>`).join("");

  const moneyRows = `
    ${hasDiscount ? `
    <tr data-totals-row="discount">
      <td colspan="5" style="${cell}text-align:end;font-weight:700;font-size:12px;${naskh}">${esc(V.discount)}</td>
      <td data-col="amount" style="${cell}text-align:right;font-weight:700;font-size:12px;color:#DC2626;" dir="ltr">−${fmt(shownDiscount, invoice.currency, invoiceLang)}</td>
    </tr>` : ""}
    ${taxes.map(t => `
    <tr data-totals-row="tax">
      <td colspan="5" style="${cell}text-align:end;font-weight:700;font-size:12px;${naskh}">${esc(displayTaxName(t.name, invoiceLang))}</td>
      <td data-col="amount" style="${cell}text-align:right;font-weight:700;font-size:12px;" dir="ltr">${fmt(t.amount, invoice.currency, invoiceLang)}</td>
    </tr>`).join("")}
    <tr data-totals-row="total" style="background:#F3F4F6;">
      <td colspan="5" style="${cell}text-align:end;font-weight:800;font-size:13px;${naskh}">${esc(V.totalCls)}</td>
      <td data-col="amount" style="${cell}text-align:right;font-weight:800;font-size:13px;" dir="ltr">${fmt(result.total, invoice.currency, invoiceLang)}</td>
    </tr>
    ${invoice.amountInWords?.trim() ? `
    <tr data-amount-in-words="true">
      <td colspan="6" style="${cell}text-align:start;font-size:11px;${naskh}"><strong>${esc(V.amountInWords)}:</strong> ${esc(invoice.amountInWords.trim())}</td>
    </tr>` : ""}
  `;

  const manualGap = gap.mode === "manual"
    ? `<div data-body-gap="true" data-gap-mode="manual" data-gap-mm="${gap.spacerMm}" style="height:${gap.spacerMm}mm;"></div>`
    : `<div data-body-gap="true" data-gap-mode="fill" data-blank-rows="${gap.blankRowCount}" style="display:none;"></div>`;

  return `
    ${logoHtml(logo, 6)}
    <div style="text-align:center;margin-bottom:12px;border-bottom:2px solid #111827;padding-bottom:10px;">
      <h2 style="font-size:17px;font-weight:800;color:#111827;margin:0 0 3px;${naskh}">
        ${esc(invoice.seller.name || V.businessFallback)}
      </h2>
      ${invoice.seller.address ? `<p style="font-size:11px;color:#374151;margin:2px 0;${naskh}">${esc(invoice.seller.address)}</p>` : ""}
      <p style="font-size:11px;color:#374151;margin:2px 0;" dir="ltr">
        ${esc([invoice.seller.phone, invoice.seller.email, invoice.seller.website].filter(Boolean).join("  |  "))}
      </p>
    </div>
    <p style="text-align:center;font-size:15px;font-weight:900;letter-spacing:0.15em;color:#111827;margin:8px 0 12px;${naskh}">
      ${esc(V.invoice)}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px;direction:${dir};">
      <tbody>
        <tr>
          <td style="${cell}font-weight:700;width:14%;white-space:nowrap;${naskh}">${esc(V.to)}</td>
          <td style="${cell}width:44%;${naskh}">
            ${esc(invoice.client.name || "—")}
            ${invoice.client.address ? `<span style="color:#6B7280;font-size:10px;"> — ${esc(invoice.client.address)}</span>` : ""}
          </td>
          <td style="${cell}font-weight:700;width:14%;white-space:nowrap;${naskh}">${esc(V.date)}</td>
          <td style="${cell}" dir="ltr">${esc(invoice.issueDate)}</td>
        </tr>
        <tr>
          <td style="${cell}font-weight:700;${naskh}">${esc(V.invNum)}</td>
          ${invoice.dueDate
            ? `<td style="${cell}" dir="ltr">${esc(invoice.number)}</td>
               <td style="${cell}font-weight:700;${naskh}">${esc(V.due)}</td>
               <td style="${cell}" dir="ltr">${esc(invoice.dueDate)}</td>`
            : `<td colspan="3" style="${cell}" dir="ltr">${esc(invoice.number)}</td>`
          }
        </tr>
      </tbody>
    </table>
    <table data-invoice-table="pakistani" data-totals="table-rows" style="width:100%;border-collapse:collapse;font-size:12px;direction:${dir};">
      ${pakistaniColgroup()}
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="${cell}text-align:center;font-weight:700;${naskh}">${esc(V.sno)}</th>
          <th style="${cell}text-align:start;font-weight:700;${naskh}">${esc(V.partic)}</th>
          <th style="${cell}text-align:center;font-weight:700;${naskh}">${esc(V.qty)}</th>
          <th style="${cell}text-align:right;font-weight:700;${naskh}">${esc(V.rate)}</th>
          <th style="${cell}text-align:right;font-weight:700;${naskh}">${esc(V.disc)}</th>
          <th style="${cell}text-align:right;font-weight:700;${naskh}">${esc(V.amount)}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${blankRows}
        ${moneyRows}
      </tbody>
    </table>
    ${manualGap}
    ${(invoice.notes?.trim() || invoice.terms?.trim()) ? `
      <div style="margin-top:8px;font-size:11px;color:#374151;">
        ${invoice.notes?.trim() ? `<p style="${naskh}"><strong>${esc(V.noteLbl)}</strong> ${esc(invoice.notes)}</p>` : ""}
        ${invoice.terms?.trim() ? `<p style="margin-top:3px;${naskh}"><strong>${esc(V.termsLbl)}</strong> ${esc(invoice.terms)}</p>` : ""}
      </div>` : ""}
    <div style="margin-top:20px;">
      ${sigHtml(sig, invoiceLang, naskh)}
    </div>
    ${footerHtml(invoice.footer || "", naskh)}
  `;
}

export interface BuiltInvoiceDocument {
  print: InvoicePrintSettings;
  box: InvoicePageBox;
  gap: BodyGapResult;
  dir: "rtl" | "ltr";
  innerHtml: string;
  pageHtml: string;
}

export function buildInvoiceDocument(payload: InvoiceExportPayload): BuiltInvoiceDocument {
  const print = resolveInvoicePrintSettings({
    ...payload.print,
    template: payload.template,
  });
  const box = resolveInvoicePageBox(print);
  const result = calculateInvoice(payload.invoice);
  const fill = fillInputFromInvoice(payload.invoice, result, payload.sig);
  const gap = resolveBodyGap(print, box, fill);
  const dir = payload.invoiceLang === "ur" ? "rtl" : "ltr";
  const innerHtml = print.style === "pakistani"
    ? pakistaniInner(payload.invoice, payload.invoiceLang, payload.logo, payload.sig, print, gap)
    : westernInner(payload.invoice, payload.invoiceLang, payload.logo, payload.sig, print, gap);

  const fillHeight = print.bodyGapMode === "fill";
  const pageHtml = `<div class="invoice-page"
    data-invoice-style="${print.style}"
    data-page-size="${print.pageSize}"
    data-page-orientation="${print.pageOrientation}"
    data-body-gap-mode="${print.bodyGapMode}"
    data-body-gap-mm="${print.bodyGapMode === "manual" ? print.bodyGapMm : gap.spacerMm}"
    data-blank-rows="${gap.blankRowCount}"
    data-skin="${print.skin}"
    dir="${dir}"
    style="width:${box.widthMm}mm;${fillHeight ? `height:${box.heightMm}mm;overflow:hidden;` : `min-height:${box.heightMm}mm;`}padding:${box.marginMm}mm;box-sizing:border-box;background:#ffffff;color:#111827;display:flex;flex-direction:column;">
    ${innerHtml}
  </div>`;

  return { print, box, gap, dir, innerHtml, pageHtml };
}

export function invoiceDocumentCss(box: InvoicePageBox, fontFamily: string): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{
  font-family:${fontFamily};
  font-size:14px;
  color:#111827;
  background:#ffffff;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
@page{size:${invoiceCssPageSize(box)};margin:0;}
`;
}
