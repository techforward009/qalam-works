import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InvoiceDocumentPreview from "../app/tools/invoice-generator/components/InvoiceDocumentPreview";
import {
  calculateInvoice,
  combinedDiscount,
  formatInvoiceMinor,
  formatInvoicePrice,
  precisionForCurrency,
  lineDiscountLabel,
  type Invoice,
} from "../app/tools/invoice-generator/utils/invoiceEngine";
import { buildInvoiceHtml } from "../app/tools/invoice-generator/utils/buildInvoiceHtml";
import { buildInvoiceDocument, type InvoiceExportPayload } from "../app/tools/invoice-generator/utils/invoiceDocumentHtml";

function sampleInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "draft-1",
    type: "invoice",
    number: "INV-2026-001",
    issueDate: "2026-09-05",
    dueDate: "2026-09-06",
    status: "draft",
    seller: { name: "Mealfinity", address: "Wapda Town Multan", phone: "+92 331 5485778" },
    client: { name: "Haider Ali", email: "ha110halklsd@gmail.com" },
    items: [{
      id: "i-1",
      description: "Yougart",
      quantity: 1,
      unit: "",
      unitPrice: 200,
      discountPercent: 10,
      taxes: [{ name: "Tax", percent: 20 }],
    }],
    currency: "USD",
    notes: "",
    terms: "",
    ...overrides,
  };
}

describe("Invoice line discount is visible", () => {
  it("keeps tax on the discounted amount and reports the given discount", () => {
    const result = calculateInvoice(sampleInvoice());
    expect(result.grossSubtotal).toBe(20000);
    expect(result.lineDiscountTotal).toBe(2000);
    expect(result.subtotal).toBe(18000);
    expect(result.discount).toBe(0);
    expect(combinedDiscount(result)).toBe(2000);
    expect(result.taxes[0]?.amount).toBe(3600);
    expect(result.total).toBe(21600);
    expect(lineDiscountLabel(sampleInvoice().items[0])).toBe("10%");
  });

  it("prints Disc and Discount Given on the modern invoice", () => {
    const html = buildInvoiceHtml({
      invoice: sampleInvoice(),
      template: "modern",
      invoiceLang: "en",
      logo: { src: null, align: "center", size: "medium" },
      sig: { name: "", designation: "", image: null, stampImage: null, align: "right", size: "medium" },
    });
    expect(html).toContain("Disc");
    expect(html).toContain("10%");
    expect(html).toContain("Discount Given");
    expect(html).toMatch(/−\$20\.00|−US\$20\.00|−\$\s*20\.00/);
  });

  it("prints دی گئی چھوٹ on the Urdu invoice", () => {
    const html = buildInvoiceHtml({
      invoice: sampleInvoice(),
      template: "modern",
      invoiceLang: "ur",
      logo: { src: null, align: "center", size: "medium" },
      sig: { name: "", designation: "", image: null, stampImage: null, align: "right", size: "medium" },
    });
    expect(html).toContain("چھوٹ");
    expect(html).toContain("دی گئی چھوٹ");
    expect(html).toContain("10%");
  });
});

