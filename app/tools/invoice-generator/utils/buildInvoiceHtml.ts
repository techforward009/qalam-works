/**
 * buildInvoiceHtml
 *
 * Generates a complete standalone HTML document for invoice PDF export.
 * All styles are inlined; fonts are embedded as base64 data URIs.
 * No external dependencies are loaded at render time.
 * Supports all 4 templates, EN/UR invoice language, RTL/LTR, logo, signature.
 */
import path from "path";
import { readFileSync, existsSync } from "fs";
import { calculateInvoice, combinedDiscount, fromMinor, lineDiscountLabel, type Invoice } from "./invoiceEngine";

// ── Types (mirrored from component) ──────────────────────────────────────────
export type Template       = "modern" | "minimal" | "corporate" | "classic";
export type InvoiceLanguage = "en" | "ur";
export type Alignment      = "left" | "center" | "right";
export type SizeOption     = "small" | "medium" | "large";

export interface LogoState {
  src:   string | null;
  align: Alignment;
  size:  SizeOption;
}
export interface SigState {
  name:        string;
  designation: string;
  image:       string | null;
  stampImage:  string | null;
  align:       Alignment;
  size:        SizeOption;
}
export interface InvoiceExportPayload {
  invoice:     Invoice;
  template:    Template;
  invoiceLang: InvoiceLanguage;
  logo:        LogoState;
  sig:         SigState;
}

// ── Palettes ─────────────────────────────────────────────────────────────────
const PALETTES: Record<Template, { accent: string; headerBg: string; headerText: string }> = {
  modern:    { accent: "#B45309", headerBg: "#FFFBEB", headerText: "#78350F" },
  minimal:   { accent: "#374151", headerBg: "#F9FAFB", headerText: "#111827" },
  corporate: { accent: "#1E3A5F", headerBg: "#EFF6FF", headerText: "#1E3A5F" },
  classic:   { accent: "#111827", headerBg: "#ffffff", headerText: "#111827" },
};

const LOGO_H: Record<SizeOption, number>     = { small: 36, medium: 52, large: 72 };
const SIG_H:  Record<SizeOption, number>     = { small: 50, medium: 90, large: 140 };

// ── Font loader ───────────────────────────────────────────────────────────────
function loadFontBase64(relPath: string): string | null {
  const full = path.join(process.cwd(), "node_modules", relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full).toString("base64");
}

function fontFaceBlock(familyName: string, weight: number, b64: string | null): string {
  if (!b64) return "";
  return `@font-face{font-family:"${familyName}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-display:block;}`;
}

// ── Number formatters ─────────────────────────────────────────────────────────
/** Format a plain quantity with thousands separator */
function fmtNum(n: number, lang: InvoiceLanguage): string {
  try {
    return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", {
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(n);
  } catch { return n.toString(); }
}
/** Format a unit price as plain decimal with thousands separator */
function fmtPrice(n: number, lang: InvoiceLanguage): string {
  try {
    return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n);
  } catch { return n.toFixed(2); }
}

// ── Currency formatter ────────────────────────────────────────────────────────
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

// ── IV labels ─────────────────────────────────────────────────────────────────
function iv(key: string, lang: InvoiceLanguage): string {
  const map: Record<string, [string, string]> = {
    invoice:  ["INVOICE",        "انوائس"],
    billTo:   ["BILL TO",        "بل وصول کنندہ"],
    date:     ["Date",           "تاریخ"],
    due:      ["Due Date",       "آخری تاریخ"],
    inv_num:  ["Invoice #",      "انوائس نمبر"],
    desc:     ["Description",    "تفصیل"],
    qty:      ["Qty",            "مقدار"],
    price:    ["Unit Price",     "فی یونٹ قیمت"],
    amount:   ["Amount",         "رقم"],
    disc:     ["Disc",           "چھوٹ"],
    subtotal: ["Subtotal",       "ذیلی کل"],
    discount: ["Discount Given", "دی گئی چھوٹ"],
    total:    ["Total",          "کل"],
    notes:    ["Notes",          "نوٹس"],
    terms:    ["Terms & Conditions", "شرائط و ضوابط"],
    authSig:  ["Authorized Signature", "دستخط"],
    stamp:    ["STAMP",          "مہر"],
    note:     ["Note:",          "نوٹ:"],
    termsLbl: ["Terms:",         "شرائط:"],
    // Classic
    to:       ["To",             "بنام"],
    sno:      ["S. No.",         "نمبر"],
    partic:   ["Particulars",    "تفصیل"],
    rate:     ["Rate",           "نرخ"],
    total_cls:["TOTAL",          "کل رقم"],
    payterms: ["Payment Terms",  "ادائیگی کی شرائط"],
    authSigCls:["Authorized Signature", "دستخط"],
  };
  const [en, ur] = map[key] ?? [key, key];
  return lang === "ur" ? ur : en;
}

