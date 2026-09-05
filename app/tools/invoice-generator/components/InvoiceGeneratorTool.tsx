"use client";

import { useState, useRef, useCallback } from "react";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import { useLanguage } from "../../../lib/language-context";
import { useEffect } from "react";
import {
  calculateInvoice,
  combinedDiscount,
  fromMinor,
  lineDiscountLabel,
  type Invoice,
  type LineItem,
} from "../utils/invoiceEngine";

// ── Types ─────────────────────────────────────────────────────────────────────
type Template      = "modern" | "minimal" | "corporate" | "classic";
type InvoiceLanguage = "en" | "ur";
type Alignment     = "left" | "center" | "right";
type SizeOption    = "small" | "medium" | "large";

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

const LOGO_SIZE_MAP: Record<SizeOption, number> = { small: 36, medium: 52, large: 72 };
const SIG_SIZE_MAP:  Record<SizeOption, number> = { small: 50, medium: 90, large: 140 };

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
};

// ── Template palettes ─────────────────────────────────────────────────────────
const TEMPLATES: Record<Template, { accent: string; accentText: string; headerBg: string; headerText: string; label: string; labelUr: string }> = {
  modern:    { accent: "#B45309", accentText: "#92400E", headerBg: "#FFFBEB", headerText: "#78350F", label: "Modern",    labelUr: "جدید" },
  minimal:   { accent: "#374151", accentText: "#1F2937", headerBg: "#F9FAFB", headerText: "#111827", label: "Minimal",   labelUr: "سادہ" },
  corporate: { accent: "#1E3A5F", accentText: "#1E3A5F", headerBg: "#EFF6FF", headerText: "#1E3A5F", label: "Corporate", labelUr: "کارپوریٹ" },
  classic:   { accent: "#111827", accentText: "#111827", headerBg: "#ffffff", headerText: "#111827", label: "Classic",   labelUr: "روایتی" },
};

