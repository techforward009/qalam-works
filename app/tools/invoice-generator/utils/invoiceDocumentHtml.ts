/**
 * Shared invoice document HTML (no filesystem). Used by live preview and PDF.
 * Preview and PDF therefore share page geometry, column tracks, signature
 * stack, footer, extra lines, and header scale.
 */
import {
  calculateInvoice,
  combinedDiscount,
  formatInvoiceMinor,
  formatInvoicePrice,
  lineDiscountLabel,
  type Invoice,
} from "./invoiceEngine";
import {
  displayTaxName,
  invoiceChrome,
  invoiceCssPageSize,
  invoiceVocab,
  resolveExtraLines,
  resolveInvoicePageBox,
  resolveInvoicePrintSettings,
  WESTERN_COL,
  PAKISTANI_COL,
  INVOICE_PAGE_MARGIN_MM,
  INVOICE_SAFE_BOTTOM_INSET_MM,
  type Alignment,
  type ExtraLinesResult,
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
  print?: Partial<InvoicePrintSettings> & { bodyGapMode?: string; bodyGapMm?: number };
  /** @deprecated use print.style / print.skin — classic maps to pakistani */
  template?: "modern" | "minimal" | "corporate" | "classic";
}

const LOGO_H: Record<SizeOption, number> = { small: 36, medium: 52, large: 72 };
const SIG_H: Record<SizeOption, number> = { small: 50, medium: 90, large: 140 };
const SIG_BLOCK_PX = 160;
const AMT_STYLE = "text-align:end;font-variant-numeric:tabular-nums;white-space:nowrap;box-sizing:border-box;";

