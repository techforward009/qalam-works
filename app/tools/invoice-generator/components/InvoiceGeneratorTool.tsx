"use client";

import { useState, useRef, useCallback } from "react";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import { useLanguage } from "../../../lib/language-context";
import { useEffect } from "react";
import {
  calculateInvoice,
  fromMinor,
  type Invoice,
  type LineItem,
} from "../utils/invoiceEngine";

// ── Types ────────────────────────────────────────────────────────────────────
type Template = "modern" | "minimal" | "corporate";
type InvoiceLanguage = "en" | "ur";
interface Signature {
  name: string;
  designation: string;
  companyStamp: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function newItem(): LineItem {
  return {
    id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    discountPercent: 0,
    taxes: [{ name: "Tax", percent: 0 }],
  };
}

const DEFAULT_INVOICE: Invoice = {
  id: "draft-1",
  type: "invoice",
  number: `INV-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "draft",
  seller: { name: "", email: "", phone: "", address: "", website: "", taxNumber: "" },
  client: { name: "", email: "", phone: "", address: "" },
  items: [newItem()],
  currency: "USD",
  notes: "",
  terms: "",
};

const DEFAULT_SIG: Signature = { name: "", designation: "", companyStamp: false };

// ── Template palettes ─────────────────────────────────────────────────────────
const TEMPLATES: Record<Template, { accent: string; accentText: string; headerBg: string; headerText: string; label: string; labelUr: string }> = {
  modern:    { accent: "#B45309", accentText: "#92400E", headerBg: "#FFFBEB", headerText: "#78350F", label: "Modern",    labelUr: "جدید" },
  minimal:   { accent: "#374151", accentText: "#1F2937", headerBg: "#F9FAFB", headerText: "#111827", label: "Minimal",   labelUr: "سادہ" },
  corporate: { accent: "#1E3A5F", accentText: "#1E3A5F", headerBg: "#EFF6FF", headerText: "#1E3A5F", label: "Corporate", labelUr: "کارپوریٹ" },
};

// ── Currency format ────────────────────────────────────────────────────────
function fmt(minor: number, currency: string, invoiceLang: InvoiceLanguage): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(invoiceLang === "ur" ? "ur-PK" : "en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${fromMinor(minor, 2)} ${currency}`;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function InvoiceGeneratorTool() {
  useEffect(() => { trackToolOpenOnce("invoice_generator"); }, []);
  const { language } = useLanguage();
  const isUr = language === "ur";
  const naskh = isUr ? "font-naskh" : "";
  const nastaliq = isUr ? "font-nastaliq font-normal" : "";

  const [invoice, setInvoice] = useState<Invoice>(DEFAULT_INVOICE);
  const [template, setTemplate] = useState<Template>("modern");
  const [invoiceLang, setInvoiceLang] = useState<InvoiceLanguage>("en");
  const [logo, setLogo] = useState<string | null>(null);
  const [sig, setSig] = useState<Signature>(DEFAULT_SIG);
  const [activeSection, setActiveSection] = useState<"business" | "client" | "items" | "settings">("business");
  const logoRef = useRef<HTMLInputElement>(null);
  const result = calculateInvoice(invoice);
  const T = TEMPLATES[template];
  const invDir = invoiceLang === "ur" ? "rtl" : "ltr";
  const invNaskh = invoiceLang === "ur" ? "font-naskh" : "";

  // ── UI labels ───────────────────────────────────────────────────────────────
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
    uploadLogo:      isUr ? "لوگو اپ لوڈ کریں" : "Upload Logo",
    removeLogo:      isUr ? "لوگو ہٹائیں" : "Remove Logo",
    template:        isUr ? "ٹیمپلیٹ" : "Template",
    invoiceLang:     isUr ? "انوائس کی زبان" : "Invoice Language",
    english:         isUr ? "انگریزی" : "English",
    urdu:            isUr ? "اردو" : "Urdu",
    signatureName:   isUr ? "دستخط کنندہ کا نام" : "Signatory Name",
    designation:     isUr ? "عہدہ" : "Designation",
    stamp:           isUr ? "کمپنی مہر شامل کریں" : "Include stamp placeholder",
    preview:         isUr ? "پیش نظارہ" : "Preview",
  };

  // ── Item helpers ────────────────────────────────────────────────────────────
  const updateItem = useCallback((idx: number, patch: Partial<LineItem>) => {
    setInvoice(inv => ({
      ...inv,
      items: inv.items.map((it, i) => i === idx ? { ...it, ...patch } : it),
    }));
  }, []);

  const addItem = useCallback(() =>
    setInvoice(inv => ({ ...inv, items: [...inv.items, newItem()] })), []);

  const removeItem = useCallback((idx: number) =>
    setInvoice(inv => ({ ...inv, items: inv.items.filter((_, i) => i !== idx) })), []);

  const handleLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const hasDiscount = result.discount > 0;
  const hasTax = result.taxes.some(t => t.amount !== 0);

  // ── Section tabs ────────────────────────────────────────────────────────────
  const sections = [
    { id: "business" as const, label: L.businessInfo },
    { id: "client" as const,   label: L.clientInfo },
    { id: "items" as const,    label: L.lineItems },
    { id: "settings" as const, label: L.settings },
  ];

  // ── Invoice preview labels (match invoiceLang, not UI language) ─────────────
  const IV = {
    invoice:    invoiceLang === "ur" ? "انوائس" : "INVOICE",
    billTo:     invoiceLang === "ur" ? "وصول کنندہ" : "BILL TO",
    from:       invoiceLang === "ur" ? "بھیجنے والا" : "FROM",
    desc:       invoiceLang === "ur" ? "تفصیل" : "Description",
    qty:        invoiceLang === "ur" ? "مقدار" : "Qty",
    price:      invoiceLang === "ur" ? "قیمت" : "Unit Price",
    amount:     invoiceLang === "ur" ? "رقم" : "Amount",
    subtotal:   invoiceLang === "ur" ? "ذیلی کل" : "Subtotal",
    discount:   invoiceLang === "ur" ? "چھوٹ" : "Discount",
    tax:        invoiceLang === "ur" ? "ٹیکس" : "Tax",
    total:      invoiceLang === "ur" ? "کل" : "Total",
    notes:      invoiceLang === "ur" ? "نوٹس" : "Notes",
    terms:      invoiceLang === "ur" ? "شرائط و ضوابط" : "Terms & Conditions",
    date:       invoiceLang === "ur" ? "تاریخ" : "Date",
    due:        invoiceLang === "ur" ? "آخری تاریخ" : "Due Date",
    authSig:    invoiceLang === "ur" ? "مجاز دستخط" : "Authorized Signature",
    stampLabel: invoiceLang === "ur" ? "مہر / ٹھپہ" : "Company Stamp",
  };

  return (
    <div className="site-container">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── EDITOR PANEL ──────────────────────────────────────────────── */}
        <div className="print:hidden bg-white rounded-2xl border border-amber-200/80 shadow-md overflow-hidden" style={{ color: '#1F2937' }}>

          {/* Section tabs */}
          <div className={`flex border-b border-amber-100 overflow-x-auto ${isUr ? "flex-row-reverse" : ""}`}>
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 min-w-max px-4 py-3 text-[13px] font-semibold transition-colors whitespace-nowrap ${naskh}
                  ${activeSection === s.id
                    ? "bg-amber-50 text-amber-900 border-b-2 border-amber-600"
                    : "text-gray-500 hover:text-amber-800 hover:bg-amber-50/50"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">

            {/* ── BUSINESS INFO ─────────────────────────────────────────── */}
            {activeSection === "business" && (
              <div className="space-y-3" dir={isUr ? "rtl" : "ltr"}>
                {/* Logo */}
                <div className={`flex items-center gap-3 ${isUr ? "flex-row-reverse" : ""}`}>
                  {logo ? (
                    <>
                      <img src={logo} alt="logo" className="h-14 w-14 object-contain rounded border border-gray-200" />
                      <button onClick={() => { setLogo(null); if (logoRef.current) logoRef.current.value = ""; }}
                        className={`text-xs text-red-500 hover:text-red-700 underline ${naskh}`}>
                        {L.removeLogo}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="h-14 w-14 rounded border-2 border-dashed border-amber-200 flex items-center justify-center text-amber-300 text-2xl cursor-pointer"
                        onClick={() => logoRef.current?.click()}>
                        ⬆
                      </div>
                      <button onClick={() => logoRef.current?.click()}
                        className={`text-xs text-amber-700 hover:text-amber-900 underline ${naskh}`}>
                        {L.uploadLogo}
                      </button>
                      <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                    </>
                  )}
                </div>

                {([
                  [L.companyName, "name", false],
                  [L.address, "address", true],
                  [L.email, "email", false],
                  [L.phone, "phone", false],
                  [L.website, "website", false],
                  [L.taxId, "taxNumber", false],
                ] as [string, keyof typeof invoice.seller, boolean][]).map(([lbl, key, multi]) => (
                  <div key={key}>
                    <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{lbl}</label>
                    {multi ? (
                      <textarea
                        value={(invoice.seller[key] as string) || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, seller: { ...inv.seller, [key]: e.target.value } }))}
                        rows={2}
                        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`}
                        dir={isUr && (key === "name" || key === "address") ? "rtl" : "ltr"}
                      />
                    ) : (
                      <input
                        value={(invoice.seller[key] as string) || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, seller: { ...inv.seller, [key]: e.target.value } }))}
                        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                        dir={isUr && (key === "name") ? "rtl" : "ltr"}
                      />
                    )}
                  </div>
                ))}

                {/* Invoice meta */}
                <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                  {[
                    [L.invoiceNumber, "number", "text", "ltr"],
                    [L.currency, "currency", "text", "ltr"],
                    [L.issueDate, "issueDate", "date", "ltr"],
                    [L.dueDate, "dueDate", "date", "ltr"],
                  ].map(([lbl, key, type]) => (
                    <div key={key as string}>
                      <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{lbl as string}</label>
                      <input
                        type={type as string}
                        value={(invoice[key as keyof Invoice] as string) || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, [key as string]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        dir="ltr"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.paymentTerms}</label>
                  <input
                    value={invoice.terms || ""}
                    onChange={e => setInvoice(inv => ({ ...inv, terms: e.target.value }))}
                    placeholder={invoiceLang === "ur" ? "مثلاً: وصولی پر ادائیگی" : "e.g. Net 30"}
                    className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                    dir={isUr ? "rtl" : "ltr"}
                  />
                </div>
              </div>
            )}

            {/* ── CLIENT INFO ───────────────────────────────────────────── */}
            {activeSection === "client" && (
              <div className="space-y-3" dir={isUr ? "rtl" : "ltr"}>
                {([
                  [L.clientName, "name", false],
                  [L.companyName, "contactPerson", false],
                  [L.address, "address", true],
                  [L.email, "email", false],
                  [L.phone, "phone", false],
                ] as [string, keyof typeof invoice.client, boolean][]).map(([lbl, key, multi]) => (
                  <div key={key}>
                    <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{lbl}</label>
                    {multi ? (
                      <textarea
                        value={(invoice.client[key] as string) || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, client: { ...inv.client, [key]: e.target.value } }))}
                        rows={2}
                        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`}
                        dir={isUr ? "rtl" : "ltr"}
                      />
                    ) : (
                      <input
                        value={(invoice.client[key] as string) || ""}
                        onChange={e => setInvoice(inv => ({ ...inv, client: { ...inv.client, [key]: e.target.value } }))}
                        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                        dir={isUr && key === "name" ? "rtl" : "ltr"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── LINE ITEMS ────────────────────────────────────────────── */}
            {activeSection === "items" && (
              <div className="space-y-3" dir={isUr ? "rtl" : "ltr"}>
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide px-0.5">
                  <span className="col-span-5">{L.description}</span>
                  <span className="col-span-1 text-center">{L.qty}</span>
                  <span className="col-span-2 text-center">{L.price}</span>
                  <span className="col-span-1 text-center">{L.disc}</span>
                  <span className="col-span-1 text-center">{L.tax}</span>
                  <span className="col-span-2 text-right">{L.amount}</span>
                </div>

                {invoice.items.map((it, idx) => (
                  <div key={it.id} className="space-y-1">
                    <div className="grid grid-cols-12 gap-1 items-center">
                      <input
                        value={it.description}
                        onChange={e => updateItem(idx, { description: e.target.value })}
                        placeholder={L.description}
                        className={`col-span-5 border border-gray-200 rounded px-2 py-1.5 text-xs ${isUr ? "text-right font-naskh" : ""}`}
                        dir={isUr ? "rtl" : "ltr"}
                      />
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
                          {fromMinor(result.lineTotals[idx] || 0, 2)}
                        </span>
                        <button onClick={() => removeItem(idx)} disabled={invoice.items.length <= 1}
                          className="text-red-400 hover:text-red-600 disabled:opacity-20 text-xs ml-1">✕</button>
                      </div>
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
                      rows={3}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`}
                      dir={isUr ? "rtl" : "ltr"} />
                  </div>
                  <div>
                    <label className={`block text-[12px] font-semibold text-gray-500 mb-1 ${naskh}`}>{L.terms}</label>
                    <textarea value={invoice.terms || ""}
                      onChange={e => setInvoice(inv => ({ ...inv, terms: e.target.value }))}
                      rows={2}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none ${naskh}`}
                      dir={isUr ? "rtl" : "ltr"} />
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS ─────────────────────────────────────────────── */}
            {activeSection === "settings" && (
              <div className="space-y-4" dir={isUr ? "rtl" : "ltr"}>
                {/* Template */}
                <div>
                  <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.template}</label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(TEMPLATES) as Template[]).map(t => (
                      <button key={t} onClick={() => setTemplate(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                          ${template === t
                            ? "border-amber-600 bg-amber-50 text-amber-900"
                            : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                        {isUr ? TEMPLATES[t].labelUr : TEMPLATES[t].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invoice language */}
                <div>
                  <label className={`block text-[12px] font-bold text-gray-500 mb-2 ${naskh}`}>{L.invoiceLang}</label>
                  <div className="flex gap-2">
                    {(["en", "ur"] as InvoiceLanguage[]).map(l => (
                      <button key={l} onClick={() => setInvoiceLang(l)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${naskh}
                          ${invoiceLang === l
                            ? "border-amber-600 bg-amber-50 text-amber-900"
                            : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                        {l === "en" ? L.english : L.urdu}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signature */}
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <p className={`text-[12px] font-bold text-gray-500 ${naskh}`}>{IV.authSig}</p>
                  <div>
                    <label className={`block text-[11px] font-semibold text-gray-400 mb-1 ${naskh}`}>{L.signatureName}</label>
                    <input value={sig.name} onChange={e => setSig(s => ({ ...s, name: e.target.value }))}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                      dir={isUr ? "rtl" : "ltr"} />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold text-gray-400 mb-1 ${naskh}`}>{L.designation}</label>
                    <input value={sig.designation} onChange={e => setSig(s => ({ ...s, designation: e.target.value }))}
                      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm ${naskh}`}
                      dir={isUr ? "rtl" : "ltr"} />
                  </div>
                  <label className={`flex items-center gap-2 cursor-pointer ${isUr ? "flex-row-reverse" : ""}`}>
                    <input type="checkbox" checked={sig.companyStamp}
                      onChange={e => setSig(s => ({ ...s, companyStamp: e.target.checked }))}
                      className="rounded accent-amber-600" />
                    <span className={`text-sm text-gray-600 ${naskh}`}>{L.stamp}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Print button — always visible */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  trackEvent("tool_download", { tool: "invoice_generator", export_format: "pdf", success: true });
                  window.print();
                }}
                className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all ${naskh}`}
                style={{ background: T.accent }}
              >
                {L.printSave}
              </button>
            </div>
          </div>
        </div>

        {/* ── PREVIEW PANEL ───────────────────────────────────────────────── */}
        {/* color-scheme:light forces the browser to treat this subtree as
            light-mode regardless of the OS/app theme.  All text, borders,
            and backgrounds inside the invoice document are specified with
            explicit values, so they never inherit the dark CSS tokens.     */}
        <div
          className="rounded-2xl shadow-md overflow-hidden print:shadow-none print:border-0 print:rounded-none"
          style={{
            colorScheme: "light",
            background: "#ffffff",
            color: "#111827",
            border: "1px solid #FDE68A",
          }}
          dir={invDir}
        >
          {/* Preview header badge — hidden on print */}
          <div className="print:hidden px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: "#FEF3C7", background: "#FFFBEB" }}>
            <span className={`text-[11px] font-bold text-gray-400 uppercase tracking-widest ${naskh}`}>{L.preview}</span>
            <span className="text-[11px] text-gray-400">{invoiceLang === "ur" ? "اردو" : "English"} · {isUr ? TEMPLATES[template].labelUr : TEMPLATES[template].label}</span>
          </div>

          <div className="p-7" style={{ fontFamily: invoiceLang === "ur" ? "var(--font-naskh), 'Noto Naskh Arabic', sans-serif" : "inherit", background: "#ffffff", color: "#111827" }}>

            {/* Invoice header */}
            <div className={`flex justify-between items-start mb-7 pb-5 border-b-2`}
              style={{ borderColor: T.accent, flexDirection: invDir === "rtl" ? "row-reverse" : "row" }}>
              <div>
                {logo && <img src={logo} alt="logo" className="h-14 object-contain mb-2" style={{ float: invDir === "rtl" ? "right" : "left" }} />}
                <div style={{ clear: "both" }}>
                  <h2 className="text-lg font-bold" style={{ color: T.headerText }}>
                    {invoice.seller.name || (invoiceLang === "ur" ? "آپ کا کاروباری نام" : "Your Business Name")}
                  </h2>
                  {invoice.seller.address && <p className={`text-xs text-gray-500 whitespace-pre-wrap mt-0.5 ${invNaskh}`}>{invoice.seller.address}</p>}
                  {invoice.seller.email && <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{invoice.seller.email}</p>}
                  {invoice.seller.phone && <p className="text-xs text-gray-500" dir="ltr">{invoice.seller.phone}</p>}
                  {invoice.seller.website && <p className="text-xs text-gray-400" dir="ltr">{invoice.seller.website}</p>}
                  {invoice.seller.taxNumber && <p className="text-xs text-gray-400" dir="ltr">{IV.tax && ""}{invoice.seller.taxNumber}</p>}
                </div>
              </div>

              <div style={{ textAlign: invDir === "rtl" ? "left" : "right" }}>
                <p className="text-2xl font-black tracking-tight" style={{ color: T.accent }}>{IV.invoice}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1" dir="ltr">{invoice.number}</p>
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  <p><span className={`font-semibold ${invNaskh}`}>{IV.date}:</span> <span dir="ltr">{invoice.issueDate}</span></p>
                  {invoice.dueDate && <p><span className={`font-semibold ${invNaskh}`}>{IV.due}:</span> <span dir="ltr">{invoice.dueDate}</span></p>}
                </div>
              </div>
            </div>

            {/* From / Bill To */}
            <div className="grid grid-cols-2 gap-5 mb-6">
              <div style={{ textAlign: invDir === "rtl" ? "right" : "left" }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: T.accent }}>{IV.billTo}</p>
                <p className={`text-sm font-bold text-gray-800 ${invNaskh}`}>{invoice.client.name || (invoiceLang === "ur" ? "موصول کنندہ" : "Client Name")}</p>
                {invoice.client.contactPerson && <p className={`text-xs text-gray-600 ${invNaskh}`}>{invoice.client.contactPerson}</p>}
                {invoice.client.address && <p className={`text-xs text-gray-500 whitespace-pre-wrap ${invNaskh}`}>{invoice.client.address}</p>}
                {invoice.client.email && <p className="text-xs text-gray-500" dir="ltr">{invoice.client.email}</p>}
                {invoice.client.phone && <p className="text-xs text-gray-500" dir="ltr">{invoice.client.phone}</p>}
              </div>
              {invoice.terms && (
                <div style={{ textAlign: invDir === "rtl" ? "right" : "left" }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: T.accent }}>
                    {invoiceLang === "ur" ? "ادائیگی کی شرائط" : "Payment Terms"}
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
                  <th className="py-2 font-bold text-gray-700 text-right" style={{ width: 80 }}>{IV.amount}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td className={`py-2 text-gray-700 ${invNaskh}`} style={{ textAlign: invDir === "rtl" ? "right" : "left", paddingLeft: invDir === "ltr" ? 4 : 0, paddingRight: invDir === "rtl" ? 4 : 0 }}>
                      {it.description || "—"}
                    </td>
                    <td className="py-2 text-right text-gray-600" dir="ltr">{it.quantity}</td>
                    <td className="py-2 text-right text-gray-600" dir="ltr">{it.unitPrice.toFixed(2)}</td>
                    <td className="py-2 text-right font-semibold text-gray-800" dir="ltr">
                      {fromMinor(result.lineTotals[i] || 0, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex" style={{ justifyContent: invDir === "rtl" ? "flex-start" : "flex-end" }}>
              <div className="w-52 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span className={invNaskh}>{IV.subtotal}</span>
                  <span dir="ltr">{fmt(result.subtotal, invoice.currency, invoiceLang)}</span>
                </div>
                {hasDiscount && (
                  <div className="flex justify-between text-gray-600">
                    <span className={invNaskh}>{IV.discount}</span>
                    <span dir="ltr" className="text-red-600">−{fmt(result.discount, invoice.currency, invoiceLang)}</span>
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

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${invNaskh}`} style={{ color: T.accent }}>{IV.notes}</p>
                <p className={`text-xs text-gray-600 whitespace-pre-wrap ${invNaskh}`}>{invoice.notes}</p>
              </div>
            )}

            {/* Terms */}
            {invoice.terms && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${invNaskh}`} style={{ color: T.accent }}>{IV.terms}</p>
                <p className={`text-xs text-gray-500 ${invNaskh}`}>{invoice.terms}</p>
              </div>
            )}

            {/* ── SIGNATURE SECTION ────────────────────────────────────── */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-8"
                style={{ direction: invDir, gridTemplateColumns: invDir === "rtl" ? "1fr 1fr" : "1fr 1fr" }}>
                {/* Signature block */}
                <div style={{ textAlign: invDir === "rtl" ? "right" : "left" }}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-6 ${invNaskh}`}
                    style={{ color: T.accent }}>{IV.authSig}</p>
                  {/* Signature line */}
                  <div className="border-b-2 border-gray-400 mb-2" style={{ width: "80%" }}></div>
                  {sig.name && <p className={`text-xs font-bold text-gray-800 ${invNaskh}`}>{sig.name}</p>}
                  {sig.designation && <p className={`text-xs text-gray-500 ${invNaskh}`}>{sig.designation}</p>}
                  {invoice.seller.name && !sig.name && <p className={`text-xs text-gray-400 ${invNaskh}`}>{invoice.seller.name}</p>}
                </div>

                {/* Company stamp placeholder */}
                {sig.companyStamp && (
                  <div style={{ textAlign: invDir === "rtl" ? "right" : "left" }}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${invNaskh}`}
                      style={{ color: T.accent }}>{IV.stampLabel}</p>
                    <div className="h-20 w-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center"
                      style={{ display: "inline-flex" }}>
                      <span className={`text-[9px] text-gray-300 text-center leading-snug ${invNaskh}`}>
                        {invoiceLang === "ur" ? "مہر" : "STAMP"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