// ── Currency format ───────────────────────────────────────────────────────────
function fmt(minor: number, currency: string, invoiceLang: InvoiceLanguage): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(invoiceLang === "ur" ? "ur-PK" : "en-US", {
      style: "currency", currency: currency || "USD", minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${fromMinor(minor, 2)} ${currency}`;
  }
}

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
function fmtNum(n: number, lang: InvoiceLanguage): string {
  try { return new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return n.toString(); }
}
/** Format unit price with thousands separator, no symbol */
function fmtPrice(n: number, lang: InvoiceLanguage): string {
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
  const [template, setTemplate]       = useState<Template>("modern");
  // invoiceLang is derived directly from the site language.
  // The global EN/UR switch is the single source of truth — no independent state.
  const invoiceLang: InvoiceLanguage = isUr ? "ur" : "en";
  const [logo, setLogo]               = useState<LogoState>({ src: null, align: "left", size: "medium" });
  const [sig, setSig]                 = useState<SigState>({ name: "", designation: "", image: null, stampImage: null, align: "left", size: "medium" });
  const [activeSection, setActiveSection] = useState<"business" | "client" | "items" | "settings">("business");

  const logoRef  = useRef<HTMLInputElement>(null);
  const sigImgRef   = useRef<HTMLInputElement>(null);
  const stampImgRef = useRef<HTMLInputElement>(null);

  const result   = calculateInvoice(invoice);
  const T        = TEMPLATES[template];
  const invDir   = invoiceLang === "ur" ? "rtl" : "ltr";
  const invNaskh = invoiceLang === "ur" ? "font-naskh" : "";

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

  const shownDiscount = combinedDiscount(result);
  const hasDiscount = shownDiscount > 0;

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      trackEvent("tool_download", { tool: "invoice_generator", export_format: "pdf", success: true });
      const payload = { invoice, template, invoiceLang, logo, sig };
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
  }, [invoice, template, invoiceLang, logo, sig, isUr]);

  const sections = [
    { id: "business" as const, label: L.businessInfo },
    { id: "client"   as const, label: L.clientInfo },
    { id: "items"    as const, label: L.lineItems },
    { id: "settings" as const, label: L.settings },
  ];

  // ── Invoice preview labels (invoiceLang-aware) ─────────────────────────────
  const IV = {
    invoice:    invoiceLang === "ur" ? "انوائس"                : "INVOICE",
    billTo:     invoiceLang === "ur" ? "بل وصول کنندہ"         : "BILL TO",
    desc:       invoiceLang === "ur" ? "تفصیل"                 : "Description",
    qty:        invoiceLang === "ur" ? "مقدار"                 : "Qty",
    price:      invoiceLang === "ur" ? "فی یونٹ قیمت"          : "Unit Price",
    disc:       invoiceLang === "ur" ? "چھوٹ"                  : "Disc",
    amount:     invoiceLang === "ur" ? "رقم"                   : "Amount",
    subtotal:   invoiceLang === "ur" ? "ذیلی کل"               : "Subtotal",
    discount:   invoiceLang === "ur" ? "دی گئی چھوٹ"           : "Discount Given",
    tax:        invoiceLang === "ur" ? "ٹیکس"                  : "Tax",
    total:      invoiceLang === "ur" ? "کل"                    : "Total",
    notes:      invoiceLang === "ur" ? "نوٹس"                  : "Notes",
    terms:      invoiceLang === "ur" ? "شرائط و ضوابط"         : "Terms & Conditions",
    date:       invoiceLang === "ur" ? "تاریخ"                 : "Date",
    due:        invoiceLang === "ur" ? "آخری تاریخ"            : "Due Date",
    authSig:    invoiceLang === "ur" ? "دستخط"                 : "Authorized Signature",
    stampLabel: invoiceLang === "ur" ? "مہر / ٹھپہ"            : "Company Stamp",
    payterms:   invoiceLang === "ur" ? "ادائیگی کی شرائط"      : "Payment Terms",
  };

  // ── Logo renderer (shared across all non-classic templates) ───────────────
  function LogoImg({ inHeader = false }: { inHeader?: boolean }) {
    if (!logo.src) return null;
    const h = LOGO_SIZE_MAP[logo.size];
    const justMap: Record<Alignment, string> = { left: "flex-start", center: "center", right: "flex-end" };
    return (
      <div style={{ display: "flex", justifyContent: justMap[logo.align], marginBottom: inHeader ? 10 : 0 }}>
        <img src={logo.src} alt="logo"
          style={{ height: h, maxWidth: "100%", objectFit: "contain", display: "block" }} />
      </div>
    );
  }

  // ── Signature renderer (shared) ────────────────────────────────────────────
  function SigBlock({ accentColor }: { accentColor: string }) {
    const h = SIG_SIZE_MAP[sig.size];
    const justMap: Record<Alignment, string> = { left: "flex-start", center: "center", right: "flex-end" };
    const txAlign: Record<Alignment, "left" | "center" | "right"> = { left: "left", center: "center", right: "right" };
    return (
      <div style={{ display: "flex", justifyContent: justMap[sig.align] }}>
        <div style={{ textAlign: txAlign[sig.align], minWidth: 180 }}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-5 ${invNaskh}`} style={{ color: accentColor }}>
            {IV.authSig}
          </p>
          {sig.image && (
            <div style={{ marginBottom: 6, display: "flex", justifyContent: justMap[sig.align] }}>
              <img src={sig.image} alt="signature"
                style={{ height: h, maxWidth: 200, maxHeight: h, objectFit: "contain", display: "block" }} />
            </div>
          )}
          <div style={{ borderBottom: "1.5px solid #374151", marginBottom: 5, width: "100%", maxWidth: 180 }} />
          {sig.name && <p className={`text-xs font-bold text-gray-800 ${invNaskh}`}>{sig.name}</p>}
          {sig.designation && <p className={`text-xs text-gray-500 ${invNaskh}`}>{sig.designation}</p>}
          {sig.stampImage && (
            <div style={{ marginTop: 8, display: "flex", justifyContent: justMap[sig.align] }}>
              <img src={sig.stampImage} alt="stamp"
                style={{ height: 60, maxWidth: 80, objectFit: "contain", display: "block", opacity: 0.85 }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── PRINT-ONLY STYLE: isolate invoice from site chrome ──────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print-root { display: block !important; }
          #invoice-print-root * { display: revert !important; }
          @page { margin: 12mm; size: A4 portrait; }
        }
      `}</style>

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
                  {/* Template */}
                  <div>
                    <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.template}</label>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.keys(TEMPLATES) as Template[]).map(t => (
                        <button key={t} onClick={() => setTemplate(t)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                            ${template === t ? "border-amber-600 bg-amber-50 text-amber-900" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                          {isUr ? TEMPLATES[t].labelUr : TEMPLATES[t].label}
                        </button>
                      ))}
                    </div>
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
                        {IV.stampLabel} <span className="font-normal text-gray-300">({isUr ? "اختیاری" : "optional"})</span>
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
            className="rounded-2xl shadow-md overflow-hidden print:shadow-none print:border-0 print:rounded-none print:fixed print:inset-0 print:z-[9999] print:overflow-visible"
            style={{ colorScheme: "light", background: "#ffffff", color: "#111827", border: "1px solid #FDE68A" }}
            dir={invDir}>

            {/* Badge strip — hidden on print */}
            <div className="print:hidden px-4 py-2 border-b flex items-center justify-between"
              style={{ borderColor: "#FEF3C7", background: "#FFFBEB" }}>
              <span className={`text-[11px] font-bold text-gray-400 uppercase tracking-widest ${naskh}`}>{L.preview}</span>
              <span className="text-[11px] text-gray-400">{invoiceLang === "ur" ? "اردو" : "English"} · {isUr ? TEMPLATES[template].labelUr : TEMPLATES[template].label}</span>
            </div>

            <div className="p-4 sm:p-6 md:p-8" style={{ fontFamily: invoiceLang === "ur" ? "var(--font-naskh),'Noto Naskh Arabic',sans-serif" : "inherit", background: "#ffffff", color: "#111827" }}>

              {/* ── CLASSIC TEMPLATE ─────────────────────────────────── */}
              {template === "classic" ? (
                <div style={{ direction: invDir, fontFamily: invoiceLang === "ur" ? "var(--font-naskh),'Noto Naskh Arabic',sans-serif" : "inherit" }}>
                  {/* Header */}
                  <div style={{ textAlign: "center", marginBottom: 16, borderBottom: "2px solid #111827", paddingBottom: 12 }}>
                    {logo.src && (
                      <div style={{ display: "flex", justifyContent: logo.align === "left" ? "flex-start" : logo.align === "right" ? "flex-end" : "center", marginBottom: 8 }}>
                        <img src={logo.src} alt="logo" style={{ height: LOGO_SIZE_MAP[logo.size], objectFit: "contain" }} />
                      </div>
                    )}
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>
                      {invoice.seller.name || (invoiceLang === "ur" ? "آپ کا کاروباری نام" : "Your Business Name")}
                    </h2>
                    {invoice.seller.address && <p style={{ fontSize: 11, color: "#374151", margin: "2px 0 0" }} className={invNaskh}>{invoice.seller.address}</p>}
                    <p style={{ fontSize: 11, color: "#374151", margin: "2px 0 0" }} dir="ltr">
                      {[invoice.seller.phone, invoice.seller.email, invoice.seller.website].filter(Boolean).join("  |  ")}
                    </p>
                  </div>
                  <p style={{ textAlign: "center", fontSize: 15, fontWeight: 900, letterSpacing: "0.15em", color: "#111827", margin: "10px 0 14px" }} className={invNaskh}>
                    {invoiceLang === "ur" ? "انوائس" : "INVOICE"}
                  </p>
                  {/* Meta table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <td style={{ border: "1px solid #111827", padding: "5px 8px", fontWeight: 700, width: "14%", whiteSpace: "nowrap" }} className={invNaskh}>{invoiceLang === "ur" ? "بنام" : "To"}</td>
                        <td style={{ border: "1px solid #111827", padding: "5px 8px", width: "44%" }} className={invNaskh}>
                          {invoice.client.name || (invoiceLang === "ur" ? "موصول کنندہ" : "Client Name")}
                          {invoice.client.address && <span style={{ color: "#6B7280", fontSize: 10 }}>{" — "}{invoice.client.address}</span>}
                        </td>
                        <td style={{ border: "1px solid #111827", padding: "5px 8px", fontWeight: 700, width: "14%", whiteSpace: "nowrap" }} className={invNaskh}>{invoiceLang === "ur" ? "تاریخ" : "Date"}</td>
                        <td style={{ border: "1px solid #111827", padding: "5px 8px" }} dir="ltr">{invoice.issueDate}</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #111827", padding: "5px 8px", fontWeight: 700 }} className={invNaskh}>{invoiceLang === "ur" ? "انوائس نمبر" : "Invoice #"}</td>
                        <td style={{ border: "1px solid #111827", padding: "5px 8px" }} dir="ltr">{invoice.number}</td>
                        {invoice.dueDate ? (
                          <>
                            <td style={{ border: "1px solid #111827", padding: "5px 8px", fontWeight: 700 }} className={invNaskh}>{invoiceLang === "ur" ? "آخری تاریخ" : "Due Date"}</td>
                            <td style={{ border: "1px solid #111827", padding: "5px 8px" }} dir="ltr">{invoice.dueDate}</td>
                          </>
                        ) : (
                          <><td style={{ border: "1px solid #111827", padding: "5px 8px" }} /><td style={{ border: "1px solid #111827", padding: "5px 8px" }} /></>
                        )}
                      </tr>
                    </tbody>
                  </table>
                  {/* Items */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F3F4F6" }}>
                        {[
                          [invoiceLang === "ur" ? "نمبر" : "S. No.", "7%", "center"],
                          [invoiceLang === "ur" ? "تفصیل" : "Particulars", "", invDir === "rtl" ? "right" : "left"],
                          [invoiceLang === "ur" ? "مقدار" : "Qty", "8%", "center"],
                          [invoiceLang === "ur" ? "نرخ" : "Rate", "12%", "right"],
                          [invoiceLang === "ur" ? "چھوٹ" : "Disc", "10%", "right"],
                          [invoiceLang === "ur" ? "رقم" : "Amount", "14%", "right"],
                        ].map(([h, w, a]) => (
                          <th key={h as string} style={{ border: "1px solid #111827", padding: "6px 8px", width: w as string || undefined, textAlign: a as "left" | "center" | "right", fontWeight: 700 }} className={invNaskh}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((it, i) => (
                        <tr key={it.id}>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "center" }} dir="ltr">{i + 1}</td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: invDir === "rtl" ? "right" : "left" }} className={invNaskh}>{it.description || "—"}</td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "center" }} dir="ltr">{fmtNum(it.quantity, invoiceLang)}</td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "right" }} dir="ltr">{fmtPrice(it.unitPrice, invoiceLang)}</td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "right", color: lineDiscountLabel(it) === "—" ? "#6B7280" : "#DC2626" }} dir="ltr">{lineDiscountLabel(it)}</td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "right", fontWeight: 600 }} dir="ltr">{fmtPrice(parseFloat(fromMinor(result.lineTotals[i] || 0, 2)), invoiceLang)}</td>
                        </tr>
                      ))}
                      {invoice.items.length < 5 && Array.from({ length: 5 - invoice.items.length }).map((_, i) => (
                        <tr key={`blank-${i}`}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} style={{ border: "1px solid #111827", padding: "6px 8px" }}>&nbsp;</td>
                          ))}
                        </tr>
                      ))}
                      {hasDiscount && (
                        <tr>
                          <td colSpan={5} style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: invDir === "rtl" ? "left" : "right", fontWeight: 700, fontSize: 12 }} className={invNaskh}>
                            {IV.discount}
                          </td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#DC2626" }} dir="ltr">
                            −{fmt(shownDiscount, invoice.currency, invoiceLang)}
                          </td>
                        </tr>
                      )}
                      {result.taxes.filter(t => t.amount !== 0).map(t => (
                        <tr key={t.name}>
                          <td colSpan={5} style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: invDir === "rtl" ? "left" : "right", fontWeight: 700, fontSize: 12 }} className={invNaskh}>
                            {t.name}
                          </td>
                          <td style={{ border: "1px solid #111827", padding: "6px 8px", textAlign: "right", fontWeight: 700, fontSize: 12 }} dir="ltr">
                            {fmt(t.amount, invoice.currency, invoiceLang)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: "#F3F4F6" }}>
                        <td colSpan={5} style={{ border: "1px solid #111827", padding: "7px 8px", textAlign: invDir === "rtl" ? "left" : "right", fontWeight: 800, fontSize: 13 }} className={invNaskh}>
                          {invoiceLang === "ur" ? "کل رقم" : "TOTAL"}
                        </td>
                        <td style={{ border: "1px solid #111827", padding: "7px 8px", textAlign: "right", fontWeight: 800, fontSize: 13 }} dir="ltr">
                          {fmt(result.total, invoice.currency, invoiceLang)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {(invoice.notes || invoice.terms) && (
                    <div style={{ marginTop: 10, fontSize: 11, color: "#374151" }}>
                      {invoice.notes && <p className={invNaskh}><strong>{invoiceLang === "ur" ? "نوٹ:" : "Note:"}</strong> {invoice.notes}</p>}
                      {invoice.terms && <p className={invNaskh} style={{ marginTop: 3 }}><strong>{invoiceLang === "ur" ? "شرائط:" : "Terms:"}</strong> {invoice.terms}</p>}
                    </div>
                  )}
                  {/* Classic signature */}
                  <div style={{ marginTop: 28, display: "flex", justifyContent: sig.align === "left" ? "flex-start" : sig.align === "right" ? "flex-end" : "center" }}>
                    <div style={{ textAlign: sig.align, minWidth: 180 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, marginBottom: sig.image ? 8 : 28, color: "#374151" }} className={invNaskh}>
                        {invoiceLang === "ur" ? "دستخط / مجاز دستخط" : "Authorized Signature"}
                      </p>
                      {sig.image && (
                        <div style={{ marginBottom: 6 }}>
                          <img src={sig.image} alt="signature" style={{ height: SIG_SIZE_MAP[sig.size], maxWidth: 200, objectFit: "contain" }} />
                        </div>
                      )}
                      <div style={{ borderBottom: "2px solid #374151", marginBottom: 4, width: 160 }} />
                      {sig.name && <p style={{ fontSize: 11, fontWeight: 700, color: "#111827" }} className={invNaskh}>{sig.name}</p>}
                      {sig.designation && <p style={{ fontSize: 10, color: "#6B7280" }} className={invNaskh}>{sig.designation}</p>}
                      {sig.stampImage && (
                        <div style={{ marginTop: 8 }}>
                          <img src={sig.stampImage} alt="stamp"
                            style={{ height: 60, maxWidth: 80, objectFit: "contain", opacity: 0.85 }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              ) : (

                /* ── MODERN / MINIMAL / CORPORATE ─────────────────────── */
                <div>
                  {/* Header band */}
                  <div style={{ background: T.headerBg, borderBottom: `3px solid ${T.accent}`, margin: "-24px -32px 24px", padding: "20px 32px 18px" }}>
                    <LogoImg inHeader />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} dir={invDir}>
                      {/* Brand */}
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.headerText, margin: "0 0 4px" }} className={invNaskh}>
                          {invoice.seller.name || (invoiceLang === "ur" ? "آپ کا کاروباری نام" : "Your Business Name")}
                        </h2>
                        {invoice.seller.address && (
                          <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 2px", whiteSpace: "pre-wrap" }} className={invNaskh}>
                            {invoice.seller.address}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: "#9CA3AF" }} dir="ltr">
                          {[invoice.seller.phone, invoice.seller.email].filter(Boolean).join("  ·  ")}
                        </p>
                        {invoice.seller.website && <p style={{ fontSize: 10, color: "#9CA3AF" }} dir="ltr">{invoice.seller.website}</p>}
                        {invoice.seller.taxNumber && <p style={{ fontSize: 10, color: "#9CA3AF" }} dir="ltr">{invoice.seller.taxNumber}</p>}
                      </div>
                      {/* Document area */}
                      <div style={{ textAlign: invDir === "rtl" ? "left" : "right", flexShrink: 0, paddingLeft: invDir === "ltr" ? 24 : 0, paddingRight: invDir === "rtl" ? 24 : 0 }}>
                        <p style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", color: T.accent, margin: "0 0 4px" }} className={invNaskh}>
                          {IV.invoice}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 4px" }} dir="ltr">{invoice.number}</p>
                        <p style={{ fontSize: 11, color: "#6B7280" }}>
                          <span className={invNaskh} style={{ fontWeight: 600 }}>{IV.date}: </span>
                          <span dir="ltr">{invoice.issueDate}</span>
                        </p>
                        {invoice.dueDate && (
                          <p style={{ fontSize: 11, color: "#6B7280" }}>
                            <span className={invNaskh} style={{ fontWeight: 600 }}>{IV.due}: </span>
                            <span dir="ltr">{invoice.dueDate}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bill-to + Terms */}
                  <div className="grid grid-cols-2 gap-5 mb-6" dir={invDir}>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: T.accent, marginBottom: 4 }}>
                        {IV.billTo}
                      </p>
                      <p className={`text-sm font-bold text-gray-800 ${invNaskh}`}>{invoice.client.name || (invoiceLang === "ur" ? "موصول کنندہ" : "Client Name")}</p>
                      {invoice.client.contactPerson && <p className={`text-xs text-gray-600 ${invNaskh}`}>{invoice.client.contactPerson}</p>}
                      {invoice.client.address && <p className={`text-xs text-gray-500 whitespace-pre-wrap ${invNaskh}`}>{invoice.client.address}</p>}
                      {invoice.client.email && <p className="text-xs text-gray-500" dir="ltr">{invoice.client.email}</p>}
                      {invoice.client.phone && <p className="text-xs text-gray-500" dir="ltr">{invoice.client.phone}</p>}
                    </div>
                    {invoice.terms && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: T.accent, marginBottom: 4 }}>
                          {IV.payterms}
                        </p>
                        <p className={`text-xs text-gray-600 ${invNaskh}`}>{invoice.terms}</p>
                      </div>
                    )}
                  </div>

                  {/* Items table */}
                  <table className="w-full text-xs mb-5" style={{ borderCollapse: "collapse", direction: invDir }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${T.accent}` }}>
                        <th className={`py-2 font-bold text-gray-700 ${invNaskh}`}
                          style={{ textAlign: invDir === "rtl" ? "right" : "left", paddingLeft: invDir === "ltr" ? 4 : 0, paddingRight: invDir === "rtl" ? 4 : 0 }}>
                          {IV.desc}
                        </th>
                        <th className="py-2 font-bold text-gray-700 text-right" style={{ width: 40 }}>{IV.qty}</th>
                        <th className="py-2 font-bold text-gray-700 text-right" style={{ width: 70 }}>{IV.price}</th>
                        <th className="py-2 font-bold text-gray-700 text-right" style={{ width: 56 }}>{IV.disc}</th>
                        <th className="py-2 font-bold text-gray-700 text-right" style={{ width: 80 }}>{IV.amount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((it, i) => (
                        <tr key={it.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                          <td className={`py-2 text-gray-700 ${invNaskh}`}
                            style={{ textAlign: invDir === "rtl" ? "right" : "left", paddingLeft: invDir === "ltr" ? 4 : 0, paddingRight: invDir === "rtl" ? 4 : 0 }}>
                            {it.description || "—"}
                          </td>
                          <td className="py-2 text-right text-gray-600" dir="ltr">{fmtNum(it.quantity, invoiceLang)}</td>
                          <td className="py-2 text-right text-gray-600" dir="ltr">{fmtPrice(it.unitPrice, invoiceLang)}</td>
                          <td className={`py-2 text-right ${lineDiscountLabel(it) === "—" ? "text-gray-400" : "text-red-600"}`} dir="ltr">{lineDiscountLabel(it)}</td>
                          <td className="py-2 text-right font-semibold text-gray-800" dir="ltr">{fmtPrice(parseFloat(fromMinor(result.lineTotals[i] || 0, 2)), invoiceLang)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex" style={{ justifyContent: invDir === "rtl" ? "flex-start" : "flex-end" }}>
                    <div className="w-52 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span className={invNaskh}>{IV.subtotal}</span>
                        <span dir="ltr">{fmt(result.grossSubtotal, invoice.currency, invoiceLang)}</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex justify-between text-gray-600">
                          <span className={invNaskh}>{IV.discount}</span>
                          <span dir="ltr" className="text-red-600">−{fmt(shownDiscount, invoice.currency, invoiceLang)}</span>
                        </div>
                      )}
                      {result.taxes.filter(t => t.amount !== 0).map(t => (
                        <div key={t.name} className="flex justify-between text-gray-600">
                          <span className={invNaskh}>{t.name}</span>
                          <span dir="ltr">{fmt(t.amount, invoice.currency, invoiceLang)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black text-sm border-t-2 pt-2 mt-1"
                        style={{ borderColor: T.accent, color: T.accentText }}>
                        <span className={invNaskh}>{IV.total}</span>
                        <span dir="ltr">{fmt(result.total, invoice.currency, invoiceLang)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Terms */}
                  {invoice.notes && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${invNaskh}`} style={{ color: T.accent }}>{IV.notes}</p>
                      <p className={`text-xs text-gray-600 whitespace-pre-wrap ${invNaskh}`}>{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.terms && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${invNaskh}`} style={{ color: T.accent }}>{IV.terms}</p>
                      <p className={`text-xs text-gray-500 ${invNaskh}`}>{invoice.terms}</p>
                    </div>
                  )}

                  {/* Signature */}
                  <div className="mt-6 sm:mt-10 pt-4 sm:pt-5 border-t border-gray-100">
                    <SigBlock accentColor={T.accent} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