export function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function scaled(n: number, scale: number): number {
  return Math.max(1, Math.round(n * scale));
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

function fmt(minor: number, currency: string, lang: InvoiceLanguage): string {
  return formatInvoiceMinor(minor, currency, lang, true);
}

function alignFlex(align: Alignment): string {
  return align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
}

function logoHtml(logo: LogoState, marginBottom: number, scale = 1): string {
  if (!logo.src) return "";
  const h = scaled(LOGO_H[logo.size], scale);
  return `<div style="display:flex;justify-content:${alignFlex(logo.align)};margin-bottom:${scaled(marginBottom, scale)}px;">
    <img src="${esc(logo.src)}" alt="logo" style="height:${h}px;max-width:${scaled(180, scale)}px;object-fit:contain;" />
  </div>`;
}

function sigBlock(
  opts: {
    caption: string;
    name?: string;
    designation?: string;
    image?: string | null;
    stampImage?: string | null;
    align: Alignment;
    size: SizeOption;
    naskh: string;
    kind: string;
  },
): string {
  const h = SIG_H[opts.size];
  const ta = opts.align;
  const imgPart = opts.image
    ? `<div style="display:flex;justify-content:${alignFlex(opts.align)};margin-bottom:0;">
        <img src="${esc(opts.image)}" alt="signature"
          style="height:${h}px;max-width:${SIG_BLOCK_PX}px;max-height:${h}px;object-fit:contain;object-position:bottom;display:block;" /></div>`
    : `<div data-sig-space="true" style="height:${Math.round(h * 0.4)}px;"></div>`;
  const stampPart = opts.stampImage
    ? `<div style="margin-top:8px;display:flex;justify-content:${alignFlex(opts.align)};">
        <img src="${esc(opts.stampImage)}" alt="stamp" style="height:60px;max-width:80px;object-fit:contain;opacity:0.85;display:block;" /></div>`
    : "";
  return `
  <div data-sig-block="${esc(opts.kind)}" data-sig-caption="below-line" style="width:${SIG_BLOCK_PX}px;max-width:45%;flex:0 0 ${SIG_BLOCK_PX}px;">
    <div style="text-align:${ta};width:${SIG_BLOCK_PX}px;max-width:100%;">
      ${imgPart}
      <div data-sig-line="true" style="border-bottom:1.5px solid #374151;margin:0 0 4px;width:100%;"></div>
      <p data-sig-caption-text="true" style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:#374151;margin:0 0 2px;${opts.naskh}">${esc(opts.caption)}</p>
      ${opts.name ? `<p style="font-size:11px;font-weight:700;color:#111827;margin:2px 0;${opts.naskh}">${esc(opts.name)}</p>` : ""}
      ${opts.designation ? `<p style="font-size:10px;color:#6B7280;margin:1px 0;${opts.naskh}">${esc(opts.designation)}</p>` : ""}
      ${stampPart}
    </div>
  </div>`;
}

function westernSigHtml(sig: SigState, lang: InvoiceLanguage, naskh: string): string {
  const V = invoiceVocab(lang);
  return `<div style="display:flex;justify-content:${alignFlex(sig.align)};">
    ${sigBlock({
      caption: V.authSig,
      name: sig.name,
      designation: sig.designation,
      image: sig.image,
      stampImage: sig.stampImage,
      align: sig.align,
      size: sig.size,
      naskh,
      kind: "authorized",
    })}
  </div>`;
}

function pakistaniSigHtml(sig: SigState, lang: InvoiceLanguage, naskh: string): string {
  const V = invoiceVocab(lang);
  return `<div data-sig-pair="true" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:20px;">
    ${sigBlock({
      caption: V.recvSig,
      align: "center",
      size: sig.size,
      naskh,
      kind: "receiver",
    })}
    ${sigBlock({
      caption: V.companySig,
      name: sig.name,
      designation: sig.designation,
      image: sig.image,
      stampImage: sig.stampImage,
      align: "center",
      size: sig.size,
      naskh,
      kind: "authorized",
    })}
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
  extra: ExtraLinesResult,
): string {
  const result = calculateInvoice(invoice);
  const P = invoiceChrome(print);
  const hs = print.headerScale;
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
      <td style="padding:7px 4px;color:#6B7280;text-align:end;" dir="ltr">${fmtNum(it.quantity, invoiceLang)}</td>
      <td style="padding:7px 4px;color:#6B7280;text-align:end;" dir="ltr">${formatInvoicePrice(it.unitPrice, invoice.currency, invoiceLang)}</td>
      <td style="padding:7px 4px;text-align:end;${lineDiscountLabel(it, invoice.currency) === "—" ? "color:#9CA3AF;" : "color:#DC2626;"}" dir="ltr">${esc(lineDiscountLabel(it, invoice.currency))}</td>
      <td data-col="amount" style="${AMT_STYLE}padding:7px 4px;font-weight:600;color:#111827;font-size:11px;" dir="ltr">${formatInvoiceMinor(result.lineTotals[i] || 0, invoice.currency, invoiceLang)}</td>
    </tr>`).join("");

  const totalsRows = `
    <tr data-totals-row="subtotal">
      <td colspan="4" style="padding:6px 8px;text-align:end;color:#6B7280;font-size:12px;${naskh}">${esc(V.subtotal)}</td>
      <td data-col="amount" style="${AMT_STYLE}padding:6px 4px;color:#6B7280;font-size:11px;" dir="ltr">${fmt(result.grossSubtotal, invoice.currency, invoiceLang)}</td>
    </tr>
    ${hasDiscount ? `
    <tr data-totals-row="discount">
      <td colspan="4" style="padding:6px 8px;text-align:end;color:#6B7280;font-size:12px;${naskh}">${esc(V.discount)}</td>
      <td data-col="amount" style="${AMT_STYLE}padding:6px 4px;color:#DC2626;font-size:11px;" dir="ltr">−${fmt(shownDiscount, invoice.currency, invoiceLang)}</td>
    </tr>` : ""}
    ${taxes.map(t => `
    <tr data-totals-row="tax">
      <td colspan="4" style="padding:6px 8px;text-align:end;color:#6B7280;font-size:12px;${naskh}">${esc(displayTaxName(t.name, invoiceLang))}</td>
      <td data-col="amount" style="${AMT_STYLE}padding:6px 4px;color:#6B7280;font-size:11px;" dir="ltr">${fmt(t.amount, invoice.currency, invoiceLang)}</td>
    </tr>`).join("")}
    <tr data-totals-row="total">
      <td colspan="4" style="padding:8px 8px 4px;text-align:end;font-weight:800;font-size:14px;color:${P.accent};border-top:2px solid ${P.accent};${naskh}">${esc(V.total)}</td>
      <td data-col="amount" style="${AMT_STYLE}padding:8px 4px 4px;font-weight:800;font-size:12px;color:${P.accent};border-top:2px solid ${P.accent};" dir="ltr">${fmt(result.total, invoice.currency, invoiceLang)}</td>
    </tr>`;

  return `
    <div data-invoice-header="true" data-header-scale="${hs}" style="background:${P.headerBg};border-bottom:3px solid ${P.accent};margin:${-INVOICE_PAGE_MARGIN_MM}mm ${-INVOICE_PAGE_MARGIN_MM}mm ${scaled(16, hs)}px;padding:${scaled(16, hs)}px ${INVOICE_PAGE_MARGIN_MM}mm ${scaled(14, hs)}px;">
      ${logoHtml(logo, 8, hs)}
      <div style="display:flex;flex-direction:${headerFlexDir};justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <h2 style="font-size:${scaled(18, hs)}px;font-weight:800;color:${P.headerText};margin:0 0 ${scaled(4, hs)}px;${naskh}">
            ${esc(invoice.seller.name || V.businessFallback)}
          </h2>
          ${invoice.seller.address ? `<p style="font-size:${scaled(11, hs)}px;color:#6B7280;margin:0 0 2px;white-space:pre-wrap;${naskh}">${esc(invoice.seller.address)}</p>` : ""}
          <p style="font-size:${scaled(11, hs)}px;color:#9CA3AF;margin:0;" dir="ltr">
            ${esc([invoice.seller.phone, invoice.seller.email].filter(Boolean).join("  ·  "))}
          </p>
          ${invoice.seller.website ? `<p style="font-size:${scaled(10, hs)}px;color:#9CA3AF;margin:0;" dir="ltr">${esc(invoice.seller.website)}</p>` : ""}
          ${invoice.seller.taxNumber ? `<p style="font-size:${scaled(10, hs)}px;color:#9CA3AF;margin:0;" dir="ltr">${esc(invoice.seller.taxNumber)}</p>` : ""}
        </div>
        <div style="flex-shrink:0;${billPad}text-align:${docTextAlign};">
          <p style="font-size:${scaled(24, hs)}px;font-weight:900;color:${P.accent};margin:0 0 ${scaled(4, hs)}px;letter-spacing:-0.02em;${naskh}">${esc(V.invoice)}</p>
          <p style="font-size:${scaled(12, hs)}px;font-weight:600;color:#374151;margin:0 0 4px;" dir="ltr">${esc(invoice.number)}</p>
          <p style="font-size:${scaled(11, hs)}px;color:#6B7280;margin:0;"><span style="${naskh}font-weight:600;">${esc(V.date)}: </span><span dir="ltr">${esc(invoice.issueDate)}</span></p>
          ${invoice.dueDate ? `<p style="font-size:${scaled(11, hs)}px;color:#6B7280;margin:0;"><span style="${naskh}font-weight:600;">${esc(V.due)}: </span><span dir="ltr">${esc(invoice.dueDate)}</span></p>` : ""}
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
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:end;">${esc(V.qty)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:end;">${esc(V.price)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:end;">${esc(V.disc)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:end;">${esc(V.amount)}</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div data-extra-lines="true" data-extra-lines-count="${extra.extraLines}" data-gap-mm="${extra.spacerMm}" style="height:${extra.spacerMm}mm;flex-shrink:0;"></div>

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
      ${westernSigHtml(sig, invoiceLang, naskh)}
    </div>
    ${footerHtml(invoice.footer || "", naskh)}
  `;
}