describe("Invoice currency precision", () => {
  const plainItem = { id: "jpy-1", description: "Service", quantity: 1, unit: "", unitPrice: 1000 };
  function payload(invoice: Invoice, style: "western" | "pakistani", invoiceLang: "en" | "ur"): InvoiceExportPayload {
    return {
      invoice, invoiceLang, print: { style },
      logo: { src: null, align: "center", size: "medium" },
      sig: { name: "", designation: "", image: null, stampImage: null, align: "right", size: "medium" },
    };
  }
  function rowAmount(html: string, row: string): string | undefined {
    return html.match(new RegExp(`<tr data-totals-row="${row}"[^>]*>[\\s\\S]*?<td data-col="amount"[^>]*>([^<]*)</td>`))?.[1];
  }

  it.each(["JPY", "jpy"])("stores and displays %s without scaling or forced decimals", currency => {
    const result = calculateInvoice(sampleInvoice({ currency, items: [plainItem] }));
    expect(precisionForCurrency(currency)).toBe(0);
    expect(result.lineTotals).toEqual([1000]);
    expect(result.total).toBe(1000);
    expect(formatInvoiceMinor(result.lineTotals[0], currency, "en")).toBe("1,000");
    expect(formatInvoiceMinor(result.total, currency, "en", true)).toBe("¥1,000");
    expect(formatInvoicePrice(1000, currency, "en")).toBe("1,000");
    expect(lineDiscountLabel({ ...plainItem, discountFixed: 100, discountPercent: 10 }, currency)).toBe("10% + 100");
  });

  it.each(["USD", "PKR"])("preserves %s two-decimal storage and display", currency => {
    const result = calculateInvoice(sampleInvoice({ currency, items: [{ ...plainItem, unitPrice: 10 }] }));
    expect(precisionForCurrency(currency)).toBe(2);
    expect(result.lineTotals).toEqual([1000]);
    expect(result.total).toBe(1000);
    expect(formatInvoiceMinor(1000, currency, "en")).toBe("10.00");
    expect(formatInvoicePrice(10, currency, "en")).toBe("10.00");
    expect(lineDiscountLabel({ ...plainItem, discountFixed: 1 }, currency)).toBe("1.00");
    for (const style of ["western", "pakistani"] as const) {
      const html = buildInvoiceDocument(payload(sampleInvoice({ currency, items: [{ ...plainItem, unitPrice: 10 }] }), style, "en")).pageHtml;
      expect(html).toMatch(/data-col="amount"[^>]*>10\.00<\/td>/);
      expect(rowAmount(html, "total")).toBe(new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(10));
    }
  });

  for (const style of ["western", "pakistani"] as const) {
    for (const lang of ["en", "ur"] as const) {
      it(`${style}/${lang}: actual preview and PDF HTML agree on JPY line and total`, () => {
        const input = payload(sampleInvoice({ currency: "JPY", items: [plainItem], amountInWords: "One thousand yen" }), style, lang);
        const doc = buildInvoiceDocument(input);
        const preview = renderToStaticMarkup(createElement(InvoiceDocumentPreview, input));
        const pdf = buildInvoiceHtml(input);
        expect(preview).toContain(doc.pageHtml);
        expect(pdf).toContain(doc.pageHtml);
        const expected = new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", { style: "currency", currency: "JPY" }).format(1000);
        for (const html of [preview, pdf]) {
          expect(html).toMatch(/data-col="amount"[^>]*>1,000<\/td>/);
          expect(rowAmount(html, "total")).toBe(expected);
          if (style === "western") expect(rowAmount(html, "subtotal")).toBe(expected);
          expect(html).not.toContain("1,000.00");
          expect(html).toContain("One thousand yen");
        }
      });

      it(`${style}/${lang}: JPY discount, tax, advance and balance retain their value`, () => {
        const invoice = sampleInvoice({
          currency: "JPY", items: [{ ...plainItem, discountFixed: 100, discountPercent: 10, taxes: [{ name: "Tax", percent: 10 }] }],
          invoiceDiscountFixed: 50, invoiceDiscountPercent: 5,
          taxes: [{ name: "Tax", percent: 10 }], shipping: 20,
          amountPaid: 100, payments: [{ id: "payment-1", date: "2026-09-11", amount: 200 }],
        });
        const result = calculateInvoice(invoice);
        expect(result.lineTotals).toEqual([800]);
        expect(combinedDiscount(result)).toBe(290);
        expect(result.taxes).toEqual([{ name: "Tax", amount: 151 }]);
        expect(result.shipping).toBe(20);
        expect(result.total).toBe(881);
        expect(result.amountPaid).toBe(300);
        expect(result.balanceDue).toBe(581);
        const input = payload(invoice, style, lang);
        const preview = renderToStaticMarkup(createElement(InvoiceDocumentPreview, input));
        const pdf = buildInvoiceHtml(input);
        const currency = (n: number) => new Intl.NumberFormat(lang === "ur" ? "ur-PK" : "en-US", { style: "currency", currency: "JPY" }).format(n);
        for (const html of [preview, pdf]) {
          expect(html).toMatch(/data-col="amount"[^>]*>800<\/td>/);
          expect(html).toContain("10% + 100");
          expect(rowAmount(html, "discount")).toBe(`−${currency(290)}`);
          expect(rowAmount(html, "tax")).toBe(currency(151));
          expect(rowAmount(html, "total")).toBe(currency(881));
          if (style === "pakistani") {
            expect(rowAmount(html, "advance")).toBe(currency(300));
            expect(rowAmount(html, "balance")).toBe(currency(581));
          }
        }
      });
    }
  }

  it("uses currency precision even when Intl formatting falls back", () => {
    const spy = vi.spyOn(Intl, "NumberFormat").mockImplementation(() => { throw new RangeError("unavailable"); });
    try {
      expect(formatInvoiceMinor(1000, "JPY", "en", true)).toBe("1000 JPY");
      expect(formatInvoiceMinor(1000, "JPY", "en")).toBe("1000");
      expect(formatInvoiceMinor(1000, "USD", "en", true)).toBe("10.00 USD");
      expect(formatInvoiceMinor(1000, "PKR", "en")).toBe("10.00");
    } finally {
      spy.mockRestore();
    }
  });
});