// ── Logo HTML helper ─────────────────────────────────────────────────────────
function logoHtml(logo: LogoState): string {
  if (!logo.src) return "";
  const h = LOGO_H[logo.size];
  const jm: Record<Alignment, string> = { left: "flex-start", center: "center", right: "flex-end" };
  return `<div style="display:flex;justify-content:${jm[logo.align]};margin-bottom:6px;">
    <img src="${logo.src}" alt="logo" style="height:${h}px;max-width:180px;object-fit:contain;" />
  </div>`;
}

// ── Signature HTML helper ────────────────────────────────────────────────────
function sigHtml(sig: SigState, accent: string, lang: InvoiceLanguage, invNaskh: string): string {
  const h   = SIG_H[sig.size];
  const jm: Record<Alignment, string>  = { left: "flex-start", center: "center", right: "flex-end" };
  const ta: Record<Alignment, string>  = { left: "left", center: "center", right: "right" };
  const imgPart = sig.image
    ? `<div style="display:flex;justify-content:${jm[sig.align]};margin-bottom:4px;">
        <img src="${sig.image}" alt="signature"
          style="height:${h}px;max-width:180px;max-height:${h}px;object-fit:contain;object-position:bottom;display:block;" /></div>`
    : `<div style="height:${Math.round(h * 0.35)}px;"></div>`;
  const stampPart = sig.stampImage
    ? `<div style="margin-top:8px;"><img src="${sig.stampImage}" alt="stamp" style="height:60px;max-width:80px;object-fit:contain;opacity:0.85;display:block;" /></div>`
    : "";
  return `
  <div style="display:flex;justify-content:${jm[sig.align]};">
    <div style="text-align:${ta[sig.align]};min-width:180px;">
      <p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${accent};margin:0 0 ${sig.image ? 8 : 32}px;${invNaskh}">${iv("authSig", lang)}</p>
      ${imgPart}
      <div style="border-bottom:1.5px solid #374151;margin-bottom:5px;max-width:180px;"></div>
      ${sig.name ? `<p style="font-size:11px;font-weight:700;color:#111827;margin:2px 0;${invNaskh}">${sig.name}</p>` : ""}
      ${sig.designation ? `<p style="font-size:10px;color:#6B7280;margin:1px 0;${invNaskh}">${sig.designation}</p>` : ""}
      ${stampPart}
    </div>
  </div>`;
}