function pakistaniInner(
  invoice: Invoice,
  invoiceLang: InvoiceLanguage,
  logo: LogoState,
  sig: SigState,
  print: InvoicePrintSettings,
  extra: ExtraLinesResult,
): string {
  const result = calculateInvoice(invoice);
  const hs = print.headerScale;
  const dir = invoiceLang === "ur" ? "rtl" : "ltr";
  const naskh = invoiceLang === "ur" ? `font-family:'Noto Nastaliq Urdu',serif;line-height:2.2;` : "";
  const V = invoiceVocab(invoiceLang);
  const shownDiscount = combinedDiscount(result);
  const hasDiscount = shownDiscount > 0;
  const taxes = result.taxes.filter(t => t.amount !== 0);
  const advanceMinor = result.amountPaid || 0;
  const showAdvance = advanceMinor > 0;
  const cell = "border:1px solid #111827;padding:6px 8px;";
  const metaCell = "border:1px solid #111827;padding:6px 8px;";

  const blankRows = Array.from({ length: extra.blankRowCount }).map(() => {
    return `<tr data-blank-row="true" style="height:${extra.blankRowMm}mm;">
      ${Array.from({ length: 6 }).map(() => `<td style="${cell}height:${extra.blankRowMm}mm;">&nbsp;</td>`).join("")}
    </tr>`;
  }).join("");

  const itemRows = invoice.items.map((it, i) => `
    <tr>
      <td style="${cell}text-align:center;" dir="ltr">${i + 1}</td>
      <td style="${cell}text-align:start;${naskh}">${esc(it.description || "—")}</td>
      <td style="${cell}text-align:center;" dir="ltr">${fmtNum(it.quantity, invoiceLang)}</td>
      <td style="${cell}text-align:end;" dir="ltr">${formatInvoicePrice(it.unitPrice, invoice.currency, invoiceLang)}</td>
      <td style="${cell}text-align:end;${lineDiscountLabel(it, invoice.currency) === "—" ? "color:#6B7280;" : "color:#DC2626;"}" dir="ltr">${esc(lineDiscountLabel(it, invoice.currency))}</td>
      <td data-col="amount" style="${AMT_STYLE}${cell}font-weight:600;font-size:11px;" dir="ltr">${formatInvoiceMinor(result.lineTotals[i] || 0, invoice.currency, invoiceLang)}</td>
    </tr>`).join("");

  const moneyRows = `
    ${hasDiscount ? `
    <tr data-totals-row="discount">
      <td colspan="5" style="${cell}text-align:end;font-weight:700;font-size:12px;${naskh}">${esc(V.discount)}</td>
      <td data-col="amount" style="${AMT_STYLE}${cell}font-weight:700;font-size:11px;color:#DC2626;" dir="ltr">−${fmt(shownDiscount, invoice.currency, invoiceLang)}</td>
    </tr>` : ""}
    ${taxes.map(t => `
    <tr data-totals-row="tax">
      <td colspan="5" style="${cell}text-align:end;font-weight:700;font-size:12px;${naskh}">${esc(displayTaxName(t.name, invoiceLang))}</td>
      <td data-col="amount" style="${AMT_STYLE}${cell}font-weight:700;font-size:11px;" dir="ltr">${fmt(t.amount, invoice.currency, invoiceLang)}</td>
    </tr>`).join("")}
    ${showAdvance ? `
    <tr data-totals-row="advance">
      <td colspan="5" style="${cell}text-align:end;font-weight:700;font-size:12px;${naskh}">${esc(V.advance)}</td>
      <td data-col="amount" style="${AMT_STYLE}${cell}font-weight:700;font-size:11px;" dir="ltr">${fmt(advanceMinor, invoice.currency, invoiceLang)}</td>
    </tr>
    <tr data-totals-row="balance">
      <td colspan="5" style="${cell}text-align:end;font-weight:700;font-size:12px;${naskh}">${esc(V.balance)}</td>
      <td data-col="amount" style="${AMT_STYLE}${cell}font-weight:700;font-size:11px;" dir="ltr">${fmt(result.balanceDue || 0, invoice.currency, invoiceLang)}</td>
    </tr>` : ""}
    <tr data-totals-row="total" style="background:#F3F4F6;">
      <td colspan="5" style="${cell}text-align:end;font-weight:800;font-size:13px;${naskh}">${esc(V.totalCls)}</td>
      <td data-col="amount" style="${AMT_STYLE}${cell}font-weight:800;font-size:12px;" dir="ltr">${fmt(result.total, invoice.currency, invoiceLang)}</td>
    </tr>
    ${invoice.amountInWords?.trim() ? `
    <tr data-amount-in-words="true">
      <td colspan="6" style="${cell}text-align:start;font-size:11px;${naskh}"><strong>${esc(V.amountInWords)}:</strong> ${esc(invoice.amountInWords.trim())}</td>
    </tr>` : ""}
  `;

  const dueCols = invoice.dueDate ? 5 : 3;

  return `
    <div data-invoice-header="true" data-header-scale="${hs}">
      ${logoHtml(logo, 6, hs)}
      <div style="text-align:center;margin-bottom:${scaled(12, hs)}px;border-bottom:2px solid #111827;padding-bottom:${scaled(10, hs)}px;">
        <h2 style="font-size:${scaled(17, hs)}px;font-weight:800;color:#111827;margin:0 0 ${scaled(3, hs)}px;${naskh}">
          ${esc(invoice.seller.name || V.businessFallback)}
        </h2>
        ${invoice.seller.address ? `<p style="font-size:${scaled(11, hs)}px;color:#374151;margin:2px 0;${naskh}">${esc(invoice.seller.address)}</p>` : ""}
        <p style="font-size:${scaled(11, hs)}px;color:#374151;margin:2px 0;" dir="ltr">
          ${esc([invoice.seller.phone, invoice.seller.email, invoice.seller.website].filter(Boolean).join("  |  "))}
        </p>
      </div>
      <p style="text-align:center;font-size:${scaled(15, hs)}px;font-weight:900;letter-spacing:0.15em;color:#111827;margin:${scaled(8, hs)}px 0 ${scaled(12, hs)}px;${naskh}">
        ${esc(V.invoice)}
      </p>
    </div>
    <table data-invoice-meta="pakistani" style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px;direction:${dir};">
      <tbody>
        <tr>
          <td style="${metaCell}font-weight:700;width:16%;white-space:nowrap;${naskh}">${esc(V.invNum)}</td>
          <td style="${metaCell}" dir="ltr">${esc(invoice.number)}</td>
          <td style="${metaCell}font-weight:700;width:12%;white-space:nowrap;${naskh}">${esc(V.date)}</td>
          <td style="${metaCell}" dir="ltr">${esc(invoice.issueDate)}</td>
          ${invoice.dueDate ? `
          <td style="${metaCell}font-weight:700;width:12%;white-space:nowrap;${naskh}">${esc(V.dDate)}</td>
          <td style="${metaCell}" dir="ltr">${esc(invoice.dueDate)}</td>` : ""}
        </tr>
        <tr>
          <td data-ms-label="true" style="${metaCell}font-weight:700;white-space:nowrap;${naskh}">${esc(V.ms)}</td>
          <td colspan="${dueCols}" style="${metaCell}${naskh}">
            ${esc(invoice.client.name || "—")}
            ${invoice.client.address ? `<span style="color:#6B7280;font-size:10px;"> — ${esc(invoice.client.address)}</span>` : ""}
          </td>
        </tr>
      </tbody>
    </table>
    <table data-invoice-table="pakistani" data-totals="table-rows" style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;direction:${dir};">
      ${pakistaniColgroup()}
      <thead>
        <tr style="background:#F3F4F6;">
          <th style="${cell}text-align:center;vertical-align:middle;font-weight:700;${naskh}">${esc(V.sno)}</th>
          <th data-col="particulars" style="${cell}text-align:center;vertical-align:middle;font-weight:700;${naskh}">${esc(V.partic)}</th>
          <th style="${cell}text-align:center;vertical-align:middle;font-weight:700;${naskh}">${esc(V.qty)}</th>
          <th style="${cell}text-align:end;vertical-align:middle;font-weight:700;${naskh}">${esc(V.rate)}</th>
          <th style="${cell}text-align:end;vertical-align:middle;font-weight:700;${naskh}">${esc(V.disc)}</th>
          <th style="${cell}text-align:end;vertical-align:middle;font-weight:700;${naskh}">${esc(V.amount)}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${blankRows}
        ${moneyRows}
      </tbody>
    </table>
    <div data-extra-lines="true" data-extra-lines-count="${extra.extraLines}" data-blank-rows="${extra.blankRowCount}" style="display:none;"></div>
    ${(invoice.notes?.trim() || invoice.terms?.trim()) ? `
      <div style="margin-top:8px;font-size:11px;color:#374151;">
        ${invoice.notes?.trim() ? `<p style="${naskh}"><strong>${esc(V.noteLbl)}</strong> ${esc(invoice.notes)}</p>` : ""}
        ${invoice.terms?.trim() ? `<p style="margin-top:3px;${naskh}"><strong>${esc(V.termsLbl)}</strong> ${esc(invoice.terms)}</p>` : ""}
      </div>` : ""}
    ${pakistaniSigHtml(sig, invoiceLang, naskh)}
    ${footerHtml(invoice.footer || "", naskh)}
  `;
}

