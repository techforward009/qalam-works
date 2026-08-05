"use client";

import { useState } from "react";
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
  const [invoice, setInvoice] = useState<Invoice>(DEFAULT_INVOICE);
  const result = calculateInvoice(invoice);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    const items = invoice.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setInvoice({ ...invoice, items });
  };

  const addItem = () => setInvoice({ ...invoice, items: [...invoice.items, newItem()] });
  const removeItem = (idx: number) =>
    setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== idx) });

  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor — hidden when printing */}
        <div className="print:hidden bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md space-y-5" dir="rtl">
          {/* Invoice meta */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" dir="ltr">
              Invoice Number / انوائس نمبر
            </label>
            <input
              value={invoice.number}
              onChange={(e) => setInvoice({ ...invoice, number: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm text-right"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1" dir="ltr">
                Issue Date / تاریخ
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
              <label className="block text-xs font-semibold text-gray-700 mb-1" dir="ltr">
                Currency / کرنسی
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
            <p className="text-sm font-bold text-amber-900 mb-2" dir="ltr">
              From (Seller) / بھیجنے والا
            </p>
            <input
              value={invoice.seller.name}
              onChange={(e) => setInvoice({ ...invoice, seller: { ...invoice.seller, name: e.target.value } })}
              placeholder="Your name or business / آپ کا نام یا کاروبار"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm mb-2 text-right"
            />
            <input
              value={invoice.seller.email || ""}
              onChange={(e) => setInvoice({ ...invoice, seller: { ...invoice.seller, email: e.target.value } })}
              placeholder="Email"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm mb-2"
              dir="ltr"
            />
            <input
              value={invoice.seller.phone || ""}
              onChange={(e) => setInvoice({ ...invoice, seller: { ...invoice.seller, phone: e.target.value } })}
              placeholder="Phone"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          {/* Client */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-bold text-amber-900 mb-2" dir="ltr">
              To (Client) / موصول کنندہ
            </p>
            <input
              value={invoice.client.name}
              onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
              placeholder="Client name / موصول کنندہ کا نام"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm mb-2 text-right"
            />
            <input
              value={invoice.client.email || ""}
              onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
              placeholder="Email"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          {/* Items */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-bold text-amber-900 mb-2" dir="ltr">
              Line Items / اشیاء
            </p>
            <div className="space-y-2">
              {invoice.items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Description / تفصیل"
                    className="col-span-6 border border-gray-300 p-2 rounded-lg text-xs text-right"
                  />
                  <input
                    type="number"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    className="col-span-2 border border-gray-300 p-2 rounded-lg text-xs"
                    dir="ltr"
                    step="0.01"
                  />
                  <input
                    type="number"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                    className="col-span-3 border border-gray-300 p-2 rounded-lg text-xs"
                    dir="ltr"
                    step="0.01"
                  />
                  <button
                    onClick={() => removeItem(idx)}
                    disabled={invoice.items.length <= 1}
                    className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-30 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
              dir="ltr"
            >
              + Add Item / نئی چیز شامل کریں
            </button>
          </div>

          {/* Notes */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1" dir="ltr">
              Notes / نوٹس
            </label>
            <textarea
              value={invoice.notes || ""}
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm min-h-[60px] text-right"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all text-sm"
            dir="ltr"
          >
            Print / Save as PDF
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
              <p className="text-lg font-bold text-gray-800">INVOICE</p>
              <p className="text-xs text-gray-500">{invoice.number}</p>
              <p className="text-xs text-gray-500">{invoice.issueDate}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">BILL TO</p>
            <p className="text-sm font-bold text-gray-800">{invoice.client.name || "Client Name"}</p>
            {invoice.client.email && <p className="text-xs text-gray-500">{invoice.client.email}</p>}
          </div>

          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b border-gray-300 text-gray-500">
                <th className="text-left py-1.5">Description</th>
                <th className="text-right py-1.5">Qty</th>
                <th className="text-right py-1.5">Price</th>
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
                <span>Subtotal</span>
                <span>{fromMinor(result.subtotal, 2)} {invoice.currency}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-900 text-sm border-t border-gray-200 pt-1 mt-1">
                <span>Total</span>
                <span>{fromMinor(result.total, 2)} {invoice.currency}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
