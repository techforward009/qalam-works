"use client";

import { useState, useEffect } from "react";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import { useLanguage } from "../../../lib/language-context";
import {
  calculateInvoice,
  fromMinor,
  type Invoice,
  type LineItem,
} from "../utils/invoiceEngine";

function newItem(): LineItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description: "",
    quantity: 1,
    unit: "unit",
    unitPrice: 0,
  };
}

const DEFAULT_INVOICE: Invoice = {
  id: "draft-1",
  type: "invoice",
  number: `INV-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().slice(0, 10),
  status: "draft",
  seller: { name: "", email: "", phone: "" },
  client: { name: "", email: "", phone: "" },
  items: [newItem()],
  currency: "USD",
  notes: "",
};

export default function InvoiceGeneratorTool() {
  useEffect(() => { trackToolOpenOnce("invoice_generator"); }, []);
  const { language } = useLanguage();
  const isUr = language === "ur";
  const naskh = isUr ? "font-naskh" : "";

  const [invoice, setInvoice] = useState<Invoice>(DEFAULT_INVOICE);
  const result = calculateInvoice(invoice);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    const items = invoice.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setInvoice({ ...invoice, items });
  };

  const addItem = () => setInvoice({ ...invoice, items: [...invoice.items, newItem()] });
  const removeItem = (idx: number) =>
    setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== idx) });

  const L = {
    invoiceNumber: isUr ? "انوائس نمبر" : "Invoice Number",
    issueDate: isUr ? "تاریخ اجراء" : "Issue Date",
    currency: isUr ? "کرنسی" : "Currency",
    fromSeller: isUr ? "بھیجنے والا" : "From (Seller)",
    toClient: isUr ? "موصول کنندہ" : "To (Client)",
    name: isUr ? "نام یا ادارہ" : "Name or Business",
    email: isUr ? "ای میل" : "Email",
    phone: isUr ? "فون" : "Phone",
    clientName: isUr ? "موصول کنندہ کا نام" : "Client Name",
    lineItems: isUr ? "اشیاء" : "Line Items",
    description: isUr ? "تفصیل" : "Description",
    qty: isUr ? "مقدار" : "Qty",
    price: isUr ? "قیمت" : "Price",
    amount: isUr ? "رقم" : "Amount",
    addItem: isUr ? "+ نیا آئٹم شامل کریں" : "+ Add Item",
    notes: isUr ? "نوٹس" : "Notes",
    printSave: isUr ? "پرنٹ کریں / PDF محفوظ کریں" : "Print / Save as PDF",
    billTo: isUr ? "وصول کنندہ" : "BILL TO",
    subtotal: isUr ? "ذیلی کل" : "Subtotal",
    total: isUr ? "کل" : "Total",
    invoice: isUr ? "انوائس" : "INVOICE",
    notesLabel: isUr ? "نوٹس" : "Notes",
  };

  return (
    <div className="site-container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor — hidden when printing */}
        <div className="print:hidden bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md space-y-5" dir="ltr">
          {/* Invoice meta */}
          <div>
            <label className={`block text-[13px] font-semibold text-gray-700 mb-1 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
              {L.invoiceNumber}
            </label>
            <input
              value={invoice.number}
              onChange={(e) => setInvoice({ ...invoice, number: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[13px] font-semibold text-gray-700 mb-1 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
                {L.issueDate}
              </label>
              <input
                type="date"
                value={invoice.issueDate}
                onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className={`block text-[13px] font-semibold text-gray-700 mb-1 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
                {L.currency}
              </label>
              <input
                value={invoice.currency}
                onChange={(e) => setInvoice({ ...invoice, currency: e.target.value.toUpperCase() })}
                className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                dir="ltr"
                placeholder="USD, PKR, AED..."
              />
            </div>
          </div>

          {/* Seller */}
          <div className="border-t border-gray-200 pt-4">
            <p className={`text-[13px] font-bold text-amber-900 mb-2 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
              {L.fromSeller}
            </p>
            <input
              value={invoice.seller.name}
              onChange={(e) => setInvoice({ ...invoice, seller: { ...invoice.seller, name: e.target.value } })}
              placeholder={L.name}
              className={`w-full border border-gray-300 p-2 rounded-lg text-sm mb-2 ${naskh}`}
            />
            <input
              value={invoice.seller.email || ""}
              onChange={(e) => setInvoice({ ...invoice, seller: { ...invoice.seller, email: e.target.value } })}
              placeholder={L.email}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm mb-2"
              dir="ltr"
            />
            <input
              value={invoice.seller.phone || ""}
              onChange={(e) => setInvoice({ ...invoice, seller: { ...invoice.seller, phone: e.target.value } })}
              placeholder={L.phone}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          {/* Client */}
          <div className="border-t border-gray-200 pt-4">
            <p className={`text-[13px] font-bold text-amber-900 mb-2 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
              {L.toClient}
            </p>
            <input
              value={invoice.client.name}
              onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
              placeholder={L.clientName}
              className={`w-full border border-gray-300 p-2 rounded-lg text-sm mb-2 ${naskh}`}
            />
            <input
              value={invoice.client.email || ""}
              onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
              placeholder={L.email}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          {/* Line Items — natural reading order: dir="ltr" renders columns
              Description | Qty | Price | Amount left-to-right for English;
              dir="rtl" renders the SAME semantic column order but mirrored
              right-to-left for Urdu (Description on the right, Amount on
              the far left) — CSS grid auto-flows in reading direction, so
              no manual reordering of the underlying fields/state is
              needed. Quantity/Price/Amount stay dir="ltr" internally since
              digits are always written left-to-right. */}
          <div className="border-t border-gray-200 pt-4">
            <p className={`text-[13px] font-bold text-amber-900 mb-2 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
              {L.lineItems}
            </p>
            {/* Column headers — dir matches the data rows below */}
            <div className="grid grid-cols-12 gap-2 mb-1 text-[11px] font-semibold text-gray-500" dir={isUr ? "rtl" : "ltr"}>
              <span className="col-span-5">{L.description}</span>
              <span className="col-span-2 text-center">{L.qty}</span>
              <span className="col-span-2 text-right">{L.price}</span>
              <span className="col-span-2 text-right">{L.amount}</span>
            </div>
            <div className="space-y-2">
              {invoice.items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center" dir={isUr ? "rtl" : "ltr"}>
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder={L.description}
                    className={`col-span-5 border border-gray-300 p-2 rounded-lg text-xs ${isUr ? "text-right font-naskh" : ""}`}
                    dir={isUr ? "rtl" : "ltr"}
                  />
                  <input
                    type="number"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    className="col-span-2 border border-gray-300 p-2 rounded-lg text-xs text-center"
                    dir="ltr"
                    step="0.01"
                    min="0"
                  />
                  <input
                    type="number"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                    className="col-span-2 border border-gray-300 p-2 rounded-lg text-xs text-right"
                    dir="ltr"
                    step="0.01"
                    min="0"
                  />
                  <div
                    className="col-span-2 text-right text-xs text-gray-600 font-mono px-1 select-none"
                    dir="ltr"
                    title={L.amount}
                  >
                    {fromMinor(result.lineTotals[idx] || 0, 2)}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    disabled={invoice.items.length <= 1}
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 text-xs text-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className={`mt-3 text-[13px] font-semibold text-amber-700 hover:text-amber-900 underline ${naskh}`}
              dir={isUr ? "rtl" : "ltr"}
            >
              {L.addItem}
            </button>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-200 pt-4">
            <label className={`block text-[13px] font-semibold text-gray-700 mb-1 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
              {L.notes}
            </label>
            <textarea
              value={invoice.notes || ""}
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
              className={`w-full border border-gray-300 p-2 rounded-lg text-sm min-h-[60px] ${isUr ? "text-right font-naskh" : ""}`}
              dir={isUr ? "rtl" : "ltr"}
            />
          </div>

          <button
            onClick={() => { trackEvent("tool_download", { tool: "invoice_generator", export_format: "pdf", success: true }); window.print(); }}
            className={`w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all text-[15px] ${naskh}`}
          >
            {L.printSave}
          </button>
        </div>

        {/* Preview — this is what prints */}
        <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md print:shadow-none print:border-0" dir="ltr">
          <div className="flex justify-between items-start border-b-2 border-amber-600 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-amber-900">
                {invoice.seller.name || "Your Business Name"}
              </h2>
              {invoice.seller.email && <p className="text-xs text-gray-500">{invoice.seller.email}</p>}
              {invoice.seller.phone && <p className="text-xs text-gray-500">{invoice.seller.phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">{L.invoice}</p>
              <p className="text-xs text-gray-500">{invoice.number}</p>
              <p className="text-xs text-gray-500">{invoice.issueDate}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">{L.billTo}</p>
            <p className="text-sm font-bold text-gray-800">{invoice.client.name || "Client Name"}</p>
            {invoice.client.email && <p className="text-xs text-gray-500">{invoice.client.email}</p>}
          </div>

          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b border-gray-300 text-gray-500">
                <th className="text-left py-1.5">{L.description}</th>
                <th className="text-right py-1.5">{L.qty}</th>
                <th className="text-right py-1.5">{L.price}</th>
                <th className="text-right py-1.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={it.id} className="border-b border-gray-100">
                  <td className="py-1.5">{it.description || "—"}</td>
                  <td className="py-1.5 text-right">{it.quantity}</td>
                  <td className="py-1.5 text-right">{it.unitPrice.toFixed(2)}</td>
                  <td className="py-1.5 text-right">
                    {fromMinor(result.lineTotals[i] || 0, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>{L.subtotal}</span>
                <span>{fromMinor(result.subtotal, 2)} {invoice.currency}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-900 text-sm border-t border-gray-200 pt-1 mt-1">
                <span>{L.total}</span>
                <span>{fromMinor(result.total, 2)} {invoice.currency}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">{L.notesLabel}</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