export interface BuiltInvoiceDocument {
  print: InvoicePrintSettings;
  box: InvoicePageBox;
  extra: ExtraLinesResult;
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
  const extra = resolveExtraLines(print);
  const dir = payload.invoiceLang === "ur" ? "rtl" : "ltr";
  const innerHtml = print.style === "pakistani"
    ? pakistaniInner(payload.invoice, payload.invoiceLang, payload.logo, payload.sig, print, extra)
    : westernInner(payload.invoice, payload.invoiceLang, payload.logo, payload.sig, print, extra);

  const pageHtml = `<div class="invoice-page"
    data-invoice-style="${print.style}"
    data-page-size="${print.pageSize}"
    data-page-orientation="${print.pageOrientation}"
    data-extra-lines="${print.extraLines}"
    data-header-scale="${print.headerScale}"
    data-blank-rows="${extra.blankRowCount}"
    data-skin="${print.skin}"
    dir="${dir}"
    style="width:${box.widthMm}mm;min-height:${box.heightMm}mm;padding:${box.marginMm}mm;box-sizing:border-box;background:#ffffff;color:#111827;display:flex;flex-direction:column;">
    ${innerHtml}
  </div>`;

  return { print, box, extra, dir, innerHtml, pageHtml };
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
[data-col="amount"]{
  font-variant-numeric:tabular-nums;
  white-space:nowrap;
  text-align:end;
  direction:ltr;
  unicode-bidi:isolate;
  box-sizing:border-box;
}
`;
}