// ── Main builder ──────────────────────────────────────────────────────────────
export function buildInvoiceHtml(payload: InvoiceExportPayload): string {
  const { invoice, template, invoiceLang, logo, sig } = payload;
  const result  = calculateInvoice(invoice);
  const P       = PALETTES[template];
  const dir     = invoiceLang === "ur" ? "rtl" : "ltr";
  const urFont  = invoiceLang === "ur";
  const naskhStyle  = urFont  ? `font-family:'Noto Nastaliq Urdu',serif;line-height:2.2;` : "";
  const invNaskh = naskhStyle;

  // Load fonts
  const interReg    = loadFontBase64("@fontsource/inter/files/inter-latin-400-normal.woff2");
  const interBold   = loadFontBase64("@fontsource/inter/files/inter-latin-700-normal.woff2");
  // Urdu invoice font: Noto Nastaliq Urdu — the approved Qalam Works Nastaliq font
  const nastaliqReg = loadFontBase64("@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2");
  const nastaliqLat = loadFontBase64("@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-latin-400-normal.woff2");

  const fontFaces = [
    fontFaceBlock("Inter", 400, interReg),
    fontFaceBlock("Inter", 700, interBold),
    fontFaceBlock("Noto Nastaliq Urdu", 400, nastaliqReg),
    fontFaceBlock("Noto Nastaliq Urdu", 400, nastaliqLat),
  ].join("\n");

  const baseFontFamily = urFont
    ? "'Noto Nastaliq Urdu', serif"
    : "Inter, system-ui, sans-serif";

  const shownDiscount = combinedDiscount(result);
  const hasDiscount = shownDiscount > 0;

  // ── CLASSIC template ────────────────────────────────────────────────────────
  if (template === "classic") {
    const cols = [
      { h: iv("sno", invoiceLang),    w: "7%",  a: "center" },
      { h: iv("partic", invoiceLang), w: "",     a: dir === "rtl" ? "right" : "left" },
      { h: iv("qty", invoiceLang),    w: "8%",  a: "center" },
      { h: iv("rate", invoiceLang),   w: "12%", a: "right" },
      { h: iv("disc", invoiceLang),   w: "10%", a: "right" },
      { h: iv("amount", invoiceLang), w: "14%", a: "right" },
    ];
    const blankRows = invoice.items.length < 5
      ? Array.from({ length: 5 - invoice.items.length }).map(() =>
          `<tr>${cols.map(() => `<td style="border:1px solid #111827;padding:6px 8px;">&nbsp;</td>`).join("")}</tr>`
        ).join("")
      : "";

    const body = `
      ${logoHtml(logo)}
      <div style="text-align:center;margin-bottom:14px;border-bottom:2px solid #111827;padding-bottom:12px;">
        <h2 style="font-size:17px;font-weight:800;color:#111827;margin:0 0 3px;${naskhStyle}">
          ${invoice.seller.name || (invoiceLang === "ur" ? "آپ کا کاروباری نام" : "Your Business Name")}
        </h2>
        ${invoice.seller.address ? `<p style="font-size:11px;color:#374151;margin:2px 0;${naskhStyle}">${invoice.seller.address}</p>` : ""}
        <p style="font-size:11px;color:#374151;margin:2px 0;" dir="ltr">
          ${[invoice.seller.phone, invoice.seller.email, invoice.seller.website].filter(Boolean).join("  |  ")}
        </p>
      </div>
      <p style="text-align:center;font-size:15px;font-weight:900;letter-spacing:0.15em;color:#111827;margin:8px 0 12px;${naskhStyle}">
        ${iv("invoice", invoiceLang)}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
        <tbody>
          <tr>
            <td style="border:1px solid #111827;padding:5px 8px;font-weight:700;width:14%;white-space:nowrap;${naskhStyle}">${iv("to", invoiceLang)}</td>
            <td style="border:1px solid #111827;padding:5px 8px;width:44%;${naskhStyle}">
              ${invoice.client.name || "—"}
              ${invoice.client.address ? `<span style="color:#6B7280;font-size:10px;"> — ${invoice.client.address}</span>` : ""}
            </td>
            <td style="border:1px solid #111827;padding:5px 8px;font-weight:700;width:14%;white-space:nowrap;${naskhStyle}">${iv("date", invoiceLang)}</td>
            <td style="border:1px solid #111827;padding:5px 8px;" dir="ltr">${invoice.issueDate}</td>
          </tr>
          <tr>
            <td style="border:1px solid #111827;padding:5px 8px;font-weight:700;${naskhStyle}">${iv("inv_num", invoiceLang)}</td>
            ${invoice.dueDate
              ? `<td style="border:1px solid #111827;padding:5px 8px;" dir="ltr">${invoice.number}</td>
                 <td style="border:1px solid #111827;padding:5px 8px;font-weight:700;${naskhStyle}">${iv("due", invoiceLang)}</td>
                 <td style="border:1px solid #111827;padding:5px 8px;" dir="ltr">${invoice.dueDate}</td>`
              : `<td colspan="3" style="border:1px solid #111827;padding:5px 8px;" dir="ltr">${invoice.number}</td>`
            }
          </tr>
        </tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#F3F4F6;">
            ${cols.map(c => `<th style="border:1px solid #111827;padding:6px 8px;${c.w ? `width:${c.w};` : ""}text-align:${c.a};font-weight:700;${naskhStyle}">${c.h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((it, i) => `
            <tr>
              <td style="border:1px solid #111827;padding:6px 8px;text-align:center;" dir="ltr">${i + 1}</td>
              <td style="border:1px solid #111827;padding:6px 8px;text-align:${dir === "rtl" ? "right" : "left"};${naskhStyle}">${it.description || "—"}</td>
              <td style="border:1px solid #111827;padding:6px 8px;text-align:center;" dir="ltr">${fmtNum(it.quantity, invoiceLang)}</td>
              <td style="border:1px solid #111827;padding:6px 8px;text-align:right;" dir="ltr">${fmtPrice(it.unitPrice, invoiceLang)}</td>
              <td style="border:1px solid #111827;padding:6px 8px;text-align:right;${lineDiscountLabel(it) === "—" ? "color:#6B7280;" : "color:#DC2626;"}" dir="ltr">${lineDiscountLabel(it)}</td>
              <td style="border:1px solid #111827;padding:6px 8px;text-align:right;font-weight:600;" dir="ltr">${fmtPrice(parseFloat(fromMinor(result.lineTotals[i] || 0, 2)), invoiceLang)}</td>
            </tr>`).join("")}
          ${blankRows}
          ${hasDiscount ? `
          <tr>
            <td colspan="5" style="border:1px solid #111827;padding:6px 8px;text-align:${dir === "rtl" ? "left" : "right"};font-weight:700;font-size:12px;${naskhStyle}">
              ${iv("discount", invoiceLang)}
            </td>
            <td style="border:1px solid #111827;padding:6px 8px;text-align:right;font-weight:700;font-size:12px;color:#DC2626;" dir="ltr">
              −${fmt(shownDiscount, invoice.currency, invoiceLang)}
            </td>
          </tr>` : ""}
          ${result.taxes.filter(t => t.amount !== 0).map(t => `
          <tr>
            <td colspan="5" style="border:1px solid #111827;padding:6px 8px;text-align:${dir === "rtl" ? "left" : "right"};font-weight:700;font-size:12px;${naskhStyle}">
              ${t.name}
            </td>
            <td style="border:1px solid #111827;padding:6px 8px;text-align:right;font-weight:700;font-size:12px;" dir="ltr">
              ${fmt(t.amount, invoice.currency, invoiceLang)}
            </td>
          </tr>`).join("")}
          <tr style="background:#F3F4F6;">
            <td colspan="5" style="border:1px solid #111827;padding:7px 8px;text-align:${dir === "rtl" ? "left" : "right"};font-weight:800;font-size:13px;${naskhStyle}">
              ${iv("total_cls", invoiceLang)}
            </td>
            <td style="border:1px solid #111827;padding:7px 8px;text-align:right;font-weight:800;font-size:13px;" dir="ltr">
              ${fmt(result.total, invoice.currency, invoiceLang)}
            </td>
          </tr>
        </tbody>
      </table>
      ${(invoice.notes || invoice.terms) ? `
        <div style="margin-top:10px;font-size:11px;color:#374151;">
          ${invoice.notes ? `<p style="${naskhStyle}"><strong>${iv("note", invoiceLang)}</strong> ${invoice.notes}</p>` : ""}
          ${invoice.terms ? `<p style="margin-top:3px;${naskhStyle}"><strong>${iv("termsLbl", invoiceLang)}</strong> ${invoice.terms}</p>` : ""}
        </div>` : ""}
      <div style="margin-top:28px;">
        ${sigHtml(sig, P.accent, invoiceLang, naskhStyle)}
      </div>`;

    return wrapHtml(body, baseFontFamily, fontFaces, dir);
  }

  // ── MODERN / MINIMAL / CORPORATE ────────────────────────────────────────────
  const logoAlignJs: Record<Alignment, string> = { left: "flex-start", center: "center", right: "flex-end" };
  const logoH = logo.src ? `<div style="display:flex;justify-content:${logoAlignJs[logo.align]};margin-bottom:6px;">
    <img src="${logo.src}" alt="logo" style="height:${LOGO_H[logo.size]}px;max-width:180px;object-fit:contain;" /></div>` : "";

  const headerFlexDir = dir === "rtl" ? "row-reverse" : "row";
  const docTextAlign  = dir === "rtl" ? "left" : "right";
  const billPad       = dir === "rtl" ? "padding-right:24px;" : "padding-left:24px;";

  const body = `
    <div style="background:${P.headerBg};border-bottom:3px solid ${P.accent};margin:-24px -32px 24px;padding:20px 32px 18px;">
      ${logoH}
      <div style="display:flex;flex-direction:${headerFlexDir};justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <h2 style="font-size:18px;font-weight:800;color:${P.headerText};margin:0 0 4px;${naskhStyle}">
            ${invoice.seller.name || (invoiceLang === "ur" ? "آپ کا کاروباری نام" : "Your Business Name")}
          </h2>
          ${invoice.seller.address ? `<p style="font-size:11px;color:#6B7280;margin:0 0 2px;white-space:pre-wrap;${naskhStyle}">${invoice.seller.address}</p>` : ""}
          <p style="font-size:11px;color:#9CA3AF;margin:0;" dir="ltr">
            ${[invoice.seller.phone, invoice.seller.email].filter(Boolean).join("  ·  ")}
          </p>
          ${invoice.seller.website ? `<p style="font-size:10px;color:#9CA3AF;margin:0;" dir="ltr">${invoice.seller.website}</p>` : ""}
          ${invoice.seller.taxNumber ? `<p style="font-size:10px;color:#9CA3AF;margin:0;" dir="ltr">${invoice.seller.taxNumber}</p>` : ""}
        </div>
        <div style="flex-shrink:0;${billPad}text-align:${docTextAlign};">
          <p style="font-size:24px;font-weight:900;color:${P.accent};margin:0 0 4px;letter-spacing:-0.02em;${naskhStyle}">${iv("invoice", invoiceLang)}</p>
          <p style="font-size:12px;font-weight:600;color:#374151;margin:0 0 4px;" dir="ltr">${invoice.number}</p>
          <p style="font-size:11px;color:#6B7280;margin:0;"><span style="${naskhStyle}font-weight:600;">${iv("date", invoiceLang)}: </span><span dir="ltr">${invoice.issueDate}</span></p>
          ${invoice.dueDate ? `<p style="font-size:11px;color:#6B7280;margin:0;"><span style="${naskhStyle}font-weight:600;">${iv("due", invoiceLang)}: </span><span dir="ltr">${invoice.dueDate}</span></p>` : ""}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;direction:${dir};">
      <div>
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;">${iv("billTo", invoiceLang)}</p>
        <p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 2px;${naskhStyle}">${invoice.client.name || "—"}</p>
        ${invoice.client.contactPerson ? `<p style="font-size:11px;color:#374151;margin:1px 0;${naskhStyle}">${invoice.client.contactPerson}</p>` : ""}
        ${invoice.client.address ? `<p style="font-size:11px;color:#6B7280;white-space:pre-wrap;margin:1px 0;${naskhStyle}">${invoice.client.address}</p>` : ""}
        ${invoice.client.email ? `<p style="font-size:11px;color:#6B7280;margin:1px 0;" dir="ltr">${invoice.client.email}</p>` : ""}
        ${invoice.client.phone ? `<p style="font-size:11px;color:#6B7280;margin:1px 0;" dir="ltr">${invoice.client.phone}</p>` : ""}
      </div>
      ${invoice.terms ? `
      <div>
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;">${iv("payterms", invoiceLang)}</p>
        <p style="font-size:11px;color:#374151;${naskhStyle}">${invoice.terms}</p>
      </div>` : ""}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;direction:${dir};">
      <thead>
        <tr style="border-bottom:2px solid ${P.accent};">
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:${dir === "rtl" ? "right" : "left"};${naskhStyle}">${iv("desc", invoiceLang)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;width:40px;">${iv("qty", invoiceLang)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;width:70px;">${iv("price", invoiceLang)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;width:56px;">${iv("disc", invoiceLang)}</th>
          <th style="padding:8px 4px;font-weight:700;color:#374151;text-align:right;width:80px;">${iv("amount", invoiceLang)}</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((it, i) => `
          <tr style="border-bottom:1px solid #F3F4F6;">
            <td style="padding:7px 4px;color:#374151;text-align:${dir === "rtl" ? "right" : "left"};${naskhStyle}">${it.description || "—"}</td>
            <td style="padding:7px 4px;color:#6B7280;text-align:right;" dir="ltr">${fmtNum(it.quantity, invoiceLang)}</td>
            <td style="padding:7px 4px;color:#6B7280;text-align:right;" dir="ltr">${fmtPrice(it.unitPrice, invoiceLang)}</td>
            <td style="padding:7px 4px;text-align:right;${lineDiscountLabel(it) === "—" ? "color:#9CA3AF;" : "color:#DC2626;"}" dir="ltr">${lineDiscountLabel(it)}</td>
            <td style="padding:7px 4px;font-weight:600;color:#111827;text-align:right;" dir="ltr">${fmtPrice(parseFloat(fromMinor(result.lineTotals[i] || 0, 2)), invoiceLang)}</td>
          </tr>`).join("")}
      </tbody>
    </table>

    <div style="display:flex;justify-content:${dir === "rtl" ? "flex-start" : "flex-end"};">
      <div style="width:210px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-bottom:4px;">
          <span style="${naskhStyle}">${iv("subtotal", invoiceLang)}</span>
          <span dir="ltr">${fmt(result.grossSubtotal, invoice.currency, invoiceLang)}</span>
        </div>
        ${hasDiscount ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-bottom:4px;">
          <span style="${naskhStyle}">${iv("discount", invoiceLang)}</span>
          <span dir="ltr" style="color:#DC2626;">−${fmt(shownDiscount, invoice.currency, invoiceLang)}</span>
        </div>` : ""}
        ${result.taxes.filter(t => t.amount !== 0).map(t => `
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-bottom:4px;">
          <span>${t.name}</span>
          <span dir="ltr">${fmt(t.amount, invoice.currency, invoiceLang)}</span>
        </div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:${P.accent};border-top:2px solid ${P.accent};padding-top:8px;margin-top:4px;">
          <span style="${naskhStyle}">${iv("total", invoiceLang)}</span>
          <span dir="ltr">${fmt(result.total, invoice.currency, invoiceLang)}</span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #F3F4F6;">
      <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;${naskhStyle}">${iv("notes", invoiceLang)}</p>
      <p style="font-size:11px;color:#374151;white-space:pre-wrap;${naskhStyle}">${invoice.notes}</p>
    </div>` : ""}

    ${invoice.terms ? `
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid #F3F4F6;">
      <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${P.accent};margin:0 0 4px;${naskhStyle}">${iv("terms", invoiceLang)}</p>
      <p style="font-size:11px;color:#6B7280;${naskhStyle}">${invoice.terms}</p>
    </div>` : ""}

    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #F3F4F6;">
      ${sigHtml(sig, P.accent, invoiceLang, naskhStyle)}
    </div>`;

  return wrapHtml(body, baseFontFamily, fontFaces, dir);
}

// ── HTML wrapper ─────────────────────────────────────────────────────────────
function wrapHtml(body: string, fontFamily: string, fontFaces: string, dir: string): string {
  return `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ur" : "en"}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${fontFaces}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{
  font-family:${fontFamily};
  font-size:14px;
  color:#111827;
  background:#ffffff;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
@page{margin:12mm;size:A4 portrait;}
</style>
</head>
<body>
<div style="max-width:740px;margin:0 auto;padding:24px 32px;background:#ffffff;color:#111827;">
${body}
</div>
</body>
</html>`;
}
