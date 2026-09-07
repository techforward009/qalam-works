"use client";

import { useState, useRef, useCallback } from "react";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import { useLanguage } from "../../../lib/language-context";
import { useEffect } from "react";
import { calculateInvoice, fromMinor, type Invoice, type LineItem } from "../utils/invoiceEngine";
import InvoiceDocumentPreview from "./InvoiceDocumentPreview";
import {
  BODY_GAP_MAX_MM,
  BODY_GAP_MIN_MM,
  DEFAULT_INVOICE_PRINT,
  WESTERN_SKINS,
  clampBodyGapMm,
  invoiceChrome,
  type InvoicePrintSettings,
  type WesternSkin,
  type Alignment,
  type SizeOption,
} from "../utils/invoiceLayout";

interface SigState {
  name:        string;
  designation: string;
  image:       string | null;   // base64 signature image
  stampImage:  string | null;   // base64 company stamp image
  align:       Alignment;
  size:        SizeOption;
}

interface LogoState {
  src:   string | null;
  align: Alignment;
  size:  SizeOption;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function newItem(): LineItem {
  return {
    id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    quantity:    1,
    unit:        "",
    unitPrice:   0,
    discountPercent: 0,
    taxes: [{ name: "Tax", percent: 0 }],
  };
}

const DEFAULT_INVOICE: Invoice = {
  id: "draft-1",
  type: "invoice",
  number:    `INV-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate:   "",
  status:    "draft",
  seller: { name: "", email: "", phone: "", address: "", website: "", taxNumber: "" },
  client: { name: "", email: "", phone: "", address: "" },
  items:    [newItem()],
  currency: "USD",
  notes:    "",
  terms:    "",
  footer:   "",
  amountInWords: "",
};

// ── Small reusable editor atoms ───────────────────────────────────────────────
function AlignPicker({ value, onChange, labels }: { value: Alignment; onChange: (v: Alignment) => void; labels: [string, string, string] }) {
  const opts: Alignment[] = ["left", "center", "right"];
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
      {opts.map((o, i) => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1 text-xs font-semibold transition-colors ${value === o ? "bg-amber-600 text-white" : "bg-white text-gray-500 hover:bg-amber-50"} ${i > 0 ? "border-l border-gray-200" : ""}`}>
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

function SizePicker({ value, onChange, labels }: { value: SizeOption; onChange: (v: SizeOption) => void; labels: [string, string, string] }) {
  const opts: SizeOption[] = ["small", "medium", "large"];
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
      {opts.map((o, i) => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1 text-xs font-semibold transition-colors ${value === o ? "bg-amber-600 text-white" : "bg-white text-gray-500 hover:bg-amber-50"} ${i > 0 ? "border-l border-gray-200" : ""}`}>
          {labels[i]}
        </button>
      ))}
    </div>
  );
}


/** Format quantity with thousands separator */
function fmtNum(n: number, lang: "en" | "ur"): string {
  try { return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return n.toString(); }
}
/** Format unit price with thousands separator, no symbol */
function fmtPrice(n: number, lang: "en" | "ur"): string {
  try { return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
  catch { return n.toFixed(2); }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function InvoiceGeneratorTool() {
  useEffect(() => { trackToolOpenOnce("invoice_generator"); }, []);
  const { language } = useLanguage();
  const isUr = language === "ur";
  const naskh = isUr ? "font-naskh" : "";

  const [invoice, setInvoice]         = useState<Invoice>(DEFAULT_INVOICE);
  const [print, setPrint]             = useState<InvoicePrintSettings>(DEFAULT_INVOICE_PRINT);
  // invoiceLang is derived directly from the site language.
  // The global EN/UR switch is the single source of truth — no independent state.
  const invoiceLang: "en" | "ur" = isUr ? "ur" : "en";
  const [logo, setLogo]               = useState<LogoState>({ src: null, align: "left", size: "medium" });
  const [sig, setSig]                 = useState<SigState>({ name: "", designation: "", image: null, stampImage: null, align: "left", size: "medium" });
  const [activeSection, setActiveSection] = useState<"business" | "client" | "items" | "settings">("business");

  const logoRef  = useRef<HTMLInputElement>(null);
  const sigImgRef   = useRef<HTMLInputElement>(null);
  const stampImgRef = useRef<HTMLInputElement>(null);

  const result   = calculateInvoice(invoice);
  const T        = invoiceChrome(print);

  // ── UI labels ──────────────────────────────────────────────────────────────
  const L = {
    businessInfo:    isUr ? "کاروباری معلومات" : "Business Info",
    clientInfo:      isUr ? "موصول کنندہ" : "Client",
    lineItems:       isUr ? "اشیاء" : "Items",
    settings:        isUr ? "ترتیبات" : "Settings",
    companyName:     isUr ? "کمپنی / نام" : "Company / Name",
    address:         isUr ? "پتہ" : "Address",
    email:           isUr ? "ای میل" : "Email",
    phone:           isUr ? "فون" : "Phone",
    website:         isUr ? "ویب سائٹ" : "Website",
    taxId:           isUr ? "ٹیکس / VAT نمبر" : "Tax / VAT ID",
    clientName:      isUr ? "نام" : "Name",
    invoiceNumber:   isUr ? "انوائس نمبر" : "Invoice #",
    issueDate:       isUr ? "تاریخ اجراء" : "Issue Date",
    dueDate:         isUr ? "ادائیگی کی تاریخ" : "Due Date",
    currency:        isUr ? "کرنسی" : "Currency",
    paymentTerms:    isUr ? "ادائیگی کی شرائط" : "Payment Terms",
    description:     isUr ? "تفصیل" : "Description",
    qty:             isUr ? "مقدار" : "Qty",
    price:           isUr ? "قیمت" : "Price",
    disc:            isUr ? "چھوٹ٪" : "Disc%",
    tax:             isUr ? "ٹیکس٪" : "Tax%",
    amount:          isUr ? "رقم" : "Amount",
    addItem:         isUr ? "+ نیا آئٹم شامل کریں" : "+ Add Item",
    notes:           isUr ? "نوٹس" : "Notes",
    terms:           isUr ? "شرائط و ضوابط" : "Terms & Conditions",
    printSave:       isUr ? "پرنٹ / PDF محفوظ کریں" : "Print / Save PDF",
    logo:            isUr ? "لوگو" : "Logo",
    uploadLogo:      isUr ? "لوگو اپ لوڈ کریں" : "Upload Logo",
    replaceLogo:     isUr ? "لوگو تبدیل کریں" : "Replace",
    removeLogo:      isUr ? "لوگو ہٹائیں" : "Remove",
    logoAlign:       isUr ? "لوگو سیدھ" : "Alignment",
    logoSize:        isUr ? "لوگو سائز" : "Size",
    template:        isUr ? "ٹیمپلیٹ" : "Template",
    invoiceStyle:    isUr ? "انوائس سٹائل" : "Invoice Style",
    western:         isUr ? "مغربی" : "Western",
    pakistani:       isUr ? "پاکستانی" : "Pakistani",
    pageSize:        isUr ? "صفحہ سائز" : "Page size",
    orientation:     isUr ? "رخ" : "Orientation",
    portrait:        isUr ? "عمودی" : "Portrait",
    landscape:       isUr ? "افقی" : "Landscape",
    bodyGap:         isUr ? "درمیانی گیپ" : "Middle gap",
    gapManual:       isUr ? "دستی گیپ" : "Manual gap",
    fillPage:        isUr ? "صفحہ بھریں" : "Fill page",
    amountInWords:   isUr ? "رقم الفاظ میں" : "Amount in words",
    footer:          isUr ? "فوٹر" : "Footer",
    invoiceLang:     isUr ? "انوائس کی زبان" : "Invoice Language",
    english:         isUr ? "انگریزی" : "English",
    urdu:            isUr ? "اردو" : "Urdu",
    sigSection:      isUr ? "دستخط" : "Signature",
    sigUpload:       isUr ? "دستخط کی تصویر اپ لوڈ کریں" : "Upload Signature Image",
    sigReplace:      isUr ? "تبدیل کریں" : "Replace",
    sigRemove:       isUr ? "ہٹائیں" : "Remove",
    sigAlign:        isUr ? "سیدھ" : "Alignment",
    sigSize:         isUr ? "سائز" : "Size",
    signatureName:   isUr ? "دستخط کنندہ کا نام" : "Signatory Name",
    designation:     isUr ? "عہدہ" : "Designation",
    stamp:           isUr ? "کمپنی مہر شامل کریں" : "Include stamp placeholder",
    preview:         isUr ? "پیش نظارہ" : "Preview",
    alignL: isUr ? "بائیں" : "Left",
    alignC: isUr ? "درمیان" : "Center",
    alignR: isUr ? "دائیں" : "Right",
    sizeS:  isUr ? "چھوٹا" : "S",
    sizeM:  isUr ? "درمیانہ" : "M",
    sizeL:  isUr ? "بڑا" : "L",
  };

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const updateItem = useCallback((idx: number, patch: Partial<LineItem>) => {
    setInvoice(inv => ({ ...inv, items: inv.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  }, []);
  const addItem    = useCallback(() => setInvoice(inv => ({ ...inv, items: [...inv.items, newItem()] })), []);
  const removeItem = useCallback((idx: number) => setInvoice(inv => ({ ...inv, items: inv.items.filter((_, i) => i !== idx) })), []);

  const handleLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setLogo(l => ({ ...l, src: ev.target?.result as string }));
    r.readAsDataURL(file);
  }, []);

  const handleSigImg = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setSig(s => ({ ...s, image: ev.target?.result as string }));
    r.readAsDataURL(file);
  }, []);

  const handleStampImg = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setSig(s => ({ ...s, stampImage: ev.target?.result as string }));
    r.readAsDataURL(file);
  }, []);

  const [exporting, setExporting]     = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      trackEvent("tool_download", { tool: "invoice_generator", export_format: "pdf", success: true });
      const payload = { invoice, invoiceLang, logo, sig, print };
      const res = await fetch("/api/export-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), {
        href:     url,
        download: `${(invoice.number || "invoice").replace(/[^a-zA-Z0-9\-_]/g, "-")}.pdf`,
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      // Hard error — never fall back to window.print() which exposes site chrome
      setExportError(
        isUr
          ? "PDF نہیں بن سکا۔ دوبارہ کوشش کریں۔"
          : "PDF export failed. Please try again."
      );
      trackEvent("tool_error", { tool: "invoice_generator", error_code: "export_failed", success: false });
    } finally {
      setExporting(false);
    }
  }, [invoice, invoiceLang, logo, sig, print, isUr]);

  const sections = [
    { id: "business" as const, label: L.businessInfo },
    { id: "client"   as const, label: L.clientInfo },
    { id: "items"    as const, label: L.lineItems },
    { id: "settings" as const, label: L.settings },
  ];

  const stampLabel = invoiceLang === "ur" ? "مہر / ٹھپہ" : "Company Stamp";

  return (
    <>
      <div className="site-container">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-start">

          {/* ── EDITOR PANEL ───────────────────────────────────────────── */}
          <div className="print:hidden bg-white rounded-2xl border border-amber-200/80 shadow-md overflow-hidden" style={{ color: "#1F2937" }}>
            {/* Tab order: dir attribute handles RTL layout; no array reversal needed */}
            <div className="flex border-b border-amber-100 overflow-x-auto" dir={isUr ? "rtl" : "ltr"}>
              {sections.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`flex-1 min-w-max px-3 py-2 sm:px-4 sm:py-3 text-[12px] sm:text-[13px] font-semibold transition-colors whitespace-nowrap ${naskh}
                    ${activeSection === s.id
                      ? "bg-amber-50 text-amber-900 border-b-2 border-amber-600"
                      : "text-gray-500 hover:text-amber-800 hover:bg-amber-50/50"}`}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">

              {/* ── BUSINESS INFO ─────────────────────────────────────── */}
              {activeSection === "business" && (
                <div className="space-y-4" dir={isUr ? "rtl" : "ltr"}>

                  {/* LOGO section */}
                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-3">
                    <p className={`text-[11px] font-black uppercase tracking-widest text-amber-800 ${naskh}`}>{L.logo}</p>
                    <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                      {logo.src ? (
                        <img src={logo.src} alt="logo" className="h-12 w-12 object-contain rounded border border-gray-200 bg-white" />
                      ) : (
                        <div className="h-12 w-12 rounded border-2 border-dashed border-amber-200 flex items-center justify-center text-amber-300 cursor-pointer text-xl"
                          onClick={() => logoRef.current?.click()}>⬆</div>
                      )}
                      <div className={`flex gap-2 flex-wrap ${isUr ? "flex-row-reverse" : ""}`}>
                        <button onClick={() => logoRef.current?.click()}
                          className={`text-xs font-semibold text-amber-700 hover:text-amber-900 underline ${naskh}`}>
                          {logo.src ? L.replaceLogo : L.uploadLogo}
                        </button>
                        {logo.src && (
                          <button onClick={() => { setLogo(l => ({ ...l, src: null })); if (logoRef.current) logoRef.current.value = ""; }}
                            className={`text-xs font-semibold text-red-500 hover:text-red-700 underline ${naskh}`}>
                            {L.removeLogo}
                          </button>
                        )}
                      </div>
                      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                    </div>
                    {logo.src && (
                      <div className="space-y-2">
                        <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[11px] font-semibold text-gray-500 w-16 ${naskh}`}>{L.logoAlign}</span>
                          <AlignPicker value={logo.align} onChange={v => setLogo(l => ({ ...l, align: v }))}
                            labels={[L.alignL, L.alignC, L.alignR]} />
                        </div>
                        <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[11px] font-semibold text-gray-500 w-16 ${naskh}`}>{L.logoSize}</span>
                          <SizePicker value={logo.size} onChange={v => setLogo(l => ({ ...l, size: v }))}
                            labels={[L.sizeS, L.sizeM, L.sizeL]} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Business fields */}
                  {([
                    [L.companyName, "name",      false],
                    [L.address,     "address",   true],
                    [L.email,       "email",     false],
                    [L.phone,       "phone",     false],
                    [L.website,     "website",   false],
                    [L.taxId,       "taxNumber", false],
                  ] as [string, keyof typeof invoice.seller, boolean][]).map(([lbl, key, multi]) => (
                    <div key={key}>
                      <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{lbl}</label>
                      {multi ? (
                        <textarea value={(invoice.seller[key] as string) || ""}
                          onChange={e => setInvoice(inv => ({ ...inv, seller: { ...inv.seller, [key]: e.target.value } }))}
                          rows={2} dir={isUr && (key === "name" || key === "address") ? "rtl" : "ltr"}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`} />
                      ) : (
                        <input value={(invoice.seller[key] as string) || ""}
                          onChange={e => setInvoice(inv => ({ ...inv, seller: { ...inv.seller, [key]: e.target.value } }))}
                          dir={isUr && key === "name" ? "rtl" : "ltr"}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`} />
                      )}
                    </div>
                  ))}

                  {/* Invoice meta */}
                  <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                    {([
                      [L.invoiceNumber, "number",    "text"],
                      [L.currency,      "currency",  "text"],
                      [L.issueDate,     "issueDate", "date"],
                      [L.dueDate,       "dueDate",   "date"],
                    ] as [string, keyof Invoice, string][]).map(([lbl, key, type]) => (
                      <div key={key as string}>
                        <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{lbl}</label>
                        <input type={type} value={(invoice[key] as string) || ""}
                          onChange={e => setInvoice(inv => ({ ...inv, [key as string]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" dir="ltr" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.paymentTerms}</label>
                    <input value={invoice.terms || ""}
                      onChange={e => setInvoice(inv => ({ ...inv, terms: e.target.value }))}
                      placeholder={invoiceLang === "ur" ? "مثلاً: وصولی پر ادائیگی" : "e.g. Net 30"}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                      dir={isUr ? "rtl" : "ltr"} />
                  </div>
                </div>
              )}

              {/* ── CLIENT INFO ───────────────────────────────────────── */}
              {activeSection === "client" && (
                <div className="space-y-3" dir={isUr ? "rtl" : "ltr"}>
                  {([
                    [L.clientName,  "name",          false],
                    [L.companyName, "contactPerson", false],
                    [L.address,     "address",       true],
                    [L.email,       "email",         false],
                    [L.phone,       "phone",         false],
                  ] as [string, keyof typeof invoice.client, boolean][]).map(([lbl, key, multi]) => (
                    <div key={key}>
                      <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{lbl}</label>
                      {multi ? (
                        <textarea value={(invoice.client[key] as string) || ""}
                          onChange={e => setInvoice(inv => ({ ...inv, client: { ...inv.client, [key]: e.target.value } }))}
                          rows={2} dir={isUr ? "rtl" : "ltr"}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`} />
                      ) : (
                        <input value={(invoice.client[key] as string) || ""}
                          onChange={e => setInvoice(inv => ({ ...inv, client: { ...inv.client, [key]: e.target.value } }))}
                          dir={isUr && key === "name" ? "rtl" : "ltr"}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── LINE ITEMS ────────────────────────────────────────── */}
              {activeSection === "items" && (
                <div className="space-y-3" dir={isUr ? "rtl" : "ltr"}>
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide px-0.5">
                    <span className="col-span-5">{L.description}</span>
                    <span className="col-span-1 text-center">{L.qty}</span>
                    <span className="col-span-2 text-center">{L.price}</span>
                    <span className="col-span-1 text-center">{L.disc}</span>
                    <span className="col-span-1 text-center">{L.tax}</span>
                    <span className="col-span-2 text-right">{L.amount}</span>
                  </div>
                  {invoice.items.map((it, idx) => (
                    <div key={it.id} className="grid grid-cols-12 gap-1 items-center">
                      <input value={it.description}
                        onChange={e => updateItem(idx, { description: e.target.value })}
                        placeholder={L.description}
                        className={`col-span-5 border border-gray-200 rounded px-2 py-1.5 text-xs ${isUr ? "text-right font-naskh" : ""}`}
                        dir={isUr ? "rtl" : "ltr"} />
                      <input type="number" value={it.quantity}
                        onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="col-span-1 border border-gray-200 rounded px-1 py-1.5 text-xs text-center"
                        dir="ltr" step="0.01" min="0" />
                      <input type="number" value={it.unitPrice}
                        onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="col-span-2 border border-gray-200 rounded px-1 py-1.5 text-xs text-right"
                        dir="ltr" step="0.01" min="0" />
                      <input type="number" value={it.discountPercent || 0}
                        onChange={e => updateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })}
                        className="col-span-1 border border-gray-200 rounded px-1 py-1.5 text-xs text-center"
                        dir="ltr" step="0.1" min="0" max="100" />
                      <input type="number" value={it.taxes?.[0]?.percent || 0}
                        onChange={e => updateItem(idx, { taxes: [{ name: "Tax", percent: parseFloat(e.target.value) || 0 }] })}
                        className="col-span-1 border border-gray-200 rounded px-1 py-1.5 text-xs text-center"
                        dir="ltr" step="0.1" min="0" max="100" />
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-700" dir="ltr">
                          {fmtPrice(parseFloat(fromMinor(result.lineTotals[idx] || 0, 2)), invoiceLang)}
                        </span>
                        <button onClick={() => removeItem(idx)} disabled={invoice.items.length <= 1}
                          className="text-red-400 hover:text-red-600 disabled:opacity-20 text-xs ml-1">✕</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem}
                    className={`text-[13px] font-semibold text-amber-700 hover:text-amber-900 underline mt-1 ${naskh}`}>
                    {L.addItem}
                  </button>
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div>
                      <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.notes}</label>
                      <textarea value={invoice.notes || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, notes: e.target.value }))}
                        rows={3} dir={isUr ? "rtl" : "ltr"}
                        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`} />
                    </div>
                    <div>
                      <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.terms}</label>
                      <textarea value={invoice.terms || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, terms: e.target.value }))}
                        rows={2} dir={isUr ? "rtl" : "ltr"}
                        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SETTINGS ──────────────────────────────────────────── */}
              {activeSection === "settings" && (
                <div className="space-y-4" dir={isUr ? "rtl" : "ltr"}>
                  {/* Style + page */}
                  <div>
                    <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.invoiceStyle}</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["western", "pakistani"] as const).map(style => (
                        <button key={style} onClick={() => setPrint(p => ({ ...p, style }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                            ${print.style === style ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                          {style === "western" ? L.western : L.pakistani}
                        </button>
                      ))}
                    </div>
                  </div>
                  {print.style === "western" && (
                    <div>
                      <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.template}</label>
                      <div className="flex gap-2 flex-wrap">
                        {(Object.keys(WESTERN_SKINS) as WesternSkin[]).map(skin => (
                          <button key={skin} onClick={() => setPrint(p => ({ ...p, skin }))}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                              ${print.skin === skin ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                            {isUr ? WESTERN_SKINS[skin].labelUr : WESTERN_SKINS[skin].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.pageSize}</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["a4", "a5"] as const).map(size => (
                        <button key={size} onClick={() => setPrint(p => ({ ...p, pageSize: size }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all
                            ${print.pageSize === size ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                          {size.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.orientation}</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["portrait", "landscape"] as const).map(o => (
                        <button key={o} onClick={() => setPrint(p => ({ ...p, pageOrientation: o }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                            ${print.pageOrientation === o ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                          {o === "portrait" ? L.portrait : L.landscape}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.bodyGap}</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      <button onClick={() => setPrint(p => ({ ...p, bodyGapMode: "manual" }))}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                          ${print.bodyGapMode === "manual" ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                        {L.gapManual}
                      </button>
                      <button onClick={() => setPrint(p => ({ ...p, bodyGapMode: "fill" }))}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                          ${print.bodyGapMode === "fill" ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                        {L.fillPage}
                      </button>
                    </div>
                    <div className={`flex items-center gap-3 ${print.bodyGapMode === "fill" ? "opacity-40 pointer-events-none" : ""}`}>
                      <input type="range" min={BODY_GAP_MIN_MM} max={BODY_GAP_MAX_MM} step={1}
                        value={print.bodyGapMm}
                        disabled={print.bodyGapMode === "fill"}
                        onChange={e => setPrint(p => ({ ...p, bodyGapMm: clampBodyGapMm(Number(e.target.value)) }))}
                        className="flex-1 accent-amber-700" />
                      <span className="text-xs font-mono text-gray-600 w-12" dir="ltr">{print.bodyGapMm}mm</span>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.amountInWords}</label>
                    <textarea value={invoice.amountInWords || ""}
                      onChange={e => setInvoice(inv => ({ ...inv, amountInWords: e.target.value }))}
                      rows={2} dir={isUr ? "rtl" : "ltr"}
                      placeholder={isUr ? "مثلاً: دو سو سولہ روپے صرف" : "e.g. Two hundred sixteen only"}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`} />
                  </div>
                  <div>
                    <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.footer}</label>
                    <textarea value={invoice.footer || ""}
                      onChange={e => setInvoice(inv => ({ ...inv, footer: e.target.value }))}
                      rows={2} dir={isUr ? "rtl" : "ltr"}
                      placeholder={isUr ? "مثلاً: E. & O.E. · NTN: …" : "e.g. E. & O.E. · NTN: …"}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`} />
                  </div>
                  {/* Signature section */}
                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-3">
                    <p className={`text-[11px] font-black uppercase tracking-widest text-amber-800 ${naskh}`}>{L.sigSection}</p>
                    {/* Signature image upload */}
                    <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                      {sig.image ? (
                        <img src={sig.image} alt="signature" className="h-10 object-contain rounded border border-gray-200 bg-white px-1" />
                      ) : (
                        <div className="h-10 w-20 rounded border-2 border-dashed border-amber-200 flex items-center justify-center text-amber-300 cursor-pointer text-xs text-center leading-tight px-1"
                          onClick={() => sigImgRef.current?.click()}>
                          {isUr ? "تصویر" : "Image"}
                        </div>
                      )}
                      <div className={`flex gap-2 flex-wrap ${isUr ? "flex-row-reverse" : ""}`}>
                        <button onClick={() => sigImgRef.current?.click()}
                          className={`text-xs font-semibold text-amber-700 hover:text-amber-900 underline ${naskh}`}>
                          {sig.image ? L.sigReplace : L.sigUpload}
                        </button>
                        {sig.image && (
                          <button onClick={() => { setSig(s => ({ ...s, image: null })); if (sigImgRef.current) sigImgRef.current.value = ""; }}
                            className={`text-xs font-semibold text-red-500 hover:text-red-700 underline ${naskh}`}>
                            {L.sigRemove}
                          </button>
                        )}
                      </div>
                      <input ref={sigImgRef} type="file" accept="image/*" className="hidden" onChange={handleSigImg} />
                    </div>
                    {/* Align + size */}
                    <div className="space-y-2">
                      <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                        <span className={`text-[11px] font-semibold text-gray-500 w-14 ${naskh}`}>{L.sigAlign}</span>
                        <AlignPicker value={sig.align} onChange={v => setSig(s => ({ ...s, align: v }))}
                          labels={[L.alignL, L.alignC, L.alignR]} />
                      </div>
                      <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                        <span className={`text-[11px] font-semibold text-gray-500 w-14 ${naskh}`}>{L.sigSize}</span>
                        <SizePicker value={sig.size} onChange={v => setSig(s => ({ ...s, size: v }))}
                          labels={[L.sizeS, L.sizeM, L.sizeL]} />
                      </div>
                    </div>
                    {/* Text fields */}
                    <div className="space-y-2 pt-1 border-t border-amber-100">
                      <div>
                        <label className={`block text-[11px] font-semibold text-gray-400 mb-1 ${naskh}`}>{L.signatureName}</label>
                        <input value={sig.name} onChange={e => setSig(s => ({ ...s, name: e.target.value }))}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                          dir={isUr ? "rtl" : "ltr"} />
                      </div>
                      <div>
                        <label className={`block text-[11px] font-semibold text-gray-400 mb-1 ${naskh}`}>
                          {L.designation} <span className="font-normal text-gray-300">({isUr ? "اختیاری" : "optional"})</span>
                        </label>
                        <input value={sig.designation} onChange={e => setSig(s => ({ ...s, designation: e.target.value }))}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                          dir={isUr ? "rtl" : "ltr"} />
                      </div>
                    </div>
                    {/* Company stamp image */}
                    <div className="pt-2 border-t border-amber-100 space-y-2">
                      <p className={`text-[11px] font-semibold text-gray-500 ${naskh}`}>
                        {stampLabel} <span className="font-normal text-gray-300">({isUr ? "اختیاری" : "optional"})</span>
                      </p>
                      <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                        {sig.stampImage ? (
                          <img src={sig.stampImage} alt="stamp"
                            className="h-10 w-10 object-contain rounded border border-gray-200 bg-white" />
                        ) : (
                          <div className="h-10 w-10 rounded border-2 border-dashed border-amber-100 flex items-center justify-center text-amber-200 cursor-pointer text-xs"
                            onClick={() => stampImgRef.current?.click()}>⬆</div>
                        )}
                        <div className={`flex gap-2 flex-wrap ${isUr ? "flex-row-reverse" : ""}`}>
                          <button onClick={() => stampImgRef.current?.click()}
                            className={`text-xs font-semibold text-amber-700 hover:text-amber-900 underline ${naskh}`}>
                            {sig.stampImage ? (isUr ? "تبدیل کریں" : "Replace Stamp") : (isUr ? "مہر اپ لوڈ کریں" : "Upload Stamp")}
                          </button>
                          {sig.stampImage && (
                            <button onClick={() => { setSig(s => ({ ...s, stampImage: null })); if (stampImgRef.current) stampImgRef.current.value = ""; }}
                              className={`text-xs font-semibold text-red-500 hover:text-red-700 underline ${naskh}`}>
                              {isUr ? "ہٹائیں" : "Remove"}
                            </button>
                          )}
                        </div>
                        <input ref={stampImgRef} type="file" accept="image/*" className="hidden" onChange={handleStampImg} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all disabled:opacity-60 ${naskh}`}
                  style={{ background: T.accent }}>
                  {exporting ? (isUr ? "تیار ہو رہا ہے..." : "Generating PDF…") : L.printSave}
                </button>
                {exportError && (
                  <div className={`mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between gap-2 ${naskh}`}
                    dir={isUr ? "rtl" : "ltr"}>
                    <span>{exportError}</span>
                    <button onClick={() => { setExportError(null); handleExport(); }}
                      className="underline whitespace-nowrap shrink-0">
                      {isUr ? "دوبارہ کوشش" : "Retry"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── PREVIEW PANEL ──────────────────────────────────────────── */}
          <div id="invoice-print-root"
            className="rounded-2xl shadow-md overflow-hidden"
            style={{ colorScheme: "light", background: "#ffffff", color: "#111827", border: "1px solid #FDE68A" }}>
            <div className="px-4 py-2 border-b flex items-center justify-between"
              style={{ borderColor: "#FEF3C7", background: "#FFFBEB" }}>
              <span className={`text-[11px] font-bold text-gray-400 uppercase tracking-widest ${naskh}`}>{L.preview}</span>
              <span className="text-[11px] text-gray-400" dir="ltr">
                {invoiceLang === "ur" ? "اردو" : "English"}
                {" · "}
                {print.style === "pakistani" ? (isUr ? "پاکستانی" : "Pakistani") : (isUr ? WESTERN_SKINS[print.skin].labelUr : WESTERN_SKINS[print.skin].label)}
                {" · "}
                {print.pageSize.toUpperCase()}
                {" "}
                {print.pageOrientation === "landscape" ? (isUr ? "افقی" : "Landscape") : (isUr ? "عمودی" : "Portrait")}
              </span>
            </div>
            <InvoiceDocumentPreview
              invoice={invoice}
              invoiceLang={invoiceLang}
              logo={logo}
              sig={sig}
              print={print}
            />
          </div>
        </div>
      </div>
    </>
  );
}
